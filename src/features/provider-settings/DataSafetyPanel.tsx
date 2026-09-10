import { useState } from "react";
import { DiagnosticExporter } from "../../infrastructure/export/diagnostic-export";
import { downloadText } from "../../infrastructure/export/download";
import { LocalDataService } from "../../infrastructure/storage/local-data-service";
import { WorkspaceRepository } from "../../infrastructure/storage/workspace-repository";
import { cloneImportedWorkspace } from "../../domain/export/workspace-export";
import styles from "./DataSafetyPanel.module.css";

export function DataSafetyPanel() {
  const [confirmation, setConfirmation] = useState("");
  const [status, setStatus] = useState("本地数据尚未更改。");
  async function diagnostics() {
    const value = await new DiagnosticExporter().collect();
    downloadText("ideascope-diagnostics.json", "application/json", JSON.stringify(value, null, 2));
  }
  async function clearAll() {
    try {
      await new LocalDataService().clearAll(confirmation);
      setConfirmation("");
      setStatus("已清除全部 IdeaScope 本地数据和当前内存密钥；此操作不可撤销。");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "清除失败。");
    }
  }
  async function importWorkspace(file: File | undefined) {
    if (!file) return;
    try {
      const repository = new WorkspaceRepository();
      const existing = new Set((await repository.list()).map(({ id }) => id));
      const raw = JSON.parse(await file.text()) as unknown;
      const imported = cloneImportedWorkspace(raw, existing, () => crypto.randomUUID());
      const result = await repository.save(imported);
      setStatus(result.status === "saved" ? `已导入为新项目：${imported.workspace.title}` : result.message);
    } catch (error) {
      setStatus(error instanceof Error ? `导入失败：${error.message}` : "导入失败。");
    }
  }
  return <section className={styles.panel} aria-labelledby="data-safety-title">
    <p>LOCAL DATA / SECURITY</p>
    <h2 id="data-safety-title">本地数据与诊断</h2>
    <p>纯前端应用无法安全保管长期密钥。Provider 凭证只在当前页面内存中；研究内容保存在浏览器 IndexedDB。</p>
    <button type="button" onClick={() => void diagnostics()}>导出脱敏诊断</button>
    <label>导入 IdeaScope JSON（始终创建新项目，不覆盖）<input type="file" accept="application/json,.json" onChange={(event) => void importWorkspace(event.target.files?.[0])} /></label>
    <label>输入“清除全部数据”确认<input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>
    <button type="button" disabled={confirmation !== "清除全部数据"} onClick={() => void clearAll()}>清除全部本地数据</button>
    <p role="status">{status}</p>
  </section>;
}
