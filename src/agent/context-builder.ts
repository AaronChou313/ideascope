import type { AgentRunContext } from "./types";
export function buildAgentContext(context: AgentRunContext, maxChars: number) {
  const payload = {
    run: {
      runId: context.runId,
      workspaceId: context.workspaceId,
      branchId: context.branchId,
      baseRevision: context.baseRevision,
      promptVersion: context.promptVersion,
    },
    goal: context.userGoal,
    branchSummary: context.branchSummary,
    recentMessages: context.recentMessages.slice(-8),
    availableEvidenceIds: context.availableEvidenceIds,
    focus: context.focus ?? null,
  };
  const text = JSON.stringify(payload);
  return text.length <= maxChars
    ? text
    : JSON.stringify({
        ...payload,
        recentMessages: payload.recentMessages.slice(-2),
        truncated: true,
      }).slice(0, maxChars);
}
