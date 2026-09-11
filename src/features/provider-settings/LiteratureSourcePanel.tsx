import { useEffect, useMemo, useRef, useState } from "react";
import type { SourceInstallation } from "../../domain/literature-source/literature-source";
import { BUILTIN_LITERATURE_SOURCE_MANIFESTS, buildExternalSourceSearchUrl } from "../../infrastructure/literature/builtin-source-registry";
import { probeLiteratureSource, type SourceHealth } from "../../infrastructure/literature/source-health";
import { normalizeConnectionError } from "../../infrastructure/network/errors";
import { sourceCredentialStore } from "../../infrastructure/secrets/source-credential-store";
import { SourceInstallationRepository } from "../../infrastructure/storage/source-installation-repository";
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
  const [health, setHealth] = useState<Record<string, HealthState>>({});
  const [details, setDetails] = useState<Record<string, string>>({});
  const [ieeeKey, setIeeeKey] = useState(() => sourceCredentialStore.get("ieee-xplore.api-key") ?? "");
  const active = useRef<AbortController | null>(null);

  useEffect(() => {
    void repository.list().then(setInstallations);
    return () => active.current?.abort();
  }, [repository]);

  const installationFor = (sourceId: string) => installations.find((item) => item.sourceId === sourceId);

  async function toggle(sourceId: string, enabled: boolean) {
    setInstallations((current) => current.map((item) =>
      item.sourceId === sourceId ? { ...item, enabled } : item,
    ));
    const saved = await repository.setEnabled(sourceId, enabled);
    setInstallations((current) => [...current.filter((item) => item.sourceId !== sourceId), saved]);
    const name = BUILTIN_LITERATURE_SOURCE_MANIFESTS.find((item) => item.id === sourceId)?.name ?? sourceId;
    setDetails((current) => ({ ...current, [sourceId]: `${name} 已${enabled ? "启用" : "停用"}。` }));
  }

  async function testOne(sourceId: string, controller = new AbortController()) {
    const manifest = BUILTIN_LITERATURE_SOURCE_MANIFESTS.find((item) => item.id === sourceId);
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
    const enabled = BUILTIN_LITERATURE_SOURCE_MANIFESTS.filter((manifest) => installationFor(manifest.id)?.enabled);
    await Promise.all(enabled.map((manifest) => testOne(manifest.id, active.current!)));
  }

  function saveIeeeKey() {
    sourceCredentialStore.set("ieee-xplore.api-key", ieeeKey);
    setDetails((current) => ({
      ...current,
      "ieee-xplore": ieeeKey.trim() ? "Key 已保存在当前浏览器会话。" : "Key 已清除。",
    }));
  }

  return (
    <section className={styles.panel} aria-labelledby="literature-source-title">
      <p>LITERATURE SOURCES</p>
      <h2 id="literature-source-title">文献来源</h2>
      <p>默认自动选择可用来源。测试只检查访问能力，不会创建研究任务或写入探索历史。</p>
      <div className={styles.sourceList}>
        {BUILTIN_LITERATURE_SOURCE_MANIFESTS.map((manifest) => {
          const enabled = installationFor(manifest.id)?.enabled ?? false;
          const externalUrl = buildExternalSourceSearchUrl(manifest.id, "robotics localization");
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
              <div className={styles.sourceActions}>
                {manifest.adapter.kind === "external-search" ? (
                  <a href={externalUrl ?? undefined} target="_blank" rel="noreferrer">打开外部搜索</a>
                ) : (
                  <Button type="button" disabled={!enabled} onClick={() => void testOne(manifest.id)}>测试</Button>
                )}
                {details[manifest.id] ? <span role="status">{details[manifest.id]}</span> : null}
              </div>
            </div>
          );
        })}
      </div>
      <div className={styles.sourceActions}>
        <Button type="button" onClick={() => void testAll()}>测试已启用来源</Button>
        <Button type="button" disabled title="将在 Source Assistant 阶段启用">让 AI 帮我配置来源</Button>
        <Button type="button" disabled title="将在来源导入阶段启用">导入 Source / Pack</Button>
      </div>
      <details className={styles.advanced}>
        <summary>高级设置</summary>
        <p>来源能力和认证方式由经过校验的 Manifest 管理。密钥与 Manifest 分离，不进入项目导出。</p>
      </details>
    </section>
  );
}
