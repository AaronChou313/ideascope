import { Library, Map, MessageSquare, PanelLeftClose, PanelRightClose } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { GraphNode } from '../../contracts/domain';
import { ResearchMap } from '../features/graph/ResearchMap';
import { loadDemoWorkspace } from '../infrastructure/demo/workspace-demo';
import { AppHeader } from '../shared/ui/AppHeader';
import { Button, Tabs } from '../shared/ui';
import styles from './WorkspacePage.module.css';

export function WorkspacePage() {
  const workspace = useMemo(() => loadDemoWorkspace(), []);
  const [branchId, setBranchId] = useState(workspace.workspace.activeBranchId);
  const [selectedId, setSelectedId] = useState<string | null>('g-sufficient');
  const [left, setLeft] = useState(true);
  const [right, setRight] = useState(true);
  const [view, setView] = useState('map');
  const branch = workspace.workspace.branches.find(item => item.id === branchId) ?? workspace.workspace.branches[0];
  if (!branch) throw new Error('Demo workspace has no branch.');
  const selected = branch.graph.nodes.find(node => node.id === selectedId) ?? null;
  const claims = selected?.claimIds.map(id => branch.graph.claims.find(claim => claim.id === id)).filter(item => item !== undefined) ?? [];
  function selectNode(node: GraphNode) { setSelectedId(node.id); setRight(true); }
  function selectBranch(id: string) { setBranchId(id); const next = workspace.workspace.branches.find(item => item.id === id); setSelectedId(next?.focusNodeId ?? next?.graph.nodes[0]?.id ?? null); }
  return <div className={styles.page}><AppHeader context="演示研究工作区"/><main className={`${styles.workspace} ${!left?styles.noLeft:''} ${!right?styles.noRight:''}`}>
    <aside className={styles.left}><Link to="/">← 所有探索</Link><p>研究轨迹</p>{workspace.workspace.branches.map(item=><button key={item.id} className={item.id===branch.id?styles.active:''} onClick={()=>selectBranch(item.id)}>{item.title}</button>)}<nav><button><Map/>研究地图</button><button><Library/>文献与证据</button></nav></aside>
    <section className={styles.center}><header><div><h1>{branch.title}</h1><p>{branch.graph.nodes.length} 个语义节点 · 示例整理，非完整调研</p></div><Tabs label="中央视图" value={view} onChange={setView} items={[{id:'map',label:'地图'},{id:'list',label:'结构'}]}/></header><div className={styles.canvas}>{view==='map'?<ResearchMap branch={branch} selectedId={selectedId} onSelect={selectNode}/>:<div className={styles.list}>{branch.graph.nodes.map(node=><button key={node.id} className={node.id===selectedId?styles.listSelected:''} onClick={()=>selectNode(node)}><span>{node.kind}</span><strong>{node.title}</strong><p>{node.summary}</p></button>)}</div>}</div></section>
    <aside className={styles.right}><header><MessageSquare/>节点详情 <span>演示</span></header><div>{selected?<><small className={styles.kind}>{selected.kind}</small><h2>{selected.title}</h2><p>{selected.summary}</p><h3>相关判断</h3>{claims.length?claims.map(claim=><article key={claim.id}><b>{claim.epistemicStatus}</b><p>{claim.text}</p></article>):<p>这是研究问题，不是已经被文献证明的事实。</p>}<Button variant="primary">围绕此处继续</Button></>:<><h2>选择一个节点</h2><p>查看含义、判断与证据范围。</p></>}</div></aside>
    <Button className={styles.lt} variant="ghost" aria-label="折叠左侧面板" onClick={()=>setLeft(!left)}><PanelLeftClose size={17}/></Button><Button className={styles.rt} variant="ghost" aria-label="折叠右侧面板" onClick={()=>setRight(!right)}><PanelRightClose size={17}/></Button>
  </main></div>;
}
