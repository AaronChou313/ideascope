import { z } from "zod";
import type { CapabilityState } from "../../infrastructure/llm/types";

export const providerDraftSchema = z.object({
  name: z.string().trim().min(1, "Provider 名称不能为空。").max(80),
  providerType: z.enum(["openai", "deepseek", "anthropic", "custom"]),
  format: z.enum(["openai-chat", "openai-responses", "anthropic-messages"]),
  baseUrl: z.url("Base URL 格式无效。"),
  model: z.string().trim().min(1, "Model ID 不能为空。").max(160),
});

export type ProviderDraft = z.infer<typeof providerDraftSchema>;
export interface SavedProviderProfile extends ProviderDraft {
  id: string;
  active: boolean;
  lastTestState: CapabilityState;
  lastTestedAt: string | null;
  updatedAt: string;
  webSearchState?: CapabilityState;
}

export function providerWebSearchGate(profile: SavedProviderProfile | null, independentWebSearchReady = false) {
  if (independentWebSearchReady) return { allowed: true, reason: "已配置独立且可用的 Web Search Source。" };
  if (profile?.webSearchState === "supported") return { allowed: true, reason: "当前 Model Provider 已明确验证 Web Search 能力。" };
  return {
    allowed: false,
    reason: profile
      ? "当前 Model Provider 未明确验证 Web Search 能力。请粘贴官方 API 文档或导入外部生成的 Manifest。"
      : "尚未配置 Model Provider。请粘贴官方 API 文档或导入外部生成的 Manifest。",
  };
}

export const defaultProviderDraft: ProviderDraft = {
  name: "OpenAI",
  providerType: "openai",
  format: "openai-chat",
  baseUrl: "https://api.openai.com/v1",
  model: "",
};
