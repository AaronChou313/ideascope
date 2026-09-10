import type { AgentBudget } from "./types";
export const DEFAULT_AGENT_BUDGET: AgentBudget = {
  maxModelCalls: 6,
  maxToolCalls: 8,
  maxSearchQueries: 4,
  maxCandidates: 60,
  maxContextChars: 24_000,
};
export class BudgetCounter {
  modelCalls = 0;
  toolCalls = 0;
  searchQueries = 0;
  candidates = 0;
  constructor(readonly limits: AgentBudget = DEFAULT_AGENT_BUDGET) {}
  reset() {
    this.modelCalls = 0;
    this.toolCalls = 0;
    this.searchQueries = 0;
    this.candidates = 0;
  }
  takeModel() {
    if (this.modelCalls >= this.limits.maxModelCalls) return false;
    this.modelCalls += 1;
    return true;
  }
  takeSearch(limit: number) {
    if (
      this.toolCalls >= this.limits.maxToolCalls ||
      this.searchQueries >= this.limits.maxSearchQueries ||
      this.candidates >= this.limits.maxCandidates
    )
      return 0;
    this.toolCalls += 1;
    this.searchQueries += 1;
    return Math.min(limit, this.limits.maxCandidates - this.candidates);
  }
  addCandidates(count: number) {
    this.candidates = Math.min(
      this.limits.maxCandidates,
      this.candidates + Math.max(0, count),
    );
  }
}
