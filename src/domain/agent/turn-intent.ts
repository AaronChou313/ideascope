export type TurnIntent = "explain" | "explore" | "adjust_scope" | "create_branch";

export function classifyTurnIntent(text: string): TurnIntent {
  const value = text.trim().toLowerCase();
  if (/新分支|另开|fork|branch/.test(value)) return "create_branch";
  if (/调整.*范围|缩小范围|扩大范围|改成研究|scope/.test(value)) return "adjust_scope";
  if (/继续找|检索|扩展|新增|探索|相关研究|evidence|paper/.test(value)) return "explore";
  return "explain";
}

export function intentAllowsGraphPatch(intent: TurnIntent) {
  return intent !== "explain";
}
