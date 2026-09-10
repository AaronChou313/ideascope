import type { Paper } from "../../../contracts/domain";
import {
  normalizeArxivId,
  normalizeDoi,
  normalizeOpenAlexId,
} from "./identifiers";

export interface DuplicateReview {
  paperId: string;
  relation: "exact" | "candidate";
  reasons: string[];
}

function text(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}
function firstAuthor(paper: Paper) {
  return text(paper.authors[0] ?? "");
}

export function reviewDuplicate(
  incoming: Paper,
  existing: readonly Paper[],
): DuplicateReview[] {
  const doi = normalizeDoi(incoming.externalIds.doi);
  const arxiv = normalizeArxivId(incoming.externalIds.arxiv)?.baseId ?? null;
  const openalex = normalizeOpenAlexId(incoming.externalIds.openalex);
  return existing.flatMap<DuplicateReview>((paper) => {
    const reasons: string[] = [];
    if (doi && doi === normalizeDoi(paper.externalIds.doi))
      reasons.push("相同 DOI");
    if (arxiv && arxiv === normalizeArxivId(paper.externalIds.arxiv)?.baseId)
      reasons.push("相同 arXiv base ID");
    if (
      openalex &&
      openalex === normalizeOpenAlexId(paper.externalIds.openalex)
    )
      reasons.push("相同 OpenAlex ID");
    if (reasons.length)
      return [{ paperId: paper.id, relation: "exact" as const, reasons }];
    const sameTitle = text(incoming.title) === text(paper.title);
    const sameAuthor =
      Boolean(firstAuthor(incoming)) &&
      firstAuthor(incoming) === firstAuthor(paper);
    const closeYear =
      incoming.year !== null &&
      paper.year !== null &&
      Math.abs(incoming.year - paper.year) <= 1;
    return sameTitle && sameAuthor && closeYear
      ? [
          {
            paperId: paper.id,
            relation: "candidate" as const,
            reasons: ["规范化题名相同", "首位作者相同", "年份相近；需人工审阅"],
          },
        ]
      : [];
  });
}
