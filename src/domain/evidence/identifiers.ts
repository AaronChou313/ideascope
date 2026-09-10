import type { Paper } from "../../../contracts/domain";

export function normalizeDoi(value: string | null | undefined) {
  if (!value) return null;
  const normalized = decodeURIComponent(value.trim())
    .replace(/^doi:\s*/i, "")
    .replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "")
    .toLowerCase();
  return /^10\.\d{4,9}\/\S+$/.test(normalized) ? normalized : null;
}

export function normalizeOpenAlexId(value: string | null | undefined) {
  if (!value) return null;
  const normalized = value
    .trim()
    .replace(/^https?:\/\/(?:api\.)?openalex\.org\//i, "")
    .toUpperCase();
  return /^W\d+$/.test(normalized) ? normalized : null;
}

export function normalizeArxivId(value: string | null | undefined) {
  if (!value) return null;
  const normalized = value
    .trim()
    .replace(/^arxiv:\s*/i, "")
    .replace(/^https?:\/\/arxiv\.org\/(?:abs|pdf)\//i, "")
    .replace(/\.pdf$/i, "");
  const match = normalized.match(
    /^((?:\d{4}\.\d{4,5}|[a-z-]+(?:\.[a-z]{2})?\/\d{7}))(v\d+)?$/i,
  );
  return match
    ? {
        baseId: match[1]!.toLowerCase(),
        version: match[2]?.toLowerCase() ?? null,
      }
    : null;
}

export function normalizePaperExternalIds(paper: Paper): Paper["externalIds"] {
  const externalIds: Paper["externalIds"] = {};
  const doi = normalizeDoi(paper.externalIds.doi);
  const arxiv = normalizeArxivId(paper.externalIds.arxiv);
  const openalex = normalizeOpenAlexId(paper.externalIds.openalex);
  if (doi) externalIds.doi = doi;
  if (arxiv)
    externalIds.arxiv = arxiv.version
      ? `${arxiv.baseId}${arxiv.version}`
      : arxiv.baseId;
  if (openalex) externalIds.openalex = openalex;
  return externalIds;
}
