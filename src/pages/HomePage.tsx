import { ArrowRight, BookOpen, GitBranch, Map } from 'lucide-react';
import { lazy, Suspense, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { copy } from '../shared/i18n/zh-CN';
import { AppHeader } from '../shared/ui/AppHeader';
import { Button, Dialog, Textarea } from '../shared/ui';
import styles from './HomePage.module.css';
import { createWorkspaceFromIdea } from '../domain/workspace/create-workspace';
const ProjectLibrary = lazy(() => import('../features/workspace/ProjectLibrary').then((module) => ({ default: module.ProjectLibrary })));

export function HomePage() {
  const navigate = useNavigate();
  const [idea, setIdea] = useState('');
  const [dialog, setDialog] = useState(false);
  async function startLocal() {
    if (!idea.trim()) { setDialog(true); return; }
    const workspace = createWorkspaceFromIdea(idea);
    const { WorkspaceRepository } = await import('../infrastructure/storage/workspace-repository');
    const result = await new WorkspaceRepository().save(workspace);
    if (result.status === 'saved') void navigate(`/workspace/${workspace.workspace.id}`);
    else setDialog(true);
  }
  return <><AppHeader context="从模糊想法，到清晰方向"/><main className={styles.home}>
    <section><p className={styles.kicker}>A WORKSPACE FOR RESEARCH EXPLORATION</p><h1>让一个想法，<br/><em>慢慢变清楚。</em></h1><p className={styles.desc}>从还说不清的兴趣出发，理解一个领域的研究脉络。沿着证据追问，找到值得继续探索的方向。</p><div className={styles.points}><span><Map/>看清研究地图</span><span><BookOpen/>让判断有据可循</span><span><GitBranch/>随时换个方向</span></div></section>
    <section className={styles.entry}><Textarea label="先说说，你在想什么？" value={idea} onChange={e=>setIdea(e.target.value)} placeholder={copy.placeholder}/><div className={styles.actions}><small>先创建本地起点；不会调用模型。</small><Button variant="primary" onClick={() => void startLocal()}>开始探索 <ArrowRight size={15}/></Button></div><Button variant="ghost" onClick={() => { void navigate('/workspace/demo'); }}>先打开示例看看</Button></section>
    <section className={styles.recent}><div><small>继续一段探索</small><h2>研究型问答的可靠性</h2><p>示例项目 · 2 条探索分支</p></div><Button onClick={() => { void navigate('/workspace/demo'); }}>继续 <ArrowRight size={15}/></Button></section><Suspense fallback={<p role="status">正在读取本地项目…</p>}><ProjectLibrary /></Suspense>
  </main><Dialog open={dialog} title="需要先配置模型" onClose={()=>setDialog(false)}><p>输入仍保留在当前页面。真实探索需要先配置 Provider，也可以零配置打开明确标注的示例。</p><Button onClick={() => { void navigate('/settings'); }}>前往设置</Button></Dialog></>;
}
