import {
  Download,
  Map,
  MessageSquare,
  PanelLeftClose,
  PanelRightClose,
  Search,
  Settings,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Viewport } from "@xyflow/react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { GraphNode, WorkspaceExport } from "../../contracts/domain";
import {
  runExploration,
  type ExplorationProgress,
} from "../application/exploration/run-exploration";
import { exportWorkspaceJson } from "../domain/export/workspace-export";
import { ResearchMap } from "../features/graph/ResearchMap";
import type { PositionMap } from "../features/graph/layout";
import { SessionSidebar } from "../features/workspace/SessionSidebar";
import { downloadText } from "../infrastructure/export/download";
import { WorkspaceRepository } from "../infrastructure/storage/workspace-repository";
import { Button, Dialog } from "../shared/ui";
import styles from "./WorkspacePage.module.css";
import "./WorkspaceOverrides.css";

export function WorkspacePage() {
  const { id } = useParams();
  return <WorkspaceShell key={id ?? "root"} id={id} />;
}

function WorkspaceShell({ id }: { id?: string }) {
  const navigate = useNavigate();
  const [workspace, setWorkspace] = useState<WorkspaceExport | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [loadError, setLoadError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [composerContextNodeId, setComposerContextNodeId] = useState<string | null>(null);
  const [tab, setTab] = useState<"chat" | "detail">("chat");
  const [draft, setDraft] = useState(() =>
    id ? (sessionStorage.getItem(`ideascope.draft.${id}`) ?? "") : "",
  );
  const [progressLog, setProgressLog] = useState<ExplorationProgress[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [providerDialog, setProviderDialog] = useState(false);
  const [left, setLeft] = useState(true);
  const [right, setRight] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;
    void new WorkspaceRepository().get(id).then((value) => {
      if (!active) return;
      if (value) {
        setWorkspace(value);
        const restored = value.workspace.branches.find(
          (item) => item.id === value.workspace.activeBranchId,
        );
        setComposerContextNodeId(restored?.focusNodeId ?? null);
      } else
        setLoadError("探索会话不存在或已被删除。现有其他会话没有受到影响。");
      setLoading(false);
    });
    return () => {
      active = false;
      abortRef.current?.abort();
    };
  }, [id]);
  useEffect(() => {
    if (id) sessionStorage.setItem(`ideascope.draft.${id}`, draft);
  }, [draft, id]);

  const branch =
    workspace?.workspace.branches.find(
      (item) => item.id === workspace.workspace.activeBranchId,
    ) ?? null;
  const selected =
    branch?.graph.nodes.find((node) => node.id === selectedId) ?? null;
  const selectedParent = branch?.graph.nodes.find((node) => node.id === selected?.parentId) ?? null;
  const selectedChildren = branch?.graph.nodes.filter((node) => node.parentId === selected?.id && !node.archived) ?? [];
  const selectedRelated = branch && selected ? branch.graph.edges.filter((edge) => edge.role === "cross" && (edge.source === selected.id || edge.target === selected.id)).flatMap((edge) => branch.graph.nodes.filter((node) => node.id === (edge.source === selected.id ? edge.target : edge.source))) : [];
  const selectedEvidence = (() => {
    if (!workspace || !branch || !selected) return [];
    const ids = new Set(
      branch.graph.claims
        .filter((claim) => selected.claimIds.includes(claim.id))
        .flatMap((claim) => claim.evidenceLinks.map((link) => link.evidenceId)),
    );
    return workspace.workspace.evidence
      .filter((item) => ids.has(item.id))
      .map((evidence) => ({
        evidence,
        paper: workspace.workspace.papers.find(
          (paper) => paper.id === evidence.paperId,
        ),
      }))
      .filter((item) => item.paper);
  })();

  async function send(text = draft, sourceWorkspace = workspace, contextNodeId = composerContextNodeId) {
    if (!sourceWorkspace || running || !text.trim()) return;
    setError("");
    setProgressLog([]);
    setRunning(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const active = sourceWorkspace.workspace.branches.find(
        (item) => item.id === sourceWorkspace.workspace.activeBranchId,
      );
      const result = await runExploration(sourceWorkspace, text, {
        signal: controller.signal,
        contextNodeId,
        onProgress: (item) => setProgressLog((current) => [...current, item]),
      });
      setWorkspace(result.workspace);
      setDraft("");
      sessionStorage.removeItem(`ideascope.draft.${id}`);
      if (active?.id !== result.workspace.workspace.activeBranchId) { setComposerContextNodeId(null); setSelectedId(null); }
      setTab("chat");
      setRefreshKey((value) => value + 1);
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "研究请求失败。";
      if (message === "需要配置模型") setProviderDialog(true);
      else if (caught instanceof DOMException && caught.name === "AbortError")
        setError("已取消本次研究；取消前保存的对话仍然保留。");
      else setError(message);
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }
  function chooseNode(node: GraphNode) {
    setSelectedId(node.id);
    setTab("detail");
  }
  function updateFocus(nodeId: string | null) {
    if (!workspace) return workspace;
    const next = structuredClone(workspace);
    const active = next.workspace.branches.find(
      (item) => item.id === next.workspace.activeBranchId,
    );
    if (active) active.focusNodeId = nodeId;
    setWorkspace(next);
    void new WorkspaceRepository().save(next);
    return next;
  }
  function continueNode() {
    if (!selected) return;
    updateFocus(selected.id);
    setComposerContextNodeId(selected.id);
    setTab("chat");
    requestAnimationFrame(() => composerRef.current?.focus());
  }
  const saveView = useCallback((positions: PositionMap, viewport?: Viewport) => {
    setWorkspace((current) => {
      if (!current) return current;
      const next = structuredClone(current), active = next.workspace.branches.find((item) => item.id === next.workspace.activeBranchId);
      if (!active) return current;
      active.view.positions = Object.fromEntries([...positions].map(([nodeId, position]) => [nodeId, { ...position, pinned: active.view.positions[nodeId]?.pinned ?? false }]));
      if (viewport) active.view.viewport = viewport;
      void new WorkspaceRepository().save(next);
      return next;
    });
  }, []);

  if (!id)
    return (
      <div className={`${styles.page} workspace-root-shell`}>
        <SessionSidebar />
        <main className={styles.blank}>
          <Map />
          <h1>从一个模糊的研究想法开始</h1>
          <p>
            点击“新建探索”，然后在右侧对话中输入问题、概念或还不成熟的研究念头。
          </p>
        </main>
        <aside className={styles.blankChat}>
          <h2>探索对话</h2>
          <p>先新建一个探索会话。</p>
        </aside>
      </div>
    );
  if (loading)
    return (
      <main className={styles.loading} role="status">
        正在恢复研究会话…
      </main>
    );
  if (!workspace || !branch)
    return (
      <div className={styles.page}>
        <SessionSidebar activeId={id} />
        <main className={styles.blank}>
          <h1>无法恢复会话</h1>
          <p>{loadError}</p>
          <Link to="/">返回工作台</Link>
        </main>
      </div>
    );

  return (
    <div
      className={`${styles.page} ${!left ? styles.noLeft : ""} ${!right ? styles.noRight : ""}`}
    >
      <SessionSidebar activeId={id} refreshKey={refreshKey} />
      <section className={styles.center}>
        <header>
          <div>
            <h1>{workspace.workspace.title}</h1>
            <p>
              {branch.graph.nodes.length} 个节点 ·{" "}
              {workspace.workspace.evidence.length} 条 Evidence · 本地已保存
            </p>
          </div>
          <div className={styles.toolbar}>
            <label>
              <Search size={14} />
              <input
                placeholder="搜索节点"
                onChange={(event) => {
                  const term = event.target.value.trim().toLocaleLowerCase();
                  const node = branch.graph.nodes.find((item) =>
                    item.title.toLocaleLowerCase().includes(term),
                  );
                  if (node && term) chooseNode(node);
                }}
              />
            </label>
            <Button
              aria-label="导出当前探索"
              onClick={() =>
                downloadText(
                  `${workspace.workspace.title}.json`,
                  "application/json",
                  exportWorkspaceJson(workspace, "0.6.4"),
                )
              }
            >
              <Download size={15} />
            </Button>
            <Link
              aria-label="设置"
              to="/settings/provider"
              state={{ returnTo: `/workspace/${id}` }}
            >
              <Settings size={16} />
            </Link>
          </div>
        </header>
        <div className={styles.canvas}>
          {branch.graph.nodes.length ? (
            <ResearchMap
              branch={branch}
              selectedId={selectedId}
              contextNodeId={composerContextNodeId}
              onSelect={chooseNode}
              onViewChange={saveView}
            />
          ) : (
            <div className={styles.canvasEmpty}>
              <Map />
              <h2>从一个模糊的研究想法开始</h2>
              <p>你可以从一个问题、概念或还不成熟的研究念头开始。</p>
              <small>例如：机器人足端感知能为状态估计提供什么信息？</small>
            </div>
          )}
        </div>
      </section>
      <aside className={styles.right}>
        <div className={styles.tabs}>
          <button aria-selected={tab === "chat"} onClick={() => setTab("chat")}>
            <MessageSquare size={14} />
            探索对话
          </button>
          <button
            aria-selected={tab === "detail"}
            onClick={() => setTab("detail")}
          >
            节点详情
          </button>
        </div>
        {tab === "chat" ? (
          <div className={styles.chat}>
            <div className={styles.messages}>
              {workspace.workspace.messages
                .filter((message) => message.branchId === branch.id)
                .map((message) => (
                  <article
                    key={message.id}
                    className={
                      message.role === "user" ? styles.user : styles.assistant
                    }
                  >
                    <small>
                      {message.role === "user" ? "你" : "IdeaScope"}
                    </small>
                    <p>{message.text}</p>
                  </article>
                ))}
              {progressLog.length > 0 && (
                <details
                  className={styles.progress}
                  open={running}
                  role="status"
                >
                  <summary>
                    <span />
                    <strong>{progressLog.at(-1)?.message}</strong>
                    <small>{running ? "进行中" : "查看过程"}</small>
                  </summary>
                  <ol>
                    {progressLog.map((item, index) => (
                      <li
                        key={`${item.stage}-${index}`}
                        data-tone={item.tone ?? "info"}
                      >
                        <span>{item.message}</span>
                        {item.candidates !== undefined && (
                          <small>
                            {item.queries} 组查询 · {item.candidates} 条候选资料
                          </small>
                        )}
                      </li>
                    ))}
                  </ol>
                </details>
              )}
              {error && (
                <div className={styles.error} role="alert">
                  {error}
                </div>
              )}
            </div>
            <div className={styles.composer}>
              {composerContextNodeId && (
                <div className={styles.focus}>
                  基于：
                  {
                    branch.graph.nodes.find(
                      (node) => node.id === composerContextNodeId,
                    )?.title
                  }
                  <button
                    aria-label="清除研究焦点"
                    onClick={() => { setComposerContextNodeId(null); updateFocus(null); }}
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
              <textarea
                ref={composerRef}
                autoFocus
                aria-label="探索对话输入"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !event.shiftKey &&
                    !event.nativeEvent.isComposing
                  ) {
                    event.preventDefault();
                    void send();
                  }
                }}
                placeholder="输入研究问题，Enter 发送，Shift+Enter 换行"
              />
              <div>
                <small>
                  请求会发送给已配置 Provider；检索会在可用文献来源间自动降级。
                </small>
                {running ? (
                  <Button onClick={() => abortRef.current?.abort()}>
                    取消
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    disabled={!draft.trim()}
                    onClick={() => void send()}
                  >
                    发送
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.detail}>
            {selected ? (
              <>
                <small>{selected.kind}</small>
                <h2>{selected.title}</h2>
                <p>{selected.summary}</p>
                <h3>在研究结构中的位置</h3>
                <p>{selectedParent ? `父节点：${selectedParent.title}` : "这是当前研究的核心问题。"} · {selectedChildren.length} 个直接子节点</p>
                <h3>为什么重要</h3>
                <p>{selected.summary}</p>
                <h3>当前判断</h3>
                {branch.graph.claims.filter((claim) => selected.claimIds.includes(claim.id)).map((claim) => <p key={claim.id}>{claim.text} · {claim.epistemicStatus === "sourced" ? "有证据支持" : "模型归纳"}</p>)}
                <h3>当前证据</h3>
                {selectedEvidence.length ? (
                  selectedEvidence.map(({ evidence, paper }) => (
                    <article key={evidence.id}>
                      <a
                        href={paper!.url}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        {paper!.title}
                      </a>
                      <small>
                        {paper!.authors.slice(0, 3).join(", ")} ·{" "}
                        {paper!.year ?? "年份未知"} ·{" "}
                        {paper!.venue ?? paper!.source}
                      </small>
                      <p>{evidence.paraphrase}</p>
                      <em>
                        {evidence.level === "abstract"
                          ? "摘要可用"
                          : "仅元数据"}
                      </em>
                      {paper!.selectionReasons?.length ? (
                        <small>入选依据：{paper!.selectionReasons.join("；")}</small>
                      ) : null}
                    </article>
                  ))
                ) : (
                  <p>暂无直接文献证据；此节点属于模型归纳或待核查问题。</p>
                )}
                {selectedRelated.length > 0 && <><h3>相关节点</h3><p>{selectedRelated.map((node) => node.title).join("；")}</p></>}
                <Button variant="primary" onClick={continueNode}>
                  基于此节点继续探索
                </Button>
              </>
            ) : (
              <div className={styles.detailEmpty}>
                选择研究地图中的节点查看详情。
              </div>
            )}
          </div>
        )}
      </aside>
      <Button
        className={styles.leftToggle}
        aria-label="折叠探索会话"
        onClick={() => setLeft(!left)}
      >
        <PanelLeftClose size={15} />
      </Button>
      <Button
        className={styles.rightToggle}
        aria-label="折叠右侧面板"
        onClick={() => setRight(!right)}
      >
        <PanelRightClose size={15} />
      </Button>
      <Dialog
        open={providerDialog}
        title="需要配置模型"
        onClose={() => setProviderDialog(false)}
      >
        <p>IdeaScope 需要连接模型 Provider 才能开始研究探索。</p>
        <div className={styles.dialogActions}>
          <Button onClick={() => setProviderDialog(false)}>暂不配置</Button>
          <Button
            variant="primary"
            onClick={() =>
              void navigate("/settings/provider", {
                state: { returnTo: `/workspace/${id}` },
              })
            }
          >
            前往模型设置
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
