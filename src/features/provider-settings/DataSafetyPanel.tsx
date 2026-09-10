import { useState } from "react";
import { DiagnosticExporter } from "../../infrastructure/export/diagnostic-export";
import { downloadText } from "../../infrastructure/export/download";
import { LocalDataService } from "../../infrastructure/storage/local-data-service";
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
  return <section className={styles.panel} aria-labelledby="data-safety-title">
    <p>LOCAL DATA / SECURITY</p>
    <h2 id="data-safety-title">本地数据与诊断</h2>
    <p>纯前端应用无法安全保管长期密钥。Provider 凭证只在当前页面内存中；研究内容保存在浏览器 IndexedDB。</p>
    <button type="button" onClick={() => void diagnostics()}>导出脱敏诊断</button>
    <label>输入“清除全部数据”确认<input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>
    <button type="button" disabled={confirmation !== "清除全部数据"} onClick={() => void clearAll()}>清除全部本地数据</button>
    <p role="status">{status}</p>
  </section>;
}
