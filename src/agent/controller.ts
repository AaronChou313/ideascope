import {
  agentOutputSchema,
  type AgentOutput,
  type AgentRunContext,
  type AgentState,
} from "./types";
import type { ProviderAdapter } from "./provider-adapter";
import { BudgetCounter, DEFAULT_AGENT_BUDGET } from "./budget";
import { buildAgentContext } from "./context-builder";

export interface AgentTools {
  searchLiterature(
    args: { query: string; limit: number },
    signal: AbortSignal,
  ): Promise<{ paperIds: string[]; evidenceIds: string[]; summary: string }>;
}
export interface AgentRunResult {
  state: AgentState;
  output: AgentOutput | null;
  states: AgentState[];
  usage: {
    modelCalls: number;
    toolCalls: number;
    searchQueries: number;
    candidates: number;
  };
  error: string | null;
}

export class AgentController {
  constructor(
    private readonly provider: ProviderAdapter,
    private readonly tools: AgentTools,
    private readonly systemPrompt: string,
    private readonly budget = new BudgetCounter(DEFAULT_AGENT_BUDGET),
  ) {}
  async run(
    context: AgentRunContext,
    signal: AbortSignal,
  ): Promise<AgentRunResult> {
    this.budget.reset();
    const states: AgentState[] = ["idle"];
    const allowedEvidenceIds = new Set(context.availableEvidenceIds);
    const move = (state: AgentState) => {
      states.push(state);
    };
    try {
      move("framing");
      const assembled = buildAgentContext(
        context,
        this.budget.limits.maxContextChars,
      );
      move("planning");
      let output = await this.generate(assembled, signal);
      if (!output)
        return this.result("failed", null, states, "模型输出未通过严格校验。");
      if (output.toolRequest) {
        const limit = this.budget.takeSearch(
          output.toolRequest.arguments.limit,
        );
        if (!limit)
          return this.result(
            "budget_exhausted",
            null,
            states,
            "工具预算已耗尽。",
          );
        move("searching");
        const found = await this.tools.searchLiterature(
          { ...output.toolRequest.arguments, limit },
          signal,
        );
        this.budget.addCandidates(found.paperIds.length);
        found.evidenceIds.forEach((id) => allowedEvidenceIds.add(id));
        if (signal.aborted) return this.result("cancelled", null, states, null);
        move("synthesizing");
        output = await this.generate(
          `${assembled}\nUNTRUSTED_SEARCH_DATA:${JSON.stringify(found)}`,
          signal,
        );
        if (!output)
          return this.result(
            "failed",
            null,
            states,
            "综合输出未通过严格校验。",
          );
      }
      move("validating");
      if (output.evidenceIds.some((id) => !allowedEvidenceIds.has(id)))
        return this.result(
          "failed",
          null,
          states,
          "输出引用了当前上下文不可见的 Evidence ID。",
        );
      move("completed");
      return this.result("completed", output, states, null);
    } catch (error) {
      if (signal.aborted) return this.result("cancelled", null, states, null);
      return this.result(
        "failed",
        null,
        states,
        error instanceof Error ? error.message : "未知错误",
      );
    }
  }
  private async generate(context: string, signal: AbortSignal) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      if (!this.budget.takeModel()) return null;
      const raw = await this.provider.generate({
        mode: this.provider.structuredOutput ? "structured" : "json",
        messages: [
          { role: "system", content: this.systemPrompt },
          { role: "user", content: context },
        ],
        schemaName: "ideascope_agent_output",
        signal,
        ...(attempt ? { repair: true } : {}),
      });
      const value = typeof raw === "string" ? safeJson(raw) : raw;
      const parsed = agentOutputSchema.safeParse(value);
      if (parsed.success) return parsed.data;
    }
    return null;
  }
  private result(
    state: AgentState,
    output: AgentOutput | null,
    states: AgentState[],
    error: string | null,
  ): AgentRunResult {
    return {
      state,
      output,
      states,
      usage: {
        modelCalls: this.budget.modelCalls,
        toolCalls: this.budget.toolCalls,
        searchQueries: this.budget.searchQueries,
        candidates: this.budget.candidates,
      },
      error,
    };
  }
}
function safeJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
