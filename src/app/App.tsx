import styles from './App.module.css';
import { ConnectionLab } from '../features/provider-settings/ConnectionLab';

export function App() {
  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <a className={styles.brand} href="/" aria-label="IdeaScope 首页">
          <span className={styles.brandMark} aria-hidden="true">i</span>
          IdeaScope
        </a>
        <span className={styles.phase}>v0.1.0-B · 连接探针</span>
      </header>
      <main className={styles.main}>
        <section className={styles.copy} aria-labelledby="baseline-title">
          <p className={styles.kicker}>RESEARCH EXPLORATION WORKSPACE</p>
          <h1 id="baseline-title">让一个想法，<br /><em>慢慢变清楚。</em></h1>
          <p className={styles.description}>
            IdeaScope 正在验证浏览器直连边界。Provider 能力必须逐项实测，
            文献来源与模型连接保持彼此独立。
          </p>
          <div className={styles.status} role="status">
            <span aria-hidden="true" />
            连接实验室 · 不自动调用模型
          </div>
        </section>
        <aside className={styles.card} aria-label="当前阶段说明">
          <p className={styles.cardLabel}>CURRENT STAGE / 0.1-B</p>
          <h2>浏览器能力实测</h2>
          <p>只有用户主动运行的探针才会发送请求；演示数据不会作为真实模型结果接入。</p>
          <dl>
            <div><dt>Provider</dt><dd>待 0.1-B 浏览器实测</dd></div>
            <div><dt>文献检索</dt><dd>可运行匿名探针</dd></div>
            <div><dt>静态部署</dt><dd>待 0.1-C 验证</dd></div>
          </dl>
        </aside>
      </main>
      <ConnectionLab />
    </div>
  );
}
