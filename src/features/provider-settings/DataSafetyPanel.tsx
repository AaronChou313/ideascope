import { useEffect, useState } from "react";
import { cloneImportedWorkspace } from "../../domain/export/workspace-export";
import { downloadBytes, downloadText } from "../../infrastructure/export/download";
import { LocalDataService } from "../../infrastructure/storage/local-data-service";
import { WorkspaceRepository } from "../../infrastructure/storage/workspace-repository";
import { Button } from "../../shared/ui";
import { WorkspaceArchiveService } from "../../application/archive/workspace-archive-service";
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
  const [selected, setSelected] = useState<string[]>([]);
  const [includeResources, setIncludeResources] = useState(true);
  const [bundlePreview, setBundlePreview] = useState<WorkspaceBundlePreviewItem[]>([]);
  const [bundleBytes, setBundleBytes] = useState<Uint8Array | null>(null);
  const [bundlePaths, setBundlePaths] = useState<string[]>([]);
  const refresh = () => void Promise.all([new LocalDataService().summary(), new WorkspaceRepository().list()]).then(([nextSummary, nextWorkspaces]) => { setSummary(nextSummary); setWorkspaces(nextWorkspaces); });
  useEffect(refresh, []);
  async function exportAll() {
    const repository = new WorkspaceRepository();
    const workspaces = (await Promise.all((await repository.list()).map(({ id }) => repository.get(id)))).filter(Boolean);
    downloadText("ideascope-backup.json", "application/json", JSON.stringify({ documentType: "ideascope.backup", formatVersion: 1, createdWith: "0.6.3", exportedAt: new Date().toISOString(), workspaces }, null, 2));
    setStatus(`已导出 ${workspaces.length} 个探索项目。`);
  }
  async function importBackup(file?: File) {
    if (!file) return;
    try {
      const repository = new WorkspaceRepository();
      const raw = JSON.parse(await file.text()) as { documentType?: string; workspaces?: unknown[] };
      if (raw.documentType === "ideascope.workspace-archive") {
        await new WorkspaceArchiveService().import(raw);
        setStatus("完整探索档案已导入为新项目；原项目未被覆盖。"); refresh(); return;
      }
      const values = raw.documentType === "ideascope.backup" && Array.isArray(raw.workspaces) ? raw.workspaces : [raw];
      const existing = new Set((await repository.list()).map(({ id }) => id));
      for (const value of values) {
        const imported = cloneImportedWorkspace(value, existing, () => crypto.randomUUID()); existing.add(imported.workspace.id);
        const result = await repository.save(imported); if (result.status !== "saved") throw new Error(result.message);
      }
      setStatus(`已导入 ${values.length} 个项目；原项目未被覆盖。`); refresh();
    } catch (error) { setStatus(error instanceof Error ? `导入失败：${error.message}` : "导入失败。"); }
  }
  async function clearCache() { await new LocalDataService().clearCache(); setStatus("缓存已清理，研究项目未删除。"); refresh(); }
  async function clearAll() { try { await new LocalDataService().clearAll(confirmation); setConfirmation(""); setStatus("已删除全部本地研究项目和当前内存密钥。"); refresh(); } catch (error) { setStatus(error instanceof Error ? error.message : "删除失败。"); } }
  async function exportBundle(ids: string[]) {
    try {
      const bundle = await new WorkspaceBundleService().create(ids, includeResources);
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
    <div className={styles.group}><h3>数据备份</h3><Button type="button" onClick={() => void exportAll()}>导出全部数据</Button><label>导入备份<input type="file" accept="application/json,.json,.ideascope-archive.json" onChange={(event) => void importBackup(event.target.files?.[0])} /></label></div>
    <div className={styles.group}><h3>批量导出探索</h3>{workspaces.map((workspace) => <label className={styles.checkRow} key={workspace.id}><input type="checkbox" checked={selected.includes(workspace.id)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, workspace.id] : current.filter((id) => id !== workspace.id))} />{workspace.title}</label>)}<label className={styles.checkRow}><input type="checkbox" checked={includeResources} onChange={(event) => setIncludeResources(event.target.checked)} />附带非秘密 Source / Profile 资源</label><div className={styles.sourceActions}><Button type="button" onClick={() => setSelected(workspaces.map((workspace) => workspace.id))}>全选</Button><Button type="button" disabled={!selected.length} onClick={() => void exportBundle(selected)}>导出所选</Button><Button type="button" disabled={!workspaces.length} onClick={() => void exportBundle(workspaces.map((workspace) => workspace.id))}>导出全部探索</Button></div><label>导入档案 / Bundle<input type="file" accept=".zip,.ideascope.zip,application/zip" onChange={(event) => void previewBundle(event.target.files?.[0])} /></label>{bundlePreview.map((item) => <label className={styles.checkRow} key={item.path}><input type="checkbox" checked={bundlePaths.includes(item.path)} onChange={(event) => setBundlePaths((current) => event.target.checked ? [...current, item.path] : current.filter((path) => path !== item.path))} />{item.title} · {item.branches} 分支 · {item.nodes} 节点 · {item.evidence} Evidence · {item.duplicate === "none" ? "本地无同 ID" : item.duplicate === "same-id-same-content" ? "同 ID/同内容" : "同 ID/内容不同，将导入副本"}</label>)}{bundleBytes ? <Button type="button" disabled={!bundlePaths.length} onClick={() => void importBundle()}>确认导入已验证条目</Button> : null}</div>
    <div className={styles.group}><h3>清理</h3><Button type="button" onClick={() => void clearCache()}>清理缓存</Button><p>清理缓存不会删除研究项目。</p><label>输入“清除全部数据”确认<input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label><Button type="button" disabled={confirmation !== "清除全部数据"} onClick={() => void clearAll()}>删除所有本地研究项目</Button></div><p role="status">{status}</p>
  </section>;
}
