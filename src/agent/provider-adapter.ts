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
