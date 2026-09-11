import { useEffect, useState } from "react";
import { cloneImportedWorkspace } from "../../domain/export/workspace-export";
import { downloadText } from "../../infrastructure/export/download";
import { LocalDataService } from "../../infrastructure/storage/local-data-service";
import { WorkspaceRepository } from "../../infrastructure/storage/workspace-repository";
import { Button } from "../../shared/ui";
import { WorkspaceArchiveService } from "../../application/archive/workspace-archive-service";
import styles from "./DataSafetyPanel.module.css";

type Summary = Awaited<ReturnType<LocalDataService["summary"]>>;
const formatBytes = (value: number | null) => value === null ? "浏览器未提供" : `${(value / 1024 / 1024).toFixed(1)} MB`;

export function DataSafetyPanel() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [status, setStatus] = useState("研究项目保存在当前浏览器中。");
  const refresh = () => void new LocalDataService().summary().then(setSummary);
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
  return <section className={styles.panel} aria-labelledby="data-title"><p>DATA &amp; STORAGE</p><h2 id="data-title">数据与存储</h2>
    <div className={styles.summary}><strong>本地研究数据</strong><span>探索项目：{summary?.projects ?? "…"}</span><span>已用空间：{formatBytes(summary?.usage ?? null)}</span></div>
    <div className={styles.group}><h3>数据备份</h3><Button type="button" onClick={() => void exportAll()}>导出全部数据</Button><label>导入备份<input type="file" accept="application/json,.json" onChange={(event) => void importBackup(event.target.files?.[0])} /></label></div>
    <div className={styles.group}><h3>清理</h3><Button type="button" onClick={() => void clearCache()}>清理缓存</Button><p>清理缓存不会删除研究项目。</p><label>输入“清除全部数据”确认<input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label><Button type="button" disabled={confirmation !== "清除全部数据"} onClick={() => void clearAll()}>删除所有本地研究项目</Button></div><p role="status">{status}</p>
  </section>;
}
