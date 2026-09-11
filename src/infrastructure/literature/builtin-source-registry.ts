import { SourceRegistry } from "../../application/literature/literature-source-registry";
import type { LiteratureSourceManifest } from "../../domain/literature-source/literature-source";
import type { LiteratureAdapter } from "../../domain/search/literature";
import { CrossrefLiteratureAdapter } from "./crossref";
import { ArxivLiteratureAdapter } from "./arxiv";
import { IeeeXploreLiteratureAdapter } from "./ieee-xplore";
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
  {
    documentType: "ideascope.literature-source",
    manifestVersion: 1,
    id: "arxiv",
    name: "arXiv",
    description: "开放预印本元数据与摘要；适合补充近期研究。",
    adapter: { kind: "builtin", driver: "arxiv" },
    auth: { kind: "none" },
    capabilities: {
      search: "supported", abstract: "supported", yearFilter: "unsupported",
      ...unknownCapabilities,
    },
    metadata: { homepage: "https://arxiv.org", publisher: "Cornell University" },
  },
  {
    documentType: "ideascope.literature-source",
    manifestVersion: 1,
    id: "ieee-xplore",
    name: "IEEE Xplore",
    description: "IEEE 出版物检索；需要用户提供 IEEE Xplore API Key。",
    adapter: { kind: "builtin", driver: "ieee-xplore" },
    auth: { kind: "query-param", credentialSlot: "ieee-xplore.api-key", queryParamName: "apikey" },
    capabilities: {
      search: "supported", abstract: "supported", yearFilter: "unknown",
      ...unknownCapabilities,
    },
    metadata: { homepage: "https://ieeexplore.ieee.org", documentation: "https://developer.ieee.org", publisher: "IEEE" },
  },
  {
    documentType: "ideascope.literature-source",
    manifestVersion: 1,
    id: "google-scholar",
    name: "Google Scholar",
    description: "在 Google Scholar 中手动搜索；IdeaScope 不自动抓取。",
    adapter: { kind: "external-search", urlTemplate: "https://scholar.google.com/scholar?q={query}" },
    auth: { kind: "none" },
    capabilities: {
      search: "unsupported", abstract: "unknown", yearFilter: "unsupported",
      ...unknownCapabilities,
    },
    metadata: { homepage: "https://scholar.google.com", publisher: "Google" },
  },
] as const satisfies readonly LiteratureSourceManifest[];

export function createBuiltInSourceRegistry(options: {
  fetcher?: typeof fetch;
  disabledSourceIds?: readonly string[];
  getCredential?: (slot: string) => string | null;
} = {}) {
  const registry = new SourceRegistry();
  const disabled = new Set(options.disabledSourceIds ?? []);
  const factories: Partial<Record<string, () => LiteratureAdapter>> = {
    openalex: () => new OpenAlexLiteratureAdapter({ fetcher: options.fetcher }),
    crossref: () => new CrossrefLiteratureAdapter({ fetcher: options.fetcher }),
    "semantic-scholar": () => new SemanticScholarLiteratureAdapter({ fetcher: options.fetcher }),
    arxiv: () => new ArxivLiteratureAdapter({ fetcher: options.fetcher }),
    "ieee-xplore": () => new IeeeXploreLiteratureAdapter({
      fetcher: options.fetcher,
      getApiKey: () => options.getCredential?.("ieee-xplore.api-key") ?? null,
    }),
  };
  const now = new Date(0).toISOString();
  for (const manifest of BUILTIN_LITERATURE_SOURCE_MANIFESTS)
    registry.register({
      manifest,
      installation: {
        sourceId: manifest.id,
        enabled:
          !disabled.has(manifest.id) &&
          (manifest.id !== "ieee-xplore" || Boolean(options.getCredential?.("ieee-xplore.api-key"))),
        installedAt: now,
        updatedAt: now,
        credentialSlot: null,
      },
      createAdapter: factories[manifest.id],
    });
  return registry;
}

export function buildExternalSourceSearchUrl(sourceId: string, query: string) {
  const manifest = BUILTIN_LITERATURE_SOURCE_MANIFESTS.find((item) => item.id === sourceId);
  if (manifest?.adapter.kind !== "external-search") return null;
  return manifest.adapter.urlTemplate.replace("{query}", encodeURIComponent(query.trim()));
}
