import { SourceRegistry } from "../../application/literature/literature-source-registry";
import type { LiteratureSourceManifest } from "../../domain/literature-source/literature-source";
import { CrossrefLiteratureAdapter } from "./crossref";
import { OpenAlexLiteratureAdapter } from "./openalex";
import { SemanticScholarLiteratureAdapter } from "./semantic-scholar";

const unknownCapabilities = {
  citations: "unknown",
  references: "unknown",
  venueFilter: "unknown",
  authorFilter: "unknown",
  fullText: "unsupported",
  directLookup: "unsupported",
} as const;

export const BUILTIN_LITERATURE_SOURCE_MANIFESTS = [
  {
    documentType: "ideascope.literature-source",
    manifestVersion: 1,
    id: "openalex",
    name: "OpenAlex",
    description: "论文、作者、主题与开放获取元数据；IdeaScope 当前主检索来源。",
    adapter: { kind: "builtin", driver: "openalex" },
    auth: { kind: "none" },
    capabilities: {
      search: "supported", abstract: "supported", yearFilter: "supported",
      ...unknownCapabilities,
    },
    metadata: { homepage: "https://openalex.org", publisher: "OurResearch" },
  },
  {
    documentType: "ideascope.literature-source",
    manifestVersion: 1,
    id: "crossref",
    name: "Crossref",
    description: "DOI 与出版元数据；OpenAlex 不可用时的第一备用来源。",
    adapter: { kind: "builtin", driver: "crossref" },
    auth: { kind: "none" },
    capabilities: {
      search: "supported", abstract: "unknown", yearFilter: "unsupported",
      ...unknownCapabilities,
    },
    metadata: { homepage: "https://www.crossref.org", publisher: "Crossref" },
  },
  {
    documentType: "ideascope.literature-source",
    manifestVersion: 1,
    id: "semantic-scholar",
    name: "Semantic Scholar",
    description: "论文摘要与学术图谱元数据；当前第二备用来源。",
    adapter: { kind: "builtin", driver: "semantic-scholar" },
    auth: { kind: "none" },
    capabilities: {
      search: "supported", abstract: "supported", yearFilter: "unsupported",
      ...unknownCapabilities,
    },
    metadata: { homepage: "https://www.semanticscholar.org", publisher: "Allen Institute for AI" },
  },
] as const satisfies readonly LiteratureSourceManifest[];

export function createBuiltInSourceRegistry(options: {
  fetcher?: typeof fetch;
  disabledSourceIds?: readonly string[];
} = {}) {
  const registry = new SourceRegistry();
  const disabled = new Set(options.disabledSourceIds ?? []);
  const factories: Record<string, () => OpenAlexLiteratureAdapter | CrossrefLiteratureAdapter | SemanticScholarLiteratureAdapter> = {
    openalex: () => new OpenAlexLiteratureAdapter({ fetcher: options.fetcher }),
    crossref: () => new CrossrefLiteratureAdapter({ fetcher: options.fetcher }),
    "semantic-scholar": () => new SemanticScholarLiteratureAdapter({ fetcher: options.fetcher }),
  };
  const now = new Date(0).toISOString();
  for (const manifest of BUILTIN_LITERATURE_SOURCE_MANIFESTS)
    registry.register({
      manifest,
      installation: {
        sourceId: manifest.id,
        enabled: !disabled.has(manifest.id),
        installedAt: now,
        updatedAt: now,
        credentialSlot: null,
      },
      createAdapter: factories[manifest.id]!,
    });
  return registry;
}
