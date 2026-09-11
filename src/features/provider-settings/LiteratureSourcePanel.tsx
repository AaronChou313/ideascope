import { useEffect, useMemo, useRef, useState } from "react";
import type { LiteratureSourceManifest, SourceInstallation } from "../../domain/literature-source/literature-source";
import { BUILTIN_LITERATURE_SOURCE_MANIFESTS, buildExternalSourceSearchUrl } from "../../infrastructure/literature/builtin-source-registry";
import { probeLiteratureSource, type SourceHealth } from "../../infrastructure/literature/source-health";
import { normalizeConnectionError } from "../../infrastructure/network/errors";
import { sourceCredentialStore } from "../../infrastructure/secrets/source-credential-store";
import { SourceInstallationRepository } from "../../infrastructure/storage/source-installation-repository";
import { ProviderProfileRepository } from "../../infrastructure/storage/provider-profile-repository";
import { memoryKeyStore } from "../../infrastructure/secrets/memory-key-store";
import { createAgentProvider } from "../../infrastructure/llm/agent-provider";
import { proposeSourceConfiguration } from "../../application/literature/propose-source-configuration";
import type { SourceAssistantProposal } from "../../domain/literature-source/source-assistant-proposal";
import { parseConfigurationImport, type ConfigurationImport } from "../../application/import/parse-configuration-import";
import { ResearchProfileRepository } from "../../infrastructure/storage/research-profile-repository";
import { SourceManifestRepository } from "../../infrastructure/storage/source-manifest-repository";
import { Button } from "../../shared/ui";
import styles from "./DataSafetyPanel.module.css";

type HealthState = SourceHealth | "unknown" | "checking" | "failed";
const healthLabels: Record<HealthState, string> = {
  available: "可用", unconfigured: "未配置", external: "外部入口",
  unknown: "待验证", checking: "正在检查…", failed: "测试失败",
};

export function LiteratureSourcePanel() {
  const repository = useMemo(() => new SourceInstallationRepository(), []);
  const [installations, setInstallations] = useState<SourceInstallation[]>([]);
  const [manifests, setManifests] = useState<LiteratureSourceManifest[]>([...BUILTIN_LITERATURE_SOURCE_MANIFESTS]);
  const [health, setHealth] = useState<Record<string, HealthState>>({});
  const [details, setDetails] = useState<Record<string, string>>({});
  const [ieeeKey, setIeeeKey] = useState(() => sourceCredentialStore.get("ieee-xplore.api-key") ?? "");
  const [customCredentials, setCustomCredentials] = useState<Record<string, string>>({});
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantInput, setAssistantInput] = useState("");
  const [proposal, setProposal] = useState<SourceAssistantProposal | null>(null);
  const [assistantStatus, setAssistantStatus] = useState("");
  const [assistantBusy, setAssistantBusy] = useState(false);
  const active = useRef<AbortController | null>(null);
  const importFile = useRef<HTMLInputElement>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importPreview, setImportPreview] = useState<ConfigurationImport | null>(null);
  const [importStatus, setImportStatus] = useState("");

  useEffect(() => {
    void Promise.all([repository.list(), new SourceManifestRepository().list()]).then(([nextInstallations, nextManifests]) => {
      setInstallations(nextInstallations); setManifests(nextManifests);
    });
    return () => active.current?.abort();
  }, [repository]);

  const installationFor = (sourceId: string) => installations.find((item) => item.sourceId === sourceId);

  async function toggle(sourceId: string, enabled: boolean) {
    setInstallations((current) => current.map((item) =>
      item.sourceId === sourceId ? { ...item, enabled } : item,
    ));
    const saved = await repository.setEnabled(sourceId, enabled);
    setInstallations((current) => [...current.filter((item) => item.sourceId !== sourceId), saved]);
    const name = manifests.find((item) => item.id === sourceId)?.name ?? sourceId;
    setDetails((current) => ({ ...current, [sourceId]: `${name} 已${enabled ? "启用" : "停用"}。` }));
  }

  async function testOne(sourceId: string, controller = new AbortController()) {
    const manifest = manifests.find((item) => item.id === sourceId);
    if (!manifest) return;
    setHealth((current) => ({ ...current, [sourceId]: "checking" }));
    setDetails((current) => ({ ...current, [sourceId]: "" }));
    try {
      const result = await probeLiteratureSource(manifest, controller.signal, {
        getCredential: (slot) => sourceCredentialStore.get(slot),
      });
      setHealth((current) => ({ ...current, [sourceId]: result }));
    } catch (error) {
      setHealth((current) => ({ ...current, [sourceId]: "failed" }));
      setDetails((current) => ({
        ...current,
        [sourceId]: normalizeConnectionError(error).message.replace("Provider", "文献来源"),
      }));
    }
  }

  async function testAll() {
    active.current?.abort();
    active.current = new AbortController();
    const enabled = manifests.filter((manifest) => installationFor(manifest.id)?.enabled);
    await Promise.all(enabled.map((manifest) => testOne(manifest.id, active.current!)));
  }

  function saveIeeeKey() {
    sourceCredentialStore.set("ieee-xplore.api-key", ieeeKey);
    setDetails((current) => ({
      ...current,
      "ieee-xplore": ieeeKey.trim() ? "Key 已保存在当前浏览器会话。" : "Key 已清除。",
    }));
  }

  function saveCustomCredential(manifest: LiteratureSourceManifest) {
    const slot = manifest.auth.credentialSlot;
    if (!slot) return;
    const value = customCredentials[manifest.id] ?? "";
    sourceCredentialStore.set(slot, value);
    setDetails((current) => ({ ...current, [manifest.id]: value.trim() ? "凭证已保存在当前浏览器会话。" : "凭证已清除。" }));
  }

  async function askAssistant() {
    setAssistantBusy(true);
    setAssistantStatus("正在分析已有来源…");
    try {
      const profile = await new ProviderProfileRepository().getActive();
      const key = memoryKeyStore.get();
      if (!profile || !key) throw new Error("请先在模型 Provider 页面保存可用配置和 API Key。");
      const next = await proposeSourceConfiguration({
        requirement: assistantInput,
        manifests: BUILTIN_LITERATURE_SOURCE_MANIFESTS,
        provider: createAgentProvider(profile, () => memoryKeyStore.get(), profile.lastTestState === "supported"),
        signal: new AbortController().signal,
      });
      setProposal(next);
      setAssistantStatus("建议已通过结构校验。请先测试，再确认应用。");
    } catch (error) {
      setProposal(null);
      setAssistantStatus(error instanceof Error ? error.message : "无法生成来源建议。");
    } finally { setAssistantBusy(false); }
  }

  async function testProposal() {
    if (!proposal) return;
    setAssistantBusy(true);
    const sourceIds = [...new Set(proposal.recommendations.map((item) => item.sourceId).filter((id): id is string => Boolean(id)))];
    await Promise.all(sourceIds.map((sourceId) => testOne(sourceId)));
    setAssistantStatus("建议来源测试完成。只有确认可用的自动来源会被应用。");
    setAssistantBusy(false);
  }

  async function applyProposal() {
    if (!proposal) return;
    const applicable = proposal.recommendations.filter((item) =>
      item.sourceId && item.action !== "external_search_only" && health[item.sourceId] === "available",
    );
    if (!applicable.length) {
      setAssistantStatus("尚无通过连接测试的建议来源；配置所需凭证后请重新测试。");
      return;
    }
    await Promise.all(applicable.map((item) => repository.setEnabled(item.sourceId!, true)));
    setInstallations(await repository.list());
    setAssistantStatus(`已确认应用 ${applicable.length} 个来源。`);
  }

  function previewImport(text: string) {
    try {
      const parsed = parseConfigurationImport(text);
      setImportPreview(parsed);
      setImportStatus("配置已通过结构校验。请核对预览后确认导入。");
    } catch (error) {
      setImportPreview(null);
      setImportStatus(error instanceof Error ? error.message : "配置文件无效。");
    }
  }

  async function readImportFile(file: File) {
    if (file.size > 2_000_000) { setImportStatus("配置文件超过 2 MB 安全上限。"); return; }
    const text = await file.text();
    setImportText(text);
    previewImport(text);
    if (importFile.current) importFile.current.value = "";
  }

  async function confirmImport() {
    if (!importPreview) return;
    let enabled = 0;
    let deferred = 0;
    const manifestRepository = new SourceManifestRepository();
    for (const source of importPreview.sources) {
      const builtin = BUILTIN_LITERATURE_SOURCE_MANIFESTS.find((item) => item.id === source.id);
      if (builtin) {
        if (JSON.stringify(builtin) !== JSON.stringify(source)) { deferred += 1; continue; }
        await repository.setEnabled(source.id, true); enabled += 1;
      } else {
        try { await manifestRepository.install(source); deferred += 1; }
        catch { deferred += 1; }
      }
    }
    const profileRepository = new ResearchProfileRepository();
    for (const profile of importPreview.profiles)
      await profileRepository.save({
        ...profile,
        id: `imported:${profile.id}:${crypto.randomUUID()}`,
        mode: "base",
        provenance: "imported",
        updatedAt: new Date().toISOString(),
      });
    setInstallations(await repository.list());
    setManifests(await manifestRepository.list());
    setImportStatus(`已导入 ${importPreview.profiles.length} 个 Profile 副本，启用 ${enabled} 个一致的内置来源。${deferred ? `${deferred} 个自定义来源已保存但默认停用，或存在冲突；请测试后手动启用。` : ""}`);
    setImportPreview(null);
  }

  return (
    <section className={styles.panel} aria-labelledby="literature-source-title">
      <p>LITERATURE SOURCES</p>
      <h2 id="literature-source-title">文献来源</h2>
      <p>默认自动选择可用来源。测试只检查访问能力，不会创建研究任务或写入探索历史。</p>
      <div className={styles.sourceList}>
        {manifests.map((manifest) => {
          const enabled = installationFor(manifest.id)?.enabled ?? false;
          const externalUrl = manifest.adapter.kind === "external-search"
            ? manifest.adapter.urlTemplate.replace("{query}", encodeURIComponent("robotics localization"))
            : buildExternalSourceSearchUrl(manifest.id, "robotics localization");
          const sourceHealth = health[manifest.id] ?? (manifest.adapter.kind === "external-search" ? "external" : "unknown");
          return (
            <div className={styles.sourceRow} key={manifest.id}>
              <div className={styles.sourceHeading}>
                <div><strong>{manifest.name}</strong><span>{manifest.description}</span></div>
                <label className={styles.toggle}>
                  <input aria-label={`${manifest.name} 启用`} type="checkbox" checked={enabled} onChange={(event) => void toggle(manifest.id, event.target.checked)} />
                  启用
                </label>
              </div>
              <div className={styles.sourceMeta}>
                <span>状态：{healthLabels[sourceHealth]}</span>
                <span>检索：{manifest.capabilities.search === "supported" ? "支持" : "仅外部"}</span>
                <span>摘要：{manifest.capabilities.abstract === "supported" ? "支持" : "不保证"}</span>
              </div>
              {manifest.id === "ieee-xplore" ? (
                <div className={styles.inlineFields}>
                  <input type="password" value={ieeeKey} onChange={(event) => setIeeeKey(event.target.value)} placeholder="IEEE Xplore API Key" aria-label="IEEE Xplore API Key" />
                  <Button type="button" onClick={saveIeeeKey}>保存 Key</Button>
                </div>
              ) : null}
              {manifest.id !== "ieee-xplore" && manifest.auth.kind !== "none" ? (
                <div className={styles.inlineFields}>
                  <input type="password" value={customCredentials[manifest.id] ?? ""} onChange={(event) => setCustomCredentials((current) => ({ ...current, [manifest.id]: event.target.value }))} placeholder={`${manifest.name} API Key`} aria-label={`${manifest.name} API Key`} />
                  <Button type="button" onClick={() => saveCustomCredential(manifest)}>保存凭证</Button>
                </div>
              ) : null}
              <div className={styles.sourceActions}>
                {manifest.adapter.kind === "external-search" ? (
                  <a href={externalUrl ?? undefined} target="_blank" rel="noreferrer">打开外部搜索</a>
                ) : (
                  <Button type="button" disabled={!enabled && manifest.adapter.kind === "builtin"} onClick={() => void testOne(manifest.id)}>测试</Button>
                )}
                {details[manifest.id] ? <span role="status">{details[manifest.id]}</span> : null}
              </div>
            </div>
          );
        })}
      </div>
      <div className={styles.sourceActions}>
        <Button type="button" onClick={() => void testAll()}>测试已启用来源</Button>
        <Button type="button" onClick={() => setAssistantOpen((value) => !value)}>让 AI 帮我配置来源</Button>
        <Button type="button" onClick={() => setImportOpen((value) => !value)}>导入 Source / Pack</Button>
      </div>
      {assistantOpen ? (
        <section className={styles.sourceRow} aria-label="AI 来源配置助手">
          <h3>让 AI 帮我配置来源</h3>
          <p>描述研究领域、常用会议或期刊。AI 只会先匹配当前内置来源，不会凭记忆创建 API 地址。</p>
          <textarea value={assistantInput} onChange={(event) => setAssistantInput(event.target.value)} placeholder="例如：我主要做机器人定位导航，希望覆盖 ICRA、IROS、RA-L、T-RO。" />
          <div className={styles.sourceActions}>
            <Button type="button" disabled={assistantBusy || !assistantInput.trim()} onClick={() => void askAssistant()}>生成建议</Button>
            {proposal ? <Button type="button" disabled={assistantBusy} onClick={() => void testProposal()}>测试建议来源</Button> : null}
            {proposal ? <Button type="button" disabled={assistantBusy} onClick={() => void applyProposal()}>确认应用</Button> : null}
          </div>
          {proposal ? (
            <div className={styles.sourceList}>
              {proposal.recommendations.map((item, index) => {
                const manifest = BUILTIN_LITERATURE_SOURCE_MANIFESTS.find((entry) => entry.id === item.sourceId);
                return <article key={`${item.sourceId}-${index}`}><strong>{manifest?.name ?? item.sourceId}</strong><p>{item.reason}</p><small>{item.missingInputs.length ? `需要：${item.missingInputs.join("、")}` : "无需额外信息"} · 状态：{healthLabels[health[item.sourceId ?? ""] ?? "unknown"]}</small></article>;
              })}
              {proposal.warnings.map((warning) => <small key={warning}>注意：{warning}</small>)}
            </div>
          ) : null}
          {assistantStatus ? <p role="status">{assistantStatus}</p> : null}
        </section>
      ) : null}
      {importOpen ? (
        <section className={styles.sourceRow} aria-label="导入来源或研究领域配置">
          <h3>导入配置</h3>
          <p>粘贴 JSON，或选择 `.ideascope-source.json`、`.ideascope-profile.json`、`.ideascope-pack.json`。外部文件一律先校验和预览。</p>
          <textarea aria-label="配置 JSON" value={importText} onChange={(event) => setImportText(event.target.value)} placeholder="粘贴 IdeaScope 配置 JSON" />
          <div className={styles.sourceActions}>
            <Button type="button" disabled={!importText.trim()} onClick={() => previewImport(importText)}>校验并预览</Button>
            <Button type="button" onClick={() => importFile.current?.click()}>选择文件</Button>
            {importPreview ? <Button type="button" onClick={() => void confirmImport()}>确认导入</Button> : null}
            <input ref={importFile} hidden type="file" accept=".json,.ideascope-source.json,.ideascope-profile.json,.ideascope-pack.json,application/json" onChange={(event) => { const file = event.target.files?.[0]; if (file) void readImportFile(file); }} />
          </div>
          {importPreview ? <div><strong>{importPreview.name}</strong><p>{importPreview.sources.length} 个来源 · {importPreview.profiles.length} 个研究领域配置</p>{importPreview.sources.map((source) => <small key={source.id}>{source.name} · {source.adapter.kind} · 默认不携带凭证</small>)}</div> : null}
          {importStatus ? <p role="status">{importStatus}</p> : null}
        </section>
      ) : null}
      <details className={styles.advanced}>
        <summary>高级设置</summary>
        <p>来源能力和认证方式由经过校验的 Manifest 管理。密钥与 Manifest 分离，不进入项目导出。</p>
      </details>
    </section>
  );
}
