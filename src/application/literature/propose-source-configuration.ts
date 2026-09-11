import type { ProviderAdapter } from "../../agent/provider-adapter";
import { isProviderGeneration } from "../../agent/provider-adapter";
import { sourceAssistantProposalSchema } from "../../domain/literature-source/source-assistant-proposal";
import type { LiteratureSourceManifest } from "../../domain/literature-source/literature-source";

const instruction = `你是 IdeaScope 文献来源配置助手。只返回 JSON。优先推荐输入中已有的 built-in 来源；明确指出所需 API Key。当前没有官方 API 文档内容，因此不得臆造 endpoint、认证方式、字段 mapping 或 custom manifest。recommendations 每项只能包含 action、sourceId、reason、missingInputs。action 使用 use_builtin、configure_builtin 或 external_search_only。只引用 builtins 中真实存在的 sourceId。`;

export async function proposeSourceConfiguration(options: {
  requirement: string;
  manifests: readonly LiteratureSourceManifest[];
  provider: ProviderAdapter;
  signal: AbortSignal;
}) {
  const requirement = options.requirement.trim();
  if (!requirement) throw new Error("请先描述你的研究领域和希望覆盖的来源。");
  const builtins = options.manifests.map((manifest) => ({
    id: manifest.id, name: manifest.name, description: manifest.description,
    auth: manifest.auth.kind, adapter: manifest.adapter.kind, capabilities: manifest.capabilities,
  }));
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const output = await options.provider.generate({
      mode: "json", schemaName: "ideascope_source_assistant_proposal",
      messages: [
        { role: "system", content: instruction },
        { role: "user", content: JSON.stringify({ requirement, builtins }) },
      ],
      signal: options.signal, repair: attempt > 0,
    });
    const raw = isProviderGeneration(output) ? output.value : output;
    let parsed: unknown = raw;
    if (typeof raw === "string") {
      try { parsed = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, "")); }
      catch { parsed = null; }
    }
    const proposal = sourceAssistantProposalSchema.safeParse(parsed);
    if (!proposal.success) continue;
    const known = new Set(options.manifests.map((manifest) => manifest.id));
    if (proposal.data.recommendations.some((item) => !item.sourceId || !known.has(item.sourceId))) continue;
    return proposal.data;
  }
  throw new Error("模型返回的来源建议未通过安全校验，请重试。");
}
