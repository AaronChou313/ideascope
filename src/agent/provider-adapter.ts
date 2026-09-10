export interface ProviderRequest {
  mode: "structured" | "json";
  messages: Array<{ role: "system" | "user"; content: string }>;
  schemaName: string;
  signal: AbortSignal;
  repair?: boolean;
}
export interface ProviderAdapter {
  readonly structuredOutput: boolean;
  generate(request: ProviderRequest): Promise<unknown>;
}
export interface ProviderUsage {
  inputTokens: number | null;
  outputTokens: number | null;
  source: "reported" | "estimated" | "unknown";
}
export interface ProviderGeneration {
  value: unknown;
  usage: ProviderUsage;
}
export function isProviderGeneration(value: unknown): value is ProviderGeneration {
  return typeof value === "object" && value !== null && "value" in value && "usage" in value;
}
