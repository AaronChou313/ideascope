import { useEffect, useMemo, useRef, useState } from "react";
import { BUILTIN_RESEARCH_PROFILES, getBuiltInResearchProfile } from "../../domain/research-profile/builtin-profiles";
import { researchProfileSchema, type ResearchProfile } from "../../domain/research-profile/research-profile";
import { downloadText } from "../../infrastructure/export/download";
import { ResearchProfileRepository } from "../../infrastructure/storage/research-profile-repository";
import { Button } from "../../shared/ui";
import styles from "./DataSafetyPanel.module.css";

type Draft = { name: string; description: string; domains: string; subfields: string; concepts: string; venues: string };
const emptyDraft: Draft = { name: "", description: "", domains: "", subfields: "", concepts: "", venues: "" };
const split = (value: string) => [...new Set(value.split(/[,，\n]/).map((item) => item.trim()).filter(Boolean))];

function toDraft(profile: ResearchProfile): Draft {
  return {
    name: profile.name, description: profile.description,
    domains: profile.scope.domains.join(", "), subfields: profile.scope.subfields.join(", "),
    concepts: profile.scope.concepts.join(", "),
    venues: profile.venueGroups.flatMap((group) => group.venues.map((venue) => venue.name)).join(", "),
  };
}

function fromDraft(draft: Draft, provenance: ResearchProfile["provenance"], basis: ResearchProfile | null): ResearchProfile {
  const now = new Date().toISOString();
  const venues = split(draft.venues);
  return researchProfileSchema.parse({
    documentType: "ideascope.research-profile", profileVersion: 1,
    id: "base:active", name: draft.name.trim() || "我的研究领域", mode: "base",
    description: draft.description.trim(),
    scope: { domains: split(draft.domains), subfields: split(draft.subfields), concepts: split(draft.concepts) },
    sourcePreferences: basis?.sourcePreferences ?? [],
    venueGroups: venues.length ? [{ id: "manual-venues", name: "重点会议与期刊", venues: venues.map((name) => ({ name, aliases: [] })) }] : [],
    queryVocabulary: basis?.queryVocabulary ?? [],
    arxivCategories: basis?.arxivCategories ?? [],
    languagePreferences: basis?.languagePreferences ?? ["en"], provenance, updatedAt: now,
  });
}

export function ResearchProfilePanel() {
  const repository = useMemo(() => new ResearchProfileRepository(), []);
  const input = useRef<HTMLInputElement>(null);
  const [active, setActive] = useState<ResearchProfile | null>(null);
  const [basis, setBasis] = useState<ResearchProfile | null>(null);
  const [mode, setMode] = useState("auto");
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [provenance, setProvenance] = useState<ResearchProfile["provenance"]>("manual");
  const [status, setStatus] = useState("");

  useEffect(() => {
    void repository.getActiveBase().then((profile) => {
      if (!profile) return;
      setActive(profile); setBasis(profile); setMode("custom"); setDraft(toDraft(profile)); setProvenance(profile.provenance);
    });
  }, [repository]);

  function selectTemplate(profileId: string) {
    setMode(profileId);
    if (profileId === "auto") {
      setDraft(emptyDraft); setActive(null); setBasis(null); setProvenance("manual");
      void repository.clearActiveBase();
      setStatus("已切换为自动适配。Session Profile 会继续按探索自动形成。");
      return;
    }
    const template = getBuiltInResearchProfile(profileId);
    if (!template) return;
    setDraft(toDraft(template)); setBasis(template); setProvenance("builtin");
    setStatus("模板已载入为候选；点击保存后才会成为长期偏好。");
  }

  async function suggestFromSession() {
    const sessions = await repository.listSessions();
    const latest = sessions.at(-1);
    if (!latest) {
      setStatus("还没有可用于整理的探索领域。先完成一次研究探索。");
      return;
    }
    const candidate = { ...latest, mode: "base" as const, name: "我的研究领域" };
    setDraft(toDraft(candidate)); setBasis(candidate); setMode("custom");
    setProvenance("ai_suggested");
    setStatus("已根据最近一次 AI 形成的 Session Profile 生成候选；请检查后保存。");
  }

  async function save() {
    try {
      const saved = await repository.saveActiveBase(fromDraft(draft, provenance, basis));
      setActive(saved); setBasis(saved); setMode("custom"); setStatus("研究领域已保存。后续探索会与 Session Profile 合并使用。");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "保存失败。");
    }
  }

  async function importProfile(file: File) {
    try {
      const parsed = researchProfileSchema.parse(JSON.parse(await file.text()));
      setDraft(toDraft(parsed)); setBasis(parsed); setMode("custom"); setProvenance("imported");
      setStatus("Profile 已校验并载入为候选；点击保存后生效。");
    } catch {
      setStatus("Profile 文件无效，未修改当前配置。");
    } finally {
      if (input.current) input.current.value = "";
    }
  }

  function exportProfile() {
    if (!active) return;
    downloadText("ideascope-research-profile.ideascope-profile.json", "application/json", JSON.stringify(active, null, 2));
    setStatus("已导出当前 Research Profile；文件不包含凭证。");
  }

  return (
    <section className={styles.panel} aria-labelledby="research-profile-title">
      <p>RESEARCH PROFILE</p>
      <h2 id="research-profile-title">我的研究领域</h2>
      <p>{active ? `${active.scope.domains.join(" · ") || "通用研究"} · 已保存` : "自动适配 · AI 会根据每次探索建立临时研究领域配置。"}</p>
      <label>领域模式
        <select value={mode} onChange={(event) => selectTemplate(event.target.value)}>
          <option value="auto">Auto（推荐）</option>
          {BUILTIN_RESEARCH_PROFILES.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
          <option value="custom">当前自定义配置</option>
        </select>
      </label>
      <div className={styles.profileGrid}>
        <label>名称<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
        <label>说明<input value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
        <label>研究领域<input value={draft.domains} onChange={(event) => setDraft({ ...draft, domains: event.target.value })} placeholder="Robotics, Geomatics" /></label>
        <label>子领域<input value={draft.subfields} onChange={(event) => setDraft({ ...draft, subfields: event.target.value })} /></label>
        <label>关键概念<input value={draft.concepts} onChange={(event) => setDraft({ ...draft, concepts: event.target.value })} /></label>
        <label>重点会议与期刊<input value={draft.venues} onChange={(event) => setDraft({ ...draft, venues: event.target.value })} placeholder="ICRA, IROS, RA-L" /></label>
      </div>
      <div className={styles.sourceActions}>
        <Button type="button" onClick={() => void suggestFromSession()}>让 AI 帮我整理</Button>
        <Button type="button" variant="primary" onClick={() => void save()}>保存研究领域</Button>
        <Button type="button" disabled={!active} onClick={exportProfile}>导出 Profile</Button>
        <Button type="button" onClick={() => input.current?.click()}>导入 Profile</Button>
        <input ref={input} hidden type="file" accept=".json,.ideascope-profile.json,application/json" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importProfile(file); }} />
      </div>
      <p role="status" className={styles.status}>{status}</p>
    </section>
  );
}
