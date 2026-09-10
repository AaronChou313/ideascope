import { describe, expect, it } from "vitest";
import fixtures from "../../examples/search-recipes.fixture.json";
import type {
  LiteratureAdapter,
  LiteratureSearchResult,
} from "../../src/domain/search/literature";
import {
  createSearchRecipe,
  runSearchRecipe,
} from "../../src/domain/search/recipes";

describe("literature search recipes", () => {
  it("builds four explainable, budgeted purposes for three disciplines", () => {
    for (const item of fixtures.cases) {
      const recipe = createSearchRecipe({
        ...item,
        rationale: `根据${item.discipline}范围整理`,
        currentYear: 2026,
      });
      expect(recipe.items.map((entry) => entry.purpose)).toEqual([
        "review",
        "representative",
        "recent",
        "counterevidence",
      ]);
      expect(recipe.items).toHaveLength(recipe.budget.maxQueries);
      expect(
        recipe.items.reduce((sum, entry) => sum + entry.options.limit, 0),
      ).toBeLessThanOrEqual(recipe.budget.maxCandidates);
      expect(
        recipe.items.every((entry) => entry.query.rationale.includes("目的")),
      ).toBe(true);
      expect(item.include.length).toBeGreaterThan(0);
      expect(item.exclude.length).toBeGreaterThan(0);
    }
  });

  it("keeps partial results when one source call fails", async () => {
    let call = 0;
    const search: LiteratureAdapter["search"] = (query) => {
      call += 1;
      const status =
        call === 2 ? ("source_unavailable" as const) : ("completed" as const);
      return Promise.resolve({
        papers:
          status === "completed"
            ? [
                {
                  id: `p-${call}`,
                  externalIds: {},
                  title: query.keywords,
                  authors: [],
                  year: null,
                  venue: null,
                  url: "https://example.test",
                  abstract: null,
                  source: "fixture",
                  fetchedAt: "2026-09-10T00:00:00.000Z",
                  relatedVersionIds: [],
                },
              ]
            : [],
        nextCursor: null,
        record: {
          id: `r-${call}`,
          source: "fixture",
          query,
          cacheKey: "fixture",
          status,
          startedAt: "2026-09-10T00:00:00.000Z",
          endedAt: "2026-09-10T00:00:00.000Z",
          resultCount: status === "completed" ? 1 : 0,
          totalAvailable: null,
          pagesFetched: status === "completed" ? 1 : 0,
          diagnostic: {
            endpoint: "fixture",
            httpStatus: status === "completed" ? 200 : 503,
            rateLimitRemaining: null,
            rateLimitResetSeconds: null,
            requestCostUsd: null,
            errorCode: status === "completed" ? null : status,
          },
        },
      } satisfies LiteratureSearchResult);
    };
    const adapter: LiteratureAdapter = {
      source: "fixture",
      search,
    };
    const item = fixtures.cases[0]!;
    const run = await runSearchRecipe(
      [adapter],
      createSearchRecipe({ ...item, rationale: "fixture", currentYear: 2026 }),
      new AbortController().signal,
    );
    expect(run.results).toHaveLength(3);
    expect(run.failures).toEqual([
      {
        purpose: "representative",
        source: "fixture",
        reason: "source_unavailable",
      },
    ]);
    expect(run.candidateCount).toBe(3);
  });
});
