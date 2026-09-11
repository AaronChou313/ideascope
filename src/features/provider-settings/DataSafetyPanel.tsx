import { useEffect, useState } from "react";
import { downloadBytes } from "../../infrastructure/export/download";
import { LocalDataService } from "../../infrastructure/storage/local-data-service";
import { WorkspaceRepository } from "../../infrastructure/storage/workspace-repository";
import { Button } from "../../shared/ui";
import { WorkspaceBundleService } from "../../application/archive/workspace-bundle-service";
import type { WorkspaceRecord } from "../../infrastructure/storage/ideascope-database";
import type { WorkspaceBundlePreviewItem } from "../../domain/archive/workspace-bundle";
import styles from "./DataSafetyPanel.module.css";

type Summary = Awaited<ReturnType<LocalDataService["summary"]>>;
const formatBytes = (value: number | null) => value === null ? "浏览器未提供" : `${(value / 1024 / 1024).toFixed(1)} MB`;

export function DataSafetyPanel() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [status, setStatus] = useState("研究项目保存在当前浏览器中。");
  const [workspaces, setWorkspaces] = useState<WorkspaceRecord[]>([]);
  const [bundlePreview, setBundlePreview] = useState<WorkspaceBundlePreviewItem[]>([]);
  const [bundleBytes, setBundleBytes] = useState<Uint8Array | null>(null);
  const [bundlePaths, setBundlePaths] = useState<string[]>([]);
  const refresh = () => void Promise.all([new LocalDataService().summary(), new WorkspaceRepository().list()]).then(([nextSummary, nextWorkspaces]) => { setSummary(nextSummary); setWorkspaces(nextWorkspaces); });
  useEffect(refresh, []);
  async function clearCache() { await new LocalDataService().clearCache(); setStatus("缓存已清理，研究项目未删除。"); refresh(); }
  async function clearAll() { try { await new LocalDataService().clearAll(confirmation); setConfirmation(""); setStatus("已删除全部本地研究项目和当前内存密钥。"); refresh(); } catch (error) { setStatus(error instanceof Error ? error.message : "删除失败。"); } }
  async function exportBundle(ids: string[]) {
    try {
      const bundle = await new WorkspaceBundleService().create(ids, true);
      const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
      downloadBytes(`ideascope-export-${stamp}.ideascope.zip`, "application/zip", bundle.bytes);
      setStatus(`已导出 ${ids.length} 个探索的完整 Bundle。`);
    } catch (error) { setStatus(error instanceof Error ? error.message : "Bundle 导出失败。"); }
  }
  async function previewBundle(file?: File) {
    if (!file) return;
    try {
      const preview = await new WorkspaceBundleService().preview(new Uint8Array(await file.arrayBuffer()));
      setBundlePreview(preview.items);
      setBundleBytes(new Uint8Array(await file.arrayBuffer()));
      setBundlePaths(preview.items.filter((item) => item.duplicate !== "same-id-same-content").map((item) => item.path));
      setStatus("Bundle 完整性与内容校验通过。请选择条目后确认导入。");
    } catch (error) { setBundlePreview([]); setBundleBytes(null); setBundlePaths([]); setStatus(error instanceof Error ? `Bundle 无效：${error.message}` : "Bundle 无效。"); }
  }
  async function importBundle() {
    if (!bundleBytes) return;
    try { const imported = await new WorkspaceBundleService().importSelected(bundleBytes, bundlePaths); setStatus(`已在单次事务中导入 ${imported.length} 个探索。`); setBundleBytes(null); setBundlePaths([]); setBundlePreview([]); refresh(); }
    catch (error) { setStatus(error instanceof Error ? `Bundle 导入失败：${error.message}；未保留本批次的部分数据。` : "Bundle 导入失败。"); }
  }
  return <section className={styles.panel} aria-labelledby="data-title"><p>DATA &amp; STORAGE</p><h2 id="data-title">数据与存储</h2>
    <div className={styles.summary}><strong>本地研究数据</strong><span>探索项目：{summary?.projects ?? "…"}</span><span>已用空间：{formatBytes(summary?.usage ?? null)}</span></div>
    <div className={styles.group}><h3>整体备份与恢复</h3><p>导出包含全部研究会话、图谱、Evidence，以及不含密钥的来源与研究领域配置。工作台左侧的导入、导出只处理单个会话。</p><div className={styles.sourceActions}><Button type="button" variant="primary" disabled={!workspaces.length} onClick={() => void exportBundle(workspaces.map((workspace) => workspace.id))}>导出完整备份</Button><label className={styles.fileAction}><span className={styles.fileButton}>导入完整备份</span><input aria-label="导入完整备份" type="file" accept=".zip,.ideascope.zip,application/zip" onChange={(event) => void previewBundle(event.target.files?.[0])} /></label></div>{bundlePreview.map((item) => <label className={styles.checkRow} key={item.path}><input type="checkbox" checked={bundlePaths.includes(item.path)} onChange={(event) => setBundlePaths((current) => event.target.checked ? [...current, item.path] : current.filter((path) => path !== item.path))} />{item.title} · {item.branches} 分支 · {item.nodes} 节点 · {item.evidence} Evidence · {item.duplicate === "none" ? "本地无同 ID" : item.duplicate === "same-id-same-content" ? "同 ID/同内容" : "同 ID/内容不同，将导入副本"}</label>)}{bundleBytes ? <Button type="button" disabled={!bundlePaths.length} onClick={() => void importBundle()}>确认导入已验证会话</Button> : null}</div>
    <div className={styles.group}><h3>清理</h3><Button type="button" onClick={() => void clearCache()}>清理缓存</Button><p>清理缓存不会删除研究项目。</p><label>输入“清除全部数据”确认<input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label><Button type="button" disabled={confirmation !== "清除全部数据"} onClick={() => void clearAll()}>删除所有本地研究项目</Button></div><p role="status">{status}</p>
  </section>;
}
