export type CapabilityState = 'supported' | 'unsupported' | 'unknown';
export type ProbeCapability = 'completion' | 'streaming' | 'structuredOutput' | 'toolCalling' | 'cancellation';

export interface ProviderConfig {
  baseUrl: string;
  model: string;
}

export interface ProbeResult {
  capability: ProbeCapability;
  state: CapabilityState;
  detail: string;
  usageReporting: CapabilityState;
}
