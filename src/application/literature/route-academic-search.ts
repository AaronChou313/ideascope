import type { SourceCapabilities } from "../../domain/literature-source/literature-source";
import type { EffectiveResearchProfile } from "../../domain/research-profile/research-profile";
import { academicSearchRequestSchema, type AcademicSearchRequest, type SearchIntent } from "../../domain/search/academic-search";
import type { LiteratureAdapter } from "../../domain/search/literature";
import type { SourceRegistry } from "./literature-source-registry";

type Capability = keyof SourceCapabilities;
const requiredCapability: Record<SearchIntent, Capability> = {
  landscape: "search", representative: "search", recent: "search",
  counterevidence: "search", venue_focused: "venueFilter",
  citation_expand: "citations", reference_expand: "references", direct_lookup: "directLookup",
};

export interface RoutedSource {
  sourceId: string;
  adapter: LiteratureAdapter;
  reasons: string[];
}

export function routeAcademicSearch(
  input: AcademicSearchRequest,
  registry: SourceRegistry,
  effectiveProfile: EffectiveResearchProfile | null,
) {
  const request = academicSearchRequestSchema.parse(input);
  const capability = requiredCapability[request.intent];
  const preferences = new Map(
    (effectiveProfile?.sourcePreferences ?? []).map((item) => [item.sourceId, item.priority]),
  );
  const routed = registry.list().flatMap(({ manifest, installation }, index) => {
    if (!installation.enabled || manifest.adapter.kind === "external-search") return [];
    const state = manifest.capabilities[capability];
    if (state === "unsupported") return [];
    const adapter = registry.getAdapter(manifest.id);
    if (!adapter) return [];
    const preferred = preferences.get(manifest.id) ?? 0;
    return [{
      sourceId: manifest.id,
      adapter,
      score: (state === "supported" ? 1_000 : 100) + preferred,
      index,
      reasons: [
        state === "supported" ? `支持 ${capability}` : `${capability} 能力待验证`,
        ...(preferred ? ["符合当前研究领域来源偏好"] : []),
      ],
    }];
  }).sort((left, right) => right.score - left.score || left.index - right.index);
  return {
    request,
    capability,
    sources: routed.slice(0, request.budget.maxSources).map(({ sourceId, adapter, reasons }) => ({ sourceId, adapter, reasons })),
  };
}
