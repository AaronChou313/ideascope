import { useEffect, useState } from "react";
import { DiagnosticExporter } from "../../infrastructure/export/diagnostic-export";
import { ProviderProfileRepository } from "../../infrastructure/storage/provider-profile-repository";
import { Button } from "../../shared/ui";
import styles from "./DataSafetyPanel.module.css";

export function AboutPanel() {
  const [provider, setProvider] = useState("未配置");
  const [status, setStatus] = useState("诊断信息不会包含密钥或研究正文。");
  useEffect(() => { void new ProviderProfileRepository().getActive().then((item) => setProvider(item ? `${item.name} · ${item.format}` : "未配置")); }, []);
  async function copy() {
    try {
      const value = await new DiagnosticExporter().collect();
      await navigator.clipboard.writeText(JSON.stringify(value, null, 2));
      setStatus("诊断信息已复制。");
    } catch { setStatus("复制失败；当前浏览器可能未授予剪贴板权限。"); }
  }
  return <section className={styles.panel} aria-labelledby="about-title">
    <p>ABOUT</p><h2 id="about-title">关于</h2>
    <div className={styles.summary}><span>IdeaScope 0.6.3</span><span>纯前端 · 数据保存在当前浏览器</span><span>当前 Provider：{provider}</span></div>
    <details><summary>高级诊断</summary><p>包含应用版本、浏览器、存储状态、Provider 类型、来源状态和最近错误摘要；排除凭证、请求头、查询和研究正文。</p><Button type="button" onClick={() => void copy()}>复制诊断信息</Button></details>
    <p role="status">{status}</p>
  </section>;
}
