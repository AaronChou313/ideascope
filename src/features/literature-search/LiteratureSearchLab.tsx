import { useEffect, useRef, useState } from "react";
import type {
  LiteratureQuery,
  LiteratureSearchResult,
  SearchStatus,
} from "../../domain/search/literature";
import {
  OpenAlexLiteratureAdapter,
  OPENALEX_FIELDS,
} from "../../infrastructure/literature/openalex";
import styles from "./LiteratureSearchLab.module.css";

const statusText: Record<SearchStatus, string> = {
  completed: "完成",
  empty: "没有结果",
  cancelled: "已取消",
  timed_out: "超时",
  rate_limited: "受到限流",
  source_unavailable: "来源不可用",
  invalid_response: "响应格式异常",
};

export function LiteratureSearchLab() {
  const [originalIdea, setOriginalIdea] = useState("怎样让研究型问答更可靠？");
  const [keywords, setKeywords] = useState(
    "retrieval augmented generation reliability evidence",
  );
  const [language, setLanguage] = useState("en");
  const [rationale, setRationale] = useState(
    "将研究对象、可靠性与证据要求拆成英文关键词；不是对中文想法的逐字替换。",
  );
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState(
    "尚未发起真实查询。结果只保存在当前页面内存中。",
  );
  const [history, setHistory] = useState<LiteratureSearchResult[]>([]);
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), []);

  async function search() {
    active.current?.abort();
    active.current = new AbortController();
    setRunning(true);
    setMessage("正在向 OpenAlex 发起普通关键词检索…");
    const query: LiteratureQuery = {
      originalIdea,
      keywords,
      language,
      rationale,
    };
    try {
      const result = await new OpenAlexLiteratureAdapter().search(
        query,
        { limit: 10, maxPages: 1, sort: "relevance", fields: OPENALEX_FIELDS },
        active.current.signal,
      );
      setHistory((current) => [result, ...current].slice(0, 5));
      setMessage(
        result.record.status === "completed"
          ? `检索完成：本页归一化 ${result.papers.length} 条记录。`
          : `检索结束：${statusText[result.record.status]}。`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "检索参数无效。");
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className={styles.lab} aria-labelledby="search-lab-title">
      <header>
        <div>
          <p>LITERATURE SEARCH / 0.3-A</p>
          <h2 id="search-lab-title">真实关键词检索</h2>
        </div>
        <span>OpenAlex · 普通搜索</span>
      </header>
      <div className={styles.layout}>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void search();
          }}
        >
          <p className={styles.help}>
            点击检索会从浏览器直接请求 OpenAlex，消耗匿名 API
            预算。不会调用付费模型，也不会把结果自动写成研究判断。
          </p>
          <label>
            原始想法
            <textarea
              value={originalIdea}
              onChange={(event) => setOriginalIdea(event.target.value)}
            />
          </label>
          <label>
            实际关键词
            <input
              value={keywords}
              onChange={(event) => setKeywords(event.target.value)}
            />
          </label>
          <label>
            关键词语言
            <select
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
            >
              <option value="en">English</option>
              <option value="zh">中文</option>
              <option value="mixed">混合</option>
            </select>
          </label>
          <label>
            转换依据
            <textarea
              value={rationale}
              onChange={(event) => setRationale(event.target.value)}
            />
          </label>
          <div className={styles.actions}>
            <button className={styles.primary} disabled={running} type="submit">
              {running ? "检索中…" : "执行真实检索"}
            </button>
            <button
              type="button"
              disabled={!running}
              onClick={() => active.current?.abort()}
            >
              取消
            </button>
          </div>
        </form>
        <div className={styles.results}>
          <p className={styles.status} role="status" aria-live="polite">
            {message}
          </p>
          {history.length === 0 ? (
            <div className={styles.empty}>
              查询记录会显示关键词、状态、数量和脱敏诊断；不会记录完整请求 URL。
            </div>
          ) : (
            history.map(({ record, papers }) => (
              <article className={styles.record} key={record.id}>
                <header>
                  <b>{statusText[record.status]}</b>
                  <time>
                    {new Date(record.endedAt).toLocaleTimeString("zh-CN")}
                  </time>
                </header>
                <code>{record.query.keywords}</code>
                <small>
                  {record.resultCount} 条 · 来源 {record.source} · HTTP{" "}
                  {record.diagnostic.httpStatus ?? "—"}
                </small>
                {papers.slice(0, 5).map((paper) => (
                  <a
                    href={paper.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    key={paper.id}
                  >
                    <strong>{paper.title}</strong>
                    <span>
                      {paper.authors.slice(0, 2).join(", ") || "作者未知"} ·{" "}
                      {paper.year ?? "年份未知"}
                    </span>
                  </a>
                ))}
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
