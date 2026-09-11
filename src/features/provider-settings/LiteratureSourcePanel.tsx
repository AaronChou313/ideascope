import { useRef, useState } from "react";
import { probeOpenAlex } from "../../infrastructure/literature/openalex-probe";
import { normalizeConnectionError } from "../../infrastructure/network/errors";
import { Button } from "../../shared/ui";
import styles from "./DataSafetyPanel.module.css";

export function LiteratureSourcePanel() {
  const [status, setStatus] = useState("待验证");
  const active = useRef<AbortController | null>(null);
  async function test() {
    active.current?.abort(); active.current = new AbortController(); setStatus("正在检查…");
    try { await probeOpenAlex(active.current.signal); setStatus("可用"); }
    catch (error) { setStatus(`测试失败：${normalizeConnectionError(error).message}`); }
  }
  return <section className={styles.panel} aria-labelledby="literature-source-title">
    <p>LITERATURE SOURCES</p><h2 id="literature-source-title">文献来源</h2>
    <p>这里只检查来源能否访问，不创建研究任务，也不会把结果加入探索历史。</p>
    <div className={styles.summary}><strong>OpenAlex</strong><span>论文、主题、作者与引用关系</span><span>状态：{status}</span></div>
    <Button type="button" onClick={() => void test()}>测试连接</Button>
    <p role="status">{status}</p>
  </section>;
}
