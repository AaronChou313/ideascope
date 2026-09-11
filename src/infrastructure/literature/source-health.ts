import type { LiteratureSourceManifest } from "../../domain/literature-source/literature-source";
import { IeeeXploreLiteratureAdapter } from "./ieee-xplore";
import { probeOpenAlex } from "./openalex-probe";
import { classifyResponse } from "../network/errors";
import { RestJsonLiteratureAdapter } from "./rest-json";

export type SourceHealth = "available" | "unconfigured" | "external";

export async function probeLiteratureSource(
  manifest: LiteratureSourceManifest,
  signal: AbortSignal,
  options: { fetcher?: typeof fetch; getCredential?: (slot: string) => string | null } = {},
): Promise<SourceHealth> {
  const fetcher = options.fetcher ?? fetch;
  if (manifest.adapter.kind === "external-search") return "external";
  if (manifest.id === "openalex") {
    await probeOpenAlex(signal, fetcher);
    return "available";
  }
  if (manifest.id === "ieee-xplore") {
    const slot = manifest.auth.credentialSlot;
    if (!slot || !options.getCredential?.(slot)) return "unconfigured";
    const result = await new IeeeXploreLiteratureAdapter({
      fetcher,
      getApiKey: () => options.getCredential?.(slot) ?? null,
    }).search(
      { originalIdea: "IEEE health check", keywords: "robotics", language: "en", rationale: "Minimal source health check" },
      { limit: 1, maxPages: 1, fields: [] },
      signal,
    );
    if (result.record.status !== "completed" && result.record.status !== "empty")
      throw new Error(result.record.status);
    return "available";
  }
  if (manifest.adapter.kind === "rest-json") {
    const result = await new RestJsonLiteratureAdapter(manifest, { fetcher, getCredential: options.getCredential }).search(
      { originalIdea: "Custom source health check", keywords: "test", language: "en", rationale: "Minimal source health check" },
      { limit: 1, maxPages: 1, fields: [] }, signal,
    );
    if (result.record.status === "source_unavailable" && manifest.auth.kind !== "none" && !options.getCredential?.(manifest.auth.credentialSlot!)) return "unconfigured";
    if (!["completed", "empty"].includes(result.record.status)) throw new Error(result.record.status);
    return "available";
  }
  const url = healthUrl(manifest.id);
  if (!url) throw new Error("unsupported_health_probe");
  const response = await fetcher(url, {
    signal,
    headers: { Accept: manifest.id === "arxiv" ? "application/atom+xml" : "application/json" },
  });
  if (!response.ok) throw classifyResponse(response.status);
  return "available";
}

function healthUrl(sourceId: string) {
  if (sourceId === "crossref") return "https://api.crossref.org/works?rows=0";
  if (sourceId === "semantic-scholar")
    return "https://api.semanticscholar.org/graph/v1/paper/search?query=health-check&limit=1&fields=title";
  if (sourceId === "arxiv")
    return "https://export.arxiv.org/api/query?search_query=all%3Arobotics&start=0&max_results=1";
  return null;
}
