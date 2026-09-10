import type {
  LiteratureAdapter,
  LiteratureQuery,
  LiteratureSearchOptions,
  LiteratureSearchResult,
} from "./literature";

export type SearchPurpose =
  "review" | "representative" | "recent" | "counterevidence";
export interface SearchRecipeItem {
  purpose: SearchPurpose;
  query: LiteratureQuery;
  options: LiteratureSearchOptions;
}
export interface SearchRecipe {
  id: string;
  items: SearchRecipeItem[];
  budget: { maxQueries: 4; maxCandidates: 60 };
}
export interface RecipeRun {
  results: Array<{ purpose: SearchPurpose; result: LiteratureSearchResult }>;
  failures: Array<{ purpose: SearchPurpose; source: string; reason: string }>;
  candidateCount: number;
}

export function createSearchRecipe(input: {
  id: string;
  originalIdea: string;
  language: string;
  rationale: string;
  coreTerms: string;
  routeTerms: string;
  limitationTerms: string;
  currentYear: number;
}): SearchRecipe {
  const make = (
    purpose: SearchPurpose,
    keywords: string,
    filters?: { fromYear?: number },
  ) => ({
    purpose,
    query: {
      originalIdea: input.originalIdea,
      keywords,
      language: input.language,
      rationale: `${input.rationale}；目的：${purpose}`,
    },
    options: {
      limit: 15,
      maxPages: 1,
      filters,
      sort:
        purpose === "recent"
          ? ("publication_date" as const)
          : ("relevance" as const),
      fields: [
        "id",
        "doi",
        "title",
        "publication_year",
        "authorships",
        "primary_location",
        "best_oa_location",
        "abstract_inverted_index",
      ],
    },
  });
  return {
    id: input.id,
    budget: { maxQueries: 4, maxCandidates: 60 },
    items: [
      make("review", `${input.coreTerms} (review OR survey)`),
      make("representative", `${input.coreTerms} ${input.routeTerms}`),
      make("recent", `${input.coreTerms} ${input.routeTerms}`, {
        fromYear: input.currentYear - 4,
      }),
      make("counterevidence", `${input.coreTerms} (${input.limitationTerms})`),
    ],
  };
}

export async function runSearchRecipe(
  adapters: readonly LiteratureAdapter[],
  recipe: SearchRecipe,
  signal: AbortSignal,
): Promise<RecipeRun> {
  const results: RecipeRun["results"] = [];
  const failures: RecipeRun["failures"] = [];
  let candidateCount = 0;
  for (const item of recipe.items.slice(0, recipe.budget.maxQueries)) {
    for (const adapter of adapters) {
      if (candidateCount >= recipe.budget.maxCandidates || signal.aborted)
        break;
      try {
        const remaining = recipe.budget.maxCandidates - candidateCount;
        const result = await adapter.search(
          item.query,
          { ...item.options, limit: Math.min(item.options.limit, remaining) },
          signal,
        );
        if (
          [
            "source_unavailable",
            "rate_limited",
            "timed_out",
            "invalid_response",
          ].includes(result.record.status)
        )
          failures.push({
            purpose: item.purpose,
            source: adapter.source,
            reason: result.record.status,
          });
        else {
          results.push({ purpose: item.purpose, result });
          candidateCount += result.papers.length;
        }
      } catch (error) {
        failures.push({
          purpose: item.purpose,
          source: adapter.source,
          reason: error instanceof Error ? error.message : "unknown",
        });
      }
    }
  }
  return { results, failures, candidateCount };
}
