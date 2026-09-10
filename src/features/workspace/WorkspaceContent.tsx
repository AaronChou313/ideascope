import {
  AlertTriangle,
  Check,
  CircleOff,
  Compass,
  LoaderCircle,
  PauseCircle,
} from "lucide-react";
import type {
  Branch,
  GraphNode,
  WorkspaceExport,
} from "../../../contracts/domain";
import { ResearchMap } from "../graph/ResearchMap";
import styles from "./WorkspaceContent.module.css";
import { SafeRichText } from "../../shared/ui/SafeRichText";

export type WorkspaceSection = "map" | "papers" | "directions";
export type DemoState =
  | "ready"
  | "firstVisit"
  | "loading"
  | "empty"
  | "error"
  | "cancelled"
  | "proposal";

const states = {
  firstVisit: {
    icon: Compass,
    title: "从一个研究问题开始",
    detail: "这是首访演示；输入会先保留在本地，配置模型前不会发起调用。",
  },
  loading: {
    icon: LoaderCircle,
    title: "正在整理演示结构",
    detail: "这是可预览的加载状态，没有发起网络请求。",
  },
  empty: {
    icon: CircleOff,
    title: "这一视图暂时没有内容",
    detail: "零结果不能推断为“无人研究”，可以修改范围后重试。",
  },
  error: {
    icon: AlertTriangle,
    title: "演示请求失败",
    detail: "网络或跨域策略可能阻止访问；现有研究结构没有被修改。",
  },
  cancelled: {
    icon: PauseCircle,
    title: "演示操作已取消",
    detail: "取消后的晚到结果不会写入当前分支。",
  },
} as const;

export function WorkspaceContent({
  section,
  state,
  workspace,
  branch,
  selectedId,
  onSelect,
  onApplyProposal,
  onDismissProposal,
  onDirectionStatus,
}: {
  section: WorkspaceSection;
  state: DemoState;
  workspace: WorkspaceExport;
  branch: Branch;
  selectedId: string | null;
  onSelect: (node: GraphNode) => void;
  onApplyProposal?: () => void;
  onDismissProposal?: () => void;
  onDirectionStatus?: (status: "saved" | "excluded") => void;
}) {
  if (state !== "ready" && state !== "proposal") {
    const item = states[state];
    const Icon = item.icon;
    return (
      <div className={styles.state}>
        <Icon />
        <h2>{item.title}</h2>
        <p>{item.detail}</p>
        <small>演示状态</small>
      </div>
    );
  }
  if (section === "papers")
    return (
      <div className={styles.content}>
        <header>
          <p>SOURCES & EVIDENCE</p>
          <h2>每个判断，都能找到来处。</h2>
          <span>以下是示例文献；没有执行实时检索或全文阅读。</span>
        </header>
        {workspace.workspace.papers.map((paper, index) => {
          const evidence = workspace.workspace.evidence.find(
            (item) => item.paperId === paper.id,
          );
          return (
            <article className={styles.paper} key={paper.id}>
              <b>{String(index + 1).padStart(2, "0")}</b>
              <div>
                <h3>{paper.title}</h3>
                <small>
                  {paper.authors.slice(0, 3).join(", ")} · {paper.year} ·
                  摘要页面
                </small>
                <p><SafeRichText text={evidence?.paraphrase ?? ""} /></p>
                <a href={paper.url} target="_blank" rel="noreferrer noopener">
                  查看公开来源 ↗
                </a>
              </div>
            </article>
          );
        })}
      </div>
    );
  if (section === "directions") {
    const direction = branch.directions[0];
    return (
      <div className={styles.content}>
        <header>
          <p>EMERGING DIRECTION</p>
          <h2>值得继续，而不是仓促定论。</h2>
          <span>示例方向 · 未核查新颖性</span>
        </header>
        {direction ? (
          <article className={styles.direction}>
            <small>探索中</small>
            <h3>{direction.title}</h3>
            <p className={styles.lead}>{direction.researchQuestion}</p>
            <div>
              <section>
                <b>为什么值得追问</b>
                <p>{direction.motivation}</p>
              </section>
              <section>
                <b>已有工作</b>
                <p>{direction.knownWork.join("；")}</p>
              </section>
              <section>
                <b>可能差异 · 待核查</b>
                <p>{direction.possibleDifference}</p>
              </section>
              <section>
                <b>反对证据与限制</b>
                <p>{direction.counterEvidence.join(" ")}</p>
              </section>
              <section>
                <b>尚需查清</b>
                <p>{direction.unresolvedQuestions.join("；")}</p>
              </section>
            </div>
            <footer>
              <button onClick={() => onDirectionStatus?.("saved")}>保存方向</button>
              <button onClick={() => onDirectionStatus?.("excluded")}>排除方向</button>
              <small>当前状态：{direction.status}</small>
            </footer>
          </article>
        ) : (
          <div className={styles.state}>
            <CircleOff />
            <h2>该分支尚无候选方向</h2>
            <p>先回到研究地图继续探索。</p>
          </div>
        )}
      </div>
    );
  }
  return (
    <div className={styles.mapWrap}>
      {state === "proposal" && (
        <div className={styles.proposal}>
          <Check />
          待应用变更：新增 1 个待验证问题。当前图尚未修改。
          <button onClick={onApplyProposal}>应用提案</button>
          <button onClick={onDismissProposal}>暂不应用</button>
        </div>
      )}
      <ResearchMap
        branch={branch}
        selectedId={selectedId}
        onSelect={onSelect}
      />
    </div>
  );
}
