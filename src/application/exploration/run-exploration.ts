import type {
  Branch,
  Claim,
  Evidence,
  GraphEdge,
  GraphNode,
  Message,
  Paper,
  WorkspaceExport,
} from "../../../contracts/domain";
import {
  intentPlanSchema,
  synthesisSchema,
  type IntentPlan,
  type ResearchSynthesis,
} from "../../domain/exploration/exploration-output";
import {
  OpenAlexLiteratureAdapter,
  OPENALEX_FIELDS,
} from "../../infrastructure/literature/openalex";
import { CrossrefLiteratureAdapter } from "../../infrastructure/literature/crossref";
import { SemanticScholarLiteratureAdapter } from "../../infrastructure/literature/semantic-scholar";
import { createAgentProvider } from "../../infrastructure/llm/agent-provider";
import { memoryKeyStore } from "../../infrastructure/secrets/memory-key-store";
import { ProviderProfileRepository } from "../../infrastructure/storage/provider-profile-repository";
import { SearchRecordStore } from "../../infrastructure/storage/evidence-repositories";
import { WorkspaceRepository } from "../../infrastructure/storage/workspace-repository";
import { isProviderGeneration } from "../../agent/provider-adapter";

export type ExplorationProgress = {
  stage:
    | "understanding"
    | "planning"
    | "searching"
    | "synthesizing"
    | "updating"
    | "completed";
  message: string;
  queries?: number;
  candidates?: number;
  tone?: "info" | "warning";
};
export interface ExplorationRunResult {
  workspace: WorkspaceExport;
  queries: number;
  candidates: number;
  evidence: number;
  nodesAdded: number;
  edgesAdded: number;
  warnings: string[];
}

const planInstruction = `你是科研探索助手。只返回 JSON：{"title":"不超过20字的中文会话标题","understanding":"如何理解用户意图","queries":["2至4个适合OpenAlex的英文检索表达"]}。查询应覆盖对象、机制和应用，不要原样复制中文。`;
const synthesisInstruction = `你是严谨的科研综述助手。根据用户目标、已有研究结构和真实 OpenAlex 元数据形成研究认知网络。只返回 JSON，字段为 answer、nodes、edges、nextQuestions、summary。nodes 每项含 kind、title、summary、evidenceIds；只能引用输入中出现的 evidenceId。论文是证据，不是一篇论文一个节点。没有直接证据的归纳 evidenceIds 留空。edges 用 nodes 数组下标 source/target，并给 relation 与中文 label。首次探索形成约6至12个高价值节点；后续只给需要新增或强化的局部节点。不要声称读过全文。`;

function parseJson(value: unknown): unknown {
  const raw = isProviderGeneration(value) ? value.value : value;
  if (typeof raw !== "string") return raw;
  try {
    return JSON.parse(raw.replace(/^```json\s*|\s*```$/g, ""));
  } catch {
    return null;
  }
}
async function generate<T>(
  provider: ReturnType<typeof createAgentProvider>,
  instruction: string,
  payload: unknown,
  schema: { safeParse(value: unknown): { success: boolean; data?: T } },
  signal: AbortSignal,
): Promise<T> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = await provider.generate({
      mode: "json",
      messages: [
        { role: "system", content: instruction },
        { role: "user", content: JSON.stringify(payload) },
      ],
      schemaName: "ideascope_exploration",
      signal,
      repair: attempt > 0,
      jsonInstruction: instruction,
    });
    const parsed = schema.safeParse(parseJson(raw));
    if (parsed.success && parsed.data) return parsed.data;
  }
  throw new Error("模型输出格式不符合研究结构契约；现有研究数据未被覆盖。");
}
function makeEvidence(paper: Paper): Evidence {
  return {
    id: `evidence:${paper.id}`,
    paperId: paper.id,
    level: paper.abstract ? "abstract" : "metadata",
    excerpt: null,
    paraphrase: paper.abstract?.slice(0, 900) ?? `仅元数据：${paper.title}`,
    locator: {
      url: paper.url,
      section: paper.abstract ? "abstract" : "metadata",
    },
    verification: "source_located",
    contentHash: `${paper.id}:${paper.fetchedAt}`,
    fetchedAt: paper.fetchedAt,
  };
}
function activeBranch(workspace: WorkspaceExport) {
  const branch = workspace.workspace.branches.find(
    (item) => item.id === workspace.workspace.activeBranchId,
  );
  if (!branch) throw new Error("当前研究分支不存在。");
  return branch;
}
function likelyShift(text: string) {
  return /不想|兴趣不大|转向|换个方向|改为|instead/i.test(text);
}
function branchForTurn(workspace: WorkspaceExport, text: string): Branch {
  const current = activeBranch(workspace);
  if (!likelyShift(text)) return current;
  const next = structuredClone(current);
  next.id = `branch-${crypto.randomUUID()}`;
  next.title = text.slice(0, 24);
  next.parentBranchId = current.id;
  next.forkedFromRevision = current.revision;
  next.focusNodeId = null;
  workspace.workspace.branches.push(next);
  workspace.workspace.activeBranchId = next.id;
  return next;
}
function applySynthesis(
  branch: Branch,
  synthesis: ResearchSynthesis,
  evidenceIds: Set<string>,
  incremental: boolean,
) {
  const existingTitles = new Set(
    branch.graph.nodes.map((node) => node.title.toLocaleLowerCase()),
  );
  const added: GraphNode[] = [];
  const indexToId = new Map<number, string>();
  synthesis.nodes.forEach((draft, index) => {
    const existing = branch.graph.nodes.find(
      (node) =>
        node.title.toLocaleLowerCase() === draft.title.toLocaleLowerCase(),
    );
    if (existing) {
      indexToId.set(index, existing.id);
      return;
    }
    const id = `node-${crypto.randomUUID()}`;
    const valid = draft.evidenceIds.filter((value) => evidenceIds.has(value));
    const claimId = `claim-${crypto.randomUUID()}`;
    const claim: Claim = {
      id: claimId,
      text: draft.summary,
      epistemicStatus: valid.length ? "sourced" : "inference",
      evidenceLinks: valid.map((evidenceId) => ({
        evidenceId,
        stance: "background",
      })),
      qualifiers: valid.length ? [] : ["模型归纳，待进一步核查"],
      verification: "unreviewed",
    };
    branch.graph.claims.push(claim);
    const node: GraphNode = {
      id,
      kind: draft.kind,
      title: draft.title,
      summary: draft.summary,
      claimIds: [claimId],
      aliases: [],
      locked: false,
      archived: false,
      mergedInto: null,
    };
    branch.graph.nodes.push(node);
    added.push(node);
    indexToId.set(index, id);
    existingTitles.add(draft.title.toLocaleLowerCase());
  });
  let edgeCount = 0;
  for (const draft of synthesis.edges) {
    const source = indexToId.get(draft.source),
      target = indexToId.get(draft.target);
    if (
      !source ||
      !target ||
      source === target ||
      branch.graph.edges.some(
        (edge) => edge.source === source && edge.target === target,
      )
    )
      continue;
    const edge: GraphEdge = {
      id: `edge-${crypto.randomUUID()}`,
      source,
      target,
      relation: draft.relation,
      label: draft.label,
      claimIds: [],
    };
    branch.graph.edges.push(edge);
    edgeCount++;
  }
  branch.summary.understood = [
    ...new Set([...branch.summary.understood, ...synthesis.summary]),
  ].slice(-12);
  branch.summary.openQuestions = synthesis.nextQuestions;
  branch.focusNodeId = added[0]?.id ?? branch.focusNodeId;
  branch.revision += 1;
  return { nodesAdded: added.length, edgesAdded: edgeCount, incremental };
}

export async function runExploration(
  workspaceInput: WorkspaceExport,
  userText: string,
  options: {
    signal: AbortSignal;
    focusNodeId?: string | null;
    onProgress?: (progress: ExplorationProgress) => void;
    fetcher?: typeof fetch;
    providerFetcher?: typeof fetch;
  },
): Promise<ExplorationRunResult> {
  const text = userText.trim();
  if (!text) throw new Error("请输入希望探索的研究问题。");
  const profile = await new ProviderProfileRepository().getActive();
  const key = memoryKeyStore.get();
  if (!profile || !key) throw new Error("需要配置模型");
  const workspace = structuredClone(workspaceInput);
  const branch = branchForTurn(workspace, text);
  const now = new Date().toISOString();
  const userMessage: Message = {
    id: crypto.randomUUID(),
    branchId: branch.id,
    role: "user",
    text,
    evidenceIds: [],
    createdAt: now,
    isDemo: false,
  };
  workspace.workspace.messages.push(userMessage);
  if (!workspace.workspace.seedIdea) workspace.workspace.seedIdea = text;
  await new WorkspaceRepository().save(workspace);
  const provider = createAgentProvider(
    { format: profile.format, baseUrl: profile.baseUrl, model: profile.model },
    () => key,
    false,
    options.providerFetcher,
  );
  options.onProgress?.({ stage: "understanding", message: "正在理解问题" });
  const focus = options.focusNodeId
    ? branch.graph.nodes.find((node) => node.id === options.focusNodeId)
    : undefined;
  const neighborIds = new Set(
    branch.graph.edges.flatMap((edge) =>
      edge.source === focus?.id
        ? [edge.target]
        : edge.target === focus?.id
          ? [edge.source]
          : [],
    ),
  );
  const primaryContext = focus
    ? {
        node: { title: focus.title, kind: focus.kind, summary: focus.summary },
        neighbors: branch.graph.nodes
          .filter((node) => neighborIds.has(node.id))
          .slice(0, 8)
          .map((node) => ({
            title: node.title,
            kind: node.kind,
            summary: node.summary,
          })),
        evidence: branch.graph.claims
          .filter((claim) => focus.claimIds.includes(claim.id))
          .flatMap((claim) => claim.evidenceLinks)
          .map((link) =>
            workspace.workspace.evidence.find(
              (item) => item.id === link.evidenceId,
            ),
          )
          .filter(Boolean)
          .slice(0, 8),
      }
    : null;
  const overallContext = {
    researchSummary: branch.summary,
    scope: branch.scope,
    graphOutline: branch.graph.nodes
      .filter((node) => !node.archived)
      .slice(-30)
      .map((node) => ({
        title: node.title,
        kind: node.kind,
        summary: node.summary,
      })),
    recentConversation: workspace.workspace.messages
      .filter((message) => message.branchId === branch.id)
      .slice(-8)
      .map((message) => ({ role: message.role, text: message.text })),
  };
  options.onProgress?.({ stage: "planning", message: "正在制定检索策略" });
  const plan = await generate<IntentPlan>(
    provider,
    planInstruction,
    {
      goal: text,
      primaryContext,
      overallContext,
    },
    intentPlanSchema,
    options.signal,
  );
  if (workspace.workspace.title === "未命名探索")
    workspace.workspace.title = plan.title || text.slice(0, 24);
  const adapter = new OpenAlexLiteratureAdapter({ fetcher: options.fetcher });
  const fallbackAdapter = new CrossrefLiteratureAdapter({
    fetcher: options.fetcher,
  });
  const semanticScholarAdapter = new SemanticScholarLiteratureAdapter({
    fetcher: options.fetcher,
  });
  const papers: Paper[] = [];
  const warnings: string[] = [];
  options.onProgress?.({
    stage: "searching",
    message: `正在检索 ${plan.queries.length} 组文献`,
    queries: plan.queries.length,
    candidates: 0,
  });
  for (const query of plan.queries) {
    if (options.signal.aborted) throw new DOMException("已取消", "AbortError");
    const result = await adapter.search(
      {
        originalIdea: text,
        keywords: query,
        language: "en",
        rationale: plan.understanding,
      },
      { limit: 8, maxPages: 1, fields: OPENALEX_FIELDS },
      options.signal,
    );
    await new SearchRecordStore().save(result.record);
    if (result.record.status === "cancelled")
      throw new DOMException("已取消", "AbortError");
    for (const paper of result.papers)
      if (
        !papers.some((item) => item.id === paper.id) &&
        !workspace.workspace.papers.some((item) => item.id === paper.id)
      )
        papers.push(paper);
    if (
      result.record.status !== "completed" &&
      result.record.status !== "empty"
    ) {
      const warning =
        result.record.status === "rate_limited"
          ? "OpenAlex 暂时限流，已保留此前找到的资料并继续整理。"
          : `OpenAlex 本轮检索未完成（${result.record.status}），已保留此前找到的资料。`;
      warnings.push(warning);
      options.onProgress?.({
        stage: "searching",
        message: warning,
        queries: plan.queries.length,
        candidates: papers.length,
        tone: "warning",
      });
      if (result.record.status === "rate_limited") break;
      continue;
    }
    options.onProgress?.({
      stage: "searching",
      message: `已找到 ${papers.length} 条候选资料`,
      queries: plan.queries.length,
      candidates: papers.length,
    });
  }
  if (warnings.length) {
    for (const source of [fallbackAdapter, semanticScholarAdapter]) {
      const label =
        source.source === "crossref" ? "Crossref" : "Semantic Scholar";
      options.onProgress?.({
        stage: "searching",
        message: `正在尝试 ${label} 补充来源`,
        queries: plan.queries.length,
        candidates: papers.length,
      });
      const fallback = await source.search(
        {
          originalIdea: text,
          keywords: plan.queries[0]!,
          language: "en",
          rationale: plan.understanding,
        },
        { limit: 8, maxPages: 1, fields: [] },
        options.signal,
      );
      await new SearchRecordStore().save(fallback.record);
      for (const paper of fallback.papers)
        if (
          !papers.some((item) => item.id === paper.id) &&
          !workspace.workspace.papers.some((item) => item.id === paper.id)
        )
          papers.push(paper);
      if (fallback.record.status === "completed")
        options.onProgress?.({
          stage: "searching",
          message: `${label} 补充后共有 ${papers.length} 条候选资料`,
          queries: plan.queries.length,
          candidates: papers.length,
        });
      if (papers.length >= 8) break;
    }
  }
  if (!papers.length && warnings.length)
    throw new Error(
      "文献来源本轮不可用，且尚未取得可供分析的资料。请稍后重试；研究想法和已有数据未丢失。",
    );
  workspace.workspace.papers.push(...papers);
  const evidence = papers.map(makeEvidence);
  workspace.workspace.evidence.push(...evidence);
  const allEvidence = new Set(
    workspace.workspace.evidence.map((item) => item.id),
  );
  options.onProgress?.({
    stage: "synthesizing",
    message: `正在整理 ${papers.length} 条候选资料`,
    queries: plan.queries.length,
    candidates: papers.length,
  });
  const synthesis = await generate<ResearchSynthesis>(
    provider,
    synthesisInstruction,
    {
      goal: text,
      understanding: plan.understanding,
      primaryContext,
      overallContext,
      existingGraph: {
        nodes: branch.graph.nodes.slice(-30).map((node) => ({
          title: node.title,
          kind: node.kind,
          summary: node.summary,
        })),
        summary: branch.summary,
      },
      sources: workspace.workspace.papers.slice(-20).map((paper) => ({
        evidenceId: `evidence:${paper.id}`,
        title: paper.title,
        authors: paper.authors.slice(0, 3),
        year: paper.year,
        venue: paper.venue,
        abstract: paper.abstract?.slice(0, 900) ?? null,
        url: paper.url,
      })),
    },
    synthesisSchema,
    options.signal,
  );
  options.onProgress?.({ stage: "updating", message: "正在更新研究地图" });
  const counts = applySynthesis(
    branch,
    synthesis,
    allEvidence,
    branch.graph.nodes.length > 0,
  );
  branch.scope.object = branch.scope.object || text;
  branch.scope.question = text;
  const limitation = warnings.length
    ? `\n\n检索说明：${warnings.join(" ")}`
    : "";
  const assistant: Message = {
    id: crypto.randomUUID(),
    branchId: branch.id,
    role: "assistant",
    text: `${synthesis.answer}${limitation}\n\n接下来可以继续：${synthesis.nextQuestions.join("；")}`,
    evidenceIds: [
      ...new Set(
        synthesis.nodes
          .flatMap((node) => node.evidenceIds)
          .filter((id) => allEvidence.has(id)),
      ),
    ],
    createdAt: new Date().toISOString(),
    isDemo: false,
  };
  workspace.workspace.messages.push(assistant);
  workspace.workspace.activeBranchId = branch.id;
  const saved = await new WorkspaceRepository().save(workspace);
  if (saved.status !== "saved") throw new Error(saved.message);
  options.onProgress?.({
    stage: "completed",
    message: warnings.length
      ? "研究地图已更新（部分检索受限）"
      : "研究地图已更新",
    queries: plan.queries.length,
    candidates: papers.length,
    tone: warnings.length ? "warning" : "info",
  });
  return {
    workspace,
    queries: plan.queries.length,
    candidates: papers.length,
    evidence: evidence.length,
    ...counts,
    warnings,
  };
}
