import {
  Library,
  Map,
  MessageSquare,
  PanelLeftClose,
  PanelRightClose,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { GraphNode } from "../../contracts/domain";
import type { Branch, GraphPatch } from "../../contracts/domain";
import demoPatchJson from "../../examples/patch.demo.json";
import { applyGraphPatch } from "../domain/graph/apply-graph-patch";
import { auditWorkspaceExport, exportBranchSvg, exportWorkspaceJson, exportWorkspaceMarkdown } from "../domain/export/workspace-export";
import { downloadPngOrSvg, downloadText } from "../infrastructure/export/download";
import { CitationList } from "../features/evidence/CitationList";
import {
  WorkspaceContent,
  type DemoState,
} from "../features/workspace/WorkspaceContent";
import { loadDemoWorkspace } from "../infrastructure/demo/workspace-demo";
import { AppHeader } from "../shared/ui/AppHeader";
import { Button, Dialog, Tabs } from "../shared/ui";
import styles from "./WorkspacePage.module.css";

export function WorkspacePage() {
  const workspace = useMemo(() => loadDemoWorkspace(), []);
  const [branches, setBranches] = useState<Branch[]>(() => workspace.workspace.branches);
  const [undoBranch, setUndoBranch] = useState<Branch | null>(null);
  const [branchId, setBranchId] = useState(workspace.workspace.activeBranchId);
  const [selectedId, setSelectedId] = useState<string | null>("g-sufficient");
  const [left, setLeft] = useState(true);
  const [right, setRight] = useState(true);
  const [view, setView] = useState("map");
  const [demoState, setDemoState] = useState<DemoState>("ready");
  const [exportOpen, setExportOpen] = useState(false);
  const [mobilePane, setMobilePane] = useState<"main" | "details">("main");
  const exportValue = { ...workspace, workspace: { ...workspace.workspace, branches, activeBranchId: branchId } };
  const exportAudit = auditWorkspaceExport(exportValue);
  const branch =
    branches.find((item) => item.id === branchId) ?? branches[0];
  if (!branch) throw new Error("Demo workspace has no branch.");
  const selected =
    branch.graph.nodes.find((node) => node.id === selectedId) ?? null;
  const claims =
    selected?.claimIds
      .map((id) => branch.graph.claims.find((claim) => claim.id === id))
      .filter((item) => item !== undefined) ?? [];
  function selectNode(node: GraphNode) {
    setSelectedId(node.id);
    setRight(true);
  }
  function selectBranch(id: string) {
    setBranchId(id);
    const next = branches.find((item) => item.id === id);
    setSelectedId(next?.focusNodeId ?? next?.graph.nodes[0]?.id ?? null);
  }
  function applyDemoProposal() {
    if (!branch) return;
    const proposal = { ...(demoPatchJson as GraphPatch), baseRevision: branch.revision };
    const next = applyGraphPatch(proposal, { workspaceId: workspace.workspace.id, branch, evidenceIds: new Set(workspace.workspace.evidence.map(({ id }) => id)) });
    setUndoBranch(structuredClone(branch));
    setBranches((items) => items.map((item) => item.id === next.id ? next : item));
    setDemoState("ready");
    setSelectedId("q-evidence-criteria");
  }
  function undoDemoProposal() {
    if (!undoBranch) return;
    setBranches((items) => items.map((item) => item.id === undoBranch.id ? undoBranch : item));
    setUndoBranch(null);
    setSelectedId(undoBranch.focusNodeId);
  }
  function setDirectionStatus(status: "saved" | "excluded") {
    if (!branch) return;
    const targetId = branch.id;
    setBranches((items) => items.map((item) => item.id !== targetId ? item : { ...item, directions: item.directions.map((direction, index) => index ? direction : { ...direction, status, userEdited: true }) }));
  }
  function currentSvg() {
    if (!branch) throw new Error("演示分支不存在。");
    return exportBranchSvg(branch, "complete");
  }
  function showMobileSection(next: "map" | "papers" | "details") {
    if (next === "details") {
      setMobilePane("details");
      return;
    }
    setMobilePane("main");
    setView(next);
  }
  return (
    <div className={styles.page}>
      <AppHeader context="演示研究工作区" />
      <main
        className={`${styles.workspace} ${!left ? styles.noLeft : ""} ${!right ? styles.noRight : ""} ${mobilePane === "details" ? styles.mobileDetails : ""}`}
      >
        <aside className={styles.left}>
          <Link to="/">← 所有探索</Link>
          <p>研究轨迹</p>
          {branches.map((item) => (
            <button
              key={item.id}
              className={item.id === branch.id ? styles.active : ""}
              onClick={() => selectBranch(item.id)}
            >
              {item.title}
            </button>
          ))}
          <nav>
            <button onClick={() => setView("map")}>
              <Map />
              研究地图
            </button>
            <button onClick={() => setView("papers")}>
              <Library />
              文献与证据
            </button>
            <button onClick={() => setView("directions")}>◎ 候选方向</button>
          </nav>
        </aside>
        <section className={styles.center}>
          <header>
            <div>
              <h1>{branch.title}</h1>
              <p>
                {branch.graph.nodes.length} 个语义节点 · 示例整理，非完整调研
              </p>
            </div>
            <div className={styles.tools}>
              <Tabs
                label="中央视图"
                value={view}
                onChange={setView}
                items={[
                  { id: "map", label: "地图" },
                  { id: "list", label: "结构" },
                ]}
              />
              <select
                aria-label="演示状态"
                value={demoState}
                onChange={(event) =>
                  setDemoState(event.target.value as DemoState)
                }
              >
                <option value="ready">正常</option>
                <option value="firstVisit">首访</option>
                <option value="loading">加载</option>
                <option value="empty">无结果</option>
                <option value="error">失败</option>
                <option value="cancelled">已取消</option>
                <option value="proposal">待应用</option>
              </select>
              <Button aria-label="导出演示" onClick={() => setExportOpen(true)}>
                导出
              </Button>
              {undoBranch && <Button variant="ghost" onClick={undoDemoProposal}>撤销上次应用</Button>}
            </div>
          </header>
          <div className={styles.canvas}>
            {view === "list" && demoState === "ready" ? (
              <div className={styles.list}>
                {branch.graph.nodes.map((node) => (
                  <button
                    key={node.id}
                    className={
                      node.id === selectedId ? styles.listSelected : ""
                    }
                    onClick={() => selectNode(node)}
                  >
                    <span>{node.kind}</span>
                    <strong>{node.title}</strong>
                    <p>{node.summary}</p>
                  </button>
                ))}
              </div>
            ) : (
              <WorkspaceContent
                section={
                  view === "papers" || view === "directions" ? view : "map"
                }
                state={demoState}
                workspace={workspace}
                branch={branch}
                selectedId={selectedId}
                onSelect={selectNode}
                onApplyProposal={applyDemoProposal}
                onDismissProposal={() => setDemoState("ready")}
                onDirectionStatus={setDirectionStatus}
              />
            )}
          </div>
        </section>
        <aside className={styles.right}>
          <header>
            <MessageSquare />
            节点详情 <span>演示</span>
          </header>
          <div>
            {selected ? (
              <>
                <small className={styles.kind}>{selected.kind}</small>
                <h2>{selected.title}</h2>
                <p>{selected.summary}</p>
                <h3>相关判断</h3>
                {claims.length ? (
                  claims.map((claim) => (
                    <article key={claim.id}>
                      <b>{claim.epistemicStatus}</b>
                      <p>{claim.text}</p>
                      <CitationList claim={claim} evidence={workspace.workspace.evidence} papers={workspace.workspace.papers} />
                    </article>
                  ))
                ) : (
                  <p>这是研究问题，不是已经被文献证明的事实。</p>
                )}
                <Button variant="primary">围绕此处继续</Button>
              </>
            ) : (
              <>
                <h2>选择一个节点</h2>
                <p>查看含义、判断与证据范围。</p>
              </>
            )}
          </div>
        </aside>
        <nav className={styles.mobileNav} aria-label="移动端工作区视图">
          <button
            aria-pressed={mobilePane === "main" && view !== "papers"}
            onClick={() => showMobileSection("map")}
          >
            <Map />
            地图
          </button>
          <button
            aria-pressed={mobilePane === "main" && view === "papers"}
            onClick={() => showMobileSection("papers")}
          >
            <Library />
            资料
          </button>
          <button
            aria-pressed={mobilePane === "details"}
            onClick={() => showMobileSection("details")}
          >
            <MessageSquare />
            详情
          </button>
        </nav>
        <Button
          className={styles.lt}
          variant="ghost"
          aria-label="折叠左侧面板"
          onClick={() => setLeft(!left)}
        >
          <PanelLeftClose size={17} />
        </Button>
        <Button
          className={styles.rt}
          variant="ghost"
          aria-label="折叠右侧面板"
          onClick={() => setRight(!right)}
        >
          <PanelRightClose size={17} />
        </Button>
      </main>
      <Dialog
        open={exportOpen}
        title="带走当前的理解"
        onClose={() => setExportOpen(false)}
      >
        <p>当前分支：{branch.title} · {branch.graph.nodes.length} 个节点。导出包含 {exportAudit.messages} 条消息、{exportAudit.userNotes} 条用户笔记、{exportAudit.evidenceExcerpts} 条原文片段；凭证 0 项。</p>
        <p>JSON 包含完整项目；Markdown 与图形导出当前完整分支。请在分享前检查研究内容与引用片段。</p>
        <Button onClick={() => downloadText("ideascope-workspace.json", "application/json", exportWorkspaceJson(exportValue, "0.6.0"))}>下载 JSON</Button>
        <Button onClick={() => downloadText("ideascope-outline.md", "text/markdown", exportWorkspaceMarkdown(exportValue, branch.id))}>下载 Markdown</Button>
        <Button onClick={() => downloadText("ideascope-map.svg", "image/svg+xml", currentSvg())}>下载 SVG</Button>
        <Button onClick={() => void downloadPngOrSvg("ideascope-map", currentSvg())}>下载 PNG</Button>
        <Button onClick={() => setExportOpen(false)}>了解</Button>
      </Dialog>
    </div>
  );
}
