import { useRef, useState } from "react";
import { probeOpenAlex } from "../../infrastructure/literature/openalex-probe";
import { normalizeConnectionError } from "../../infrastructure/network/errors";
import { Button } from "../../shared/ui";
import styles from "./DataSafetyPanel.module.css";

export function LiteratureSourcePanel() {
  const [status, setStatus] = useState({
    openalex: "待验证",
    crossref: "待验证",
    semanticScholar: "待验证",
  });
  const active = useRef<AbortController | null>(null);
  async function test() {
    active.current?.abort();
    active.current = new AbortController();
    setStatus({
      openalex: "正在检查…",
      crossref: "正在检查…",
      semanticScholar: "正在检查…",
    });
    const signal = active.current.signal;
    const [openalex, crossref, semanticScholar] = await Promise.allSettled([
      probeOpenAlex(signal),
      fetch("https://api.crossref.org/works?rows=0", {
        signal,
        headers: { Accept: "application/json" },
      }).then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
      }),
      fetch(
        "https://api.semanticscholar.org/graph/v1/paper/search?query=health-check&limit=1&fields=title",
        { signal, headers: { Accept: "application/json" } },
      ).then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
      }),
    ]);
    setStatus({
      openalex:
        openalex.status === "fulfilled"
          ? "可用"
          : `测试失败：${normalizeConnectionError(openalex.reason).message}`,
      crossref:
        crossref.status === "fulfilled"
          ? "可用"
          : `测试失败：${normalizeConnectionError(crossref.reason).message}`,
      semanticScholar:
        semanticScholar.status === "fulfilled"
          ? "可用"
          : `测试失败：${normalizeConnectionError(semanticScholar.reason).message}`,
    });
  }
  return (
    <section className={styles.panel} aria-labelledby="literature-source-title">
      <p>LITERATURE SOURCES</p>
      <h2 id="literature-source-title">文献来源</h2>
      <p>这里只检查来源能否访问，不创建研究任务，也不会把结果加入探索历史。</p>
      <div className={styles.summary}>
        <strong>OpenAlex</strong>
        <span>论文、主题、作者与引用关系 · 主来源</span>
        <span>状态：{status.openalex}</span>
      </div>
      <div className={styles.summary}>
        <strong>Semantic Scholar</strong>
        <span>论文摘要与学术图谱元数据 · 备用来源</span>
        <span>状态：{status.semanticScholar}</span>
      </div>
      <div className={styles.summary}>
        <strong>Crossref</strong>
        <span>DOI 与出版元数据 · OpenAlex 受限时自动补充</span>
        <span>状态：{status.crossref}</span>
      </div>
      <Button type="button" onClick={() => void test()}>
        测试连接
      </Button>
      <p role="status">
        OpenAlex：{status.openalex} · Crossref：{status.crossref} · Semantic
        Scholar：{status.semanticScholar}
      </p>
    </section>
  );
}
