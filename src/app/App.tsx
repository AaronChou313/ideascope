import styles from './App.module.css';

export function App() {
  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <a className={styles.brand} href="/" aria-label="IdeaScope 首页">
          <span className={styles.brandMark} aria-hidden="true">i</span>
          IdeaScope
        </a>
        <span className={styles.phase}>v0.1.0-A · 工程基线</span>
      </header>
      <main className={styles.main}>
        <section className={styles.copy} aria-labelledby="baseline-title">
          <p className={styles.kicker}>RESEARCH EXPLORATION WORKSPACE</p>
          <h1 id="baseline-title">让一个想法，<br /><em>慢慢变清楚。</em></h1>
          <p className={styles.description}>
            IdeaScope 的生产工程已经建立。当前阶段只验证技术与契约基线，
            尚未连接模型、文献来源或真实研究流程。
          </p>
          <div className={styles.status} role="status">
            <span aria-hidden="true" />
            本地空壳 · 不联网 · 不调用模型
          </div>
        </section>
        <aside className={styles.card} aria-label="当前阶段说明">
          <p className={styles.cardLabel}>CURRENT STAGE / 0.1-A</p>
          <h2>工程与契约基线</h2>
          <p>严格 TypeScript、测试与构建入口已经就位；演示数据不会作为真实模型结果接入。</p>
          <dl>
            <div><dt>Provider</dt><dd>待 0.1-B 浏览器实测</dd></div>
            <div><dt>文献检索</dt><dd>待 0.1-B 浏览器实测</dd></div>
            <div><dt>静态部署</dt><dd>待 0.1-C 验证</dd></div>
          </dl>
        </aside>
      </main>
    </div>
  );
}
