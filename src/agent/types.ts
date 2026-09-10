import { z } from "zod";

export const searchToolArgumentsSchema = z
  .object({
    query: z.string().min(2).max(1000),
    limit: z.number().int().min(1).max(60),
  })
  .strict();
export const agentOutputSchema = z
  .object({
    answer: z.string().min(1),
    evidenceIds: z.array(z.string()).max(20),
    limitations: z.array(z.string()).max(8),
    nextQuestions: z.array(z.string()).max(3),
    toolRequest: z
      .object({
        name: z.literal("search_literature"),
        arguments: searchToolArgumentsSchema,
      })
      .strict()
      .nullable(),
  })
  .strict();
export type AgentOutput = z.infer<typeof agentOutputSchema>;
export type AgentState =
  | "idle"
  | "framing"
  | "planning"
  | "searching"
  | "synthesizing"
  | "validating"
  | "proposal_ready"
  | "completed"
  | "cancelling"
  | "cancelled"
  | "failed"
  | "budget_exhausted"
  | "interrupted";
export interface AgentRunContext {
  runId: string;
  workspaceId: string;
  branchId: string;
  baseRevision: number;
  promptVersion: string;
  userGoal: string;
  branchSummary: string[];
  recentMessages: Array<{ role: "user" | "assistant"; text: string }>;
  availableEvidenceIds: string[];
  focus?: {
    nodeId: string;
    title: string;
    summary: string;
    neighborIds: string[];
    claimIds: string[];
  };
}
export interface AgentBudget {
  maxModelCalls: number;
  maxToolCalls: number;
  maxSearchQueries: number;
  maxCandidates: number;
  maxContextChars: number;
}
