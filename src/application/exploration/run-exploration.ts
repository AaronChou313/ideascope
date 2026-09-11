import type {
  Branch,
  Evidence,
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
import { createConfiguredSourceRegistry } from "../../infrastructure/literature/configured-source-registry";
import type { SourceRegistry } from "../literature/literature-source-registry";
import { createAgentProvider } from "../../infrastructure/llm/agent-provider";
import { memoryKeyStore } from "../../infrastructure/secrets/memory-key-store";
import { ProviderProfileRepository } from "../../infrastructure/storage/provider-profile-repository";
import { SearchRecordStore } from "../../infrastructure/storage/evidence-repositories";
import { WorkspaceRepository } from "../../infrastructure/storage/workspace-repository";
import { isProviderGeneration } from "../../agent/provider-adapter";
import { applyExplorationSynthesis, ensureRootNode } from "../../domain/exploration/apply-exploration-synthesis";
import { applySessionProfilePatch, mergeResearchProfiles } from "../../domain/research-profile/research-profile";
import { ResearchProfileRepository } from "../../infrastructure/storage/research-profile-repository";
import { inferSearchIntent } from "../../domain/search/academic-search";
import { searchAcademic } from "../literature/search-academic";

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

const planInstruction = `你是科研探索助手。只返回 JSON：{"title":"不超过20字的中文会话标题","understanding":"如何理解用户意图","queries":["2至4个英文检索表达"],"profilePatch":{"patchVersion":1,"targetProfileId":"必须原样使用输入的sessionProfileId","operations":[]}}。profilePatch 只增量描述当前探索的 domain、subfield、concept、query alias、venue signal、source hint，不得修改长期 Base Profile；操作必须使用给定契约。查询应覆盖对象、机制和应用，不要原样复制中文。`;
const synthesisInstruction = `你是严谨的科研综述助手。只返回 JSON：answer、nodes、crossLinks、nextQuestions、summary。Root 已由系统创建，不能生成 Root。nodes 每项为 {tempId,parentRef,existingNodeId?,kind,title,summary,evidenceIds,aliases?}。首次探索：识别 3–5 条主要路线，parentRef 为 ROOT；必要时每条再展开 0–2 个子节点，parentRef 只能引用一级路线的 tempId，首次最多到 depth 2，总计 6–12 个。基于节点继续：只扩展 anchor 局部，新节点默认挂在 anchorId 或本轮节点下，不得无故新增 Root 路线。existingGraph 提供真实 ID；已有概念应通过 existingNodeId 更新，不要重复新增。crossLinks 只表达少量跨分支关系，每项 {sourceRef,targetRef,relation}，最多 5 条。论文是 Evidence，不是一篇论文一个节点；只能引用输入出现的 evidenceId；没有直接证据则留空。不要声称读过全文。`;

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
export async function runExploration(
  workspaceInput: WorkspaceExport,
  userText: string,
  options: {
    signal: AbortSignal;
    contextNodeId?: string | null;
    onProgress?: (progress: ExplorationProgress) => void;
    fetcher?: typeof fetch;
    providerFetcher?: typeof fetch;
    literatureRegistry?: SourceRegistry;
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
  const focus = options.contextNodeId
    ? branch.graph.nodes.find((node) => node.id === options.contextNodeId)
    : undefined;
  const profileRepository = new ResearchProfileRepository();
  let sessionProfile = await profileRepository.getOrCreateSession(workspace.workspace.id);
  const baseProfile = await profileRepository.getActiveBase();
  const neighborIds = new Set(branch.graph.edges.flatMap((edge) => edge.source === focus?.id || edge.target === focus?.id ? [edge.source, edge.target] : []));
  if (focus?.parentId) neighborIds.add(focus.parentId);
  for (const node of branch.graph.nodes) if (node.parentId === focus?.id) neighborIds.add(node.id);
  const primaryContext = focus
    ? {
        anchorId: focus.id,
        node: { id: focus.id, title: focus.title, kind: focus.kind, summary: focus.summary, parentId: focus.parentId, depth: focus.depth },
        neighbors: branch.graph.nodes
          .filter((node) => neighborIds.has(node.id))
          .slice(0, 8)
          .map((node) => ({
            id: node.id, title: node.title,
            kind: node.kind,
            summary: node.summary,
            parentId: node.parentId, depth: node.depth,
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
        id: node.id, title: node.title,
        kind: node.kind,
        summary: node.summary,
        parentId: node.parentId, depth: node.depth,
      })),
    recentConversation: workspace.workspace.messages
      .filter((message) => message.branchId === branch.id)
      .slice(-8)
      .map((message) => ({ role: message.role, text: message.text })),
    effectiveProfile: mergeResearchProfiles(
      baseProfile ? [baseProfile] : [],
      sessionProfile,
      focus ? [focus.title, ...focus.aliases] : [],
    ),
  };
  options.onProgress?.({ stage: "planning", message: "正在制定检索策略" });
  const plan = await generate<IntentPlan>(
    provider,
    planInstruction,
    {
      goal: text,
      sessionProfileId: sessionProfile.id,
      primaryContext,
      overallContext,
    },
    intentPlanSchema,
    options.signal,
  );
  let profileWarning: string | null = null;
  try {
    const profilePatch = plan.profilePatch.targetProfileId === "SESSION"
      ? { ...plan.profilePatch, targetProfileId: sessionProfile.id }
      : plan.profilePatch;
    sessionProfile = applySessionProfilePatch(sessionProfile, profilePatch);
    await profileRepository.save(sessionProfile);
    overallContext.effectiveProfile = mergeResearchProfiles(
      baseProfile ? [baseProfile] : [],
      sessionProfile,
      focus ? [focus.title, ...focus.aliases] : [],
    );
  } catch {
    profileWarning = "本轮研究领域配置未能安全更新，已继续使用之前的配置。";
  }
  if (workspace.workspace.title === "未命名探索")
    workspace.workspace.title = plan.title || text.slice(0, 24);
  const root = ensureRootNode(branch, plan.title || text.slice(0, 40), plan.understanding);
  const sourceRegistry =
    options.literatureRegistry ??
    (await createConfiguredSourceRegistry({ fetcher: options.fetcher }));
  const searchRequests = plan.queries.map((query) => ({
      requestVersion: 1,
      userQuestion: text,
      query,
      intent: inferSearchIntent(text, Boolean(focus)),
      budget: { maxSources: 4, maxQueries: plan.queries.length, maxCandidates: 32 },
    }) as const);
  const sourceName = (sourceId: string) =>
    sourceRegistry.list().find((entry) => entry.manifest.id === sourceId)?.manifest.name ?? sourceId;
  const warnings: string[] = [];
  if (profileWarning) warnings.push(profileWarning);
  options.onProgress?.({
    stage: "searching",
    message: `正在检索 ${plan.queries.length} 组文献`,
    queries: plan.queries.length,
    candidates: 0,
  });
  const searched = await searchAcademic({
    requests: searchRequests,
    registry: sourceRegistry,
    effectiveProfile: overallContext.effectiveProfile,
    signal: options.signal,
    onRecord: async (record) => { await new SearchRecordStore().save(record); },
  });
  const existingPaperIds = new Set(workspace.workspace.papers.map((paper) => paper.id));
  const papers: Paper[] = searched.papers.filter((paper) => !existingPaperIds.has(paper.id));
  for (const failure of searched.trace.failures) {
    const warning = failure.status === "rate_limited"
      ? `${sourceName(failure.sourceId)} 暂时限流，其他来源结果已保留。`
      : `${sourceName(failure.sourceId)} 本轮检索未完成（${failure.status}），其他来源结果已保留。`;
    warnings.push(warning);
    options.onProgress?.({ stage: "searching", message: warning, queries: searched.trace.queries, candidates: papers.length, tone: "warning" });
  }
  options.onProgress?.({
    stage: "searching",
    message: `已从 ${searched.trace.sources.length} 个来源取得 ${searched.trace.candidates} 条候选资料，去重后保留 ${papers.length} 条`,
    queries: searched.trace.queries,
    candidates: papers.length,
  });
  if (!papers.length && warnings.length && !workspace.workspace.papers.length)
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
          id: node.id, title: node.title,
          kind: node.kind,
          summary: node.summary,
          parentId: node.parentId, depth: node.depth,
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
  const counts = applyExplorationSynthesis(workspace, branch, synthesis, focus?.id ?? null);
  branch.focusNodeId = focus?.id ?? branch.focusNodeId ?? root.id;
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
