import { ArrowRight, BookOpen, GitBranch, Map } from 'lucide-react';
import { lazy, Suspense, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { copy } from '../shared/i18n/zh-CN';
import { AppHeader } from '../shared/ui/AppHeader';
import { Button, Dialog, Textarea } from '../shared/ui';
import styles from './HomePage.module.css';
import { startExploration } from '../application/exploration/start-exploration';
const ProjectLibrary = lazy(() => import('../features/workspace/ProjectLibrary').then((module) => ({ default: module.ProjectLibrary })));

export function HomePage() {
  const navigate = useNavigate();
  const [idea, setIdea] = useState(() => sessionStorage.getItem('ideascope.ideaDraft') ?? '');
  const [dialog, setDialog] = useState<"provider" | "idea" | null>(null);
  const [providerReason, setProviderReason] = useState<"missing_profile" | "missing_session_key">("missing_profile");
  async function startLocal() {
    if (!idea.trim()) { setDialog("idea"); return; }
    const result = await startExploration(idea);
    if (result.status === 'started') {
      sessionStorage.removeItem('ideascope.ideaDraft');
      void navigate(`/workspace/${result.workspaceId}`);
    } else if (result.status === 'needs_provider') {
      setProviderReason(result.reason); setDialog("provider");
    } else setDialog("idea");
  }
  return <><AppHeader context="从模糊想法，到清晰方向"/><main className={styles.home}>
    <section><p className={styles.kicker}>A WORKSPACE FOR RESEARCH EXPLORATION</p><h1>让一个想法，<br/><em>慢慢变清楚。</em></h1><p className={styles.desc}>从还说不清的兴趣出发，理解一个领域的研究脉络。沿着证据追问，找到值得继续探索的方向。</p><div className={styles.points}><span><Map/>看清研究地图</span><span><BookOpen/>让判断有据可循</span><span><GitBranch/>随时换个方向</span></div></section>
    <section className={styles.entry}><Textarea label="先说说，你在想什么？" value={idea} onChange={e=>{setIdea(e.target.value);sessionStorage.setItem('ideascope.ideaDraft',e.target.value);}} placeholder={copy.placeholder}/><div className={styles.actions}><small>研究项目保存在当前浏览器。</small><Button variant="primary" onClick={() => void startLocal()}>开始探索 <ArrowRight size={15}/></Button></div><Button variant="ghost" onClick={() => { void navigate('/workspace/demo'); }}>先打开示例看看</Button></section>
    <section className={styles.recent}><div><small>继续一段探索</small><h2>研究型问答的可靠性</h2><p>示例项目 · 2 条探索分支</p></div><Button onClick={() => { void navigate('/workspace/demo'); }}>继续 <ArrowRight size={15}/></Button></section><Suspense fallback={<p role="status">正在读取本地项目…</p>}><ProjectLibrary /></Suspense>
  </main><Dialog open={dialog === "provider"} title="需要配置模型" onClose={()=>setDialog(null)}><p>IdeaScope 需要连接一个模型 Provider 才能开始研究探索。{providerReason === "missing_session_key" ? "已保存非敏感配置；刷新后需要重新输入 API Key。" : ""}</p><div className={styles.dialogActions}><Button onClick={()=>setDialog(null)}>暂不配置</Button><Button variant="primary" onClick={() => { void navigate('/settings/provider', { state: { returnTo: '/' } }); }}>前往设置</Button></div></Dialog><Dialog open={dialog === "idea"} title="请先写下一个想法" onClose={()=>setDialog(null)}><p>输入一个希望继续澄清的研究主题，再开始探索。</p><Button onClick={()=>setDialog(null)}>知道了</Button></Dialog></>;
}
