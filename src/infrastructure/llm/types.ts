export type CapabilityState = 'supported' | 'unsupported' | 'unknown';
export type ProbeCapability = 'completion' | 'streaming' | 'structuredOutput' | 'toolCalling' | 'cancellation';
export type ProviderFormat = 'openai-chat' | 'openai-responses' | 'anthropic-messages';

export interface ProviderConfig {
  format?: ProviderFormat;
  baseUrl: string;
  model: string;
}

export interface ProbeResult {
  capability: ProbeCapability;
  state: CapabilityState;
  detail: string;
  usageReporting: CapabilityState;
}
