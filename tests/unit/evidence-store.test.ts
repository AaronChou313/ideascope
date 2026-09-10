import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import type { Evidence, Paper } from "../../contracts/domain";
import {
  normalizeArxivId,
  normalizeDoi,
  normalizeOpenAlexId,
} from "../../src/domain/evidence/identifiers";
import { reviewDuplicate } from "../../src/domain/evidence/deduplicate";
import {
  EvidenceStore,
  PaperStore,
} from "../../src/infrastructure/storage/evidence-repositories";
import { IdeaScopeDatabase } from "../../src/infrastructure/storage/ideascope-database";

const databases: IdeaScopeDatabase[] = [];
function database() {
  const db = new IdeaScopeDatabase(`test-${crypto.randomUUID()}`);
  databases.push(db);
  return db;
}
afterEach(async () => {
  await Promise.all(databases.splice(0).map((db) => db.delete()));
});
const paper = (changes: Partial<Paper> = {}): Paper => ({
  id: "paper-1",
  externalIds: {
    doi: "https://doi.org/10.1000/ABC",
    openalex: "https://openalex.org/w123",
  },
  title: "A Reliable Method",
  authors: ["Ada Lovelace"],
  year: 2025,
  venue: null,
  url: "https://example.test",
  abstract: null,
  source: "openalex",
  fetchedAt: "2026-09-10T00:00:00.000Z",
  relatedVersionIds: [],
  ...changes,
});

describe("evidence identifiers and duplicate review", () => {
  it("normalizes DOI, arXiv base/version, and OpenAlex IDs", () => {
    expect(normalizeDoi("DOI: 10.1000/ABC")).toBe("10.1000/abc");
    expect(normalizeArxivId("https://arxiv.org/pdf/2401.01234v2.pdf")).toEqual({
      baseId: "2401.01234",
      version: "v2",
    });
    expect(normalizeOpenAlexId("https://api.openalex.org/w123")).toBe("W123");
  });
  it("auto-identifies exact IDs but only proposes title/author/year candidates", () => {
    expect(
      reviewDuplicate(paper(), [paper({ id: "exact", title: "Different" })])[0]
        ?.relation,
    ).toBe("exact");
    const incoming = paper({
      id: "incoming",
      externalIds: {},
      title: "A reliable method!",
    });
    const existing = paper({
      id: "candidate",
      externalIds: {},
      title: "A Reliable Method",
      year: 2024,
    });
    const reviews = reviewDuplicate(incoming, [existing]);
    expect(reviews).toHaveLength(1);
    expect(reviews[0]).toMatchObject({
      paperId: "candidate",
      relation: "candidate",
    });
    expect(reviews[0]?.reasons.join(" ")).toMatch(/人工审阅/);
  });
});

describe("PaperStore and EvidenceStore", () => {
  it("persists normalized papers and keeps evidence snapshots immutable", async () => {
    const db = database();
    const papers = new PaperStore(db);
    const evidence = new EvidenceStore(db);
    await papers.save(paper());
    expect((await papers.list())[0]?.externalIds).toMatchObject({
      doi: "10.1000/abc",
      openalex: "W123",
    });
    const snapshot: Evidence = {
      id: "e-1",
      paperId: "paper-1",
      level: "abstract",
      excerpt: null,
      paraphrase: "摘要仅说明测试。",
      locator: { url: "https://example.test", section: "abstract" },
      verification: "unreviewed",
      contentHash: "sha256:test",
      fetchedAt: "2026-09-10T00:00:00.000Z",
    };
    await evidence.add(snapshot);
    await expect(
      evidence.add({ ...snapshot, paraphrase: "overwrite" }),
    ).rejects.toThrow(/不可原地覆盖/);
    expect(await evidence.byPaper("paper-1")).toHaveLength(1);
  });
  it("rejects evidence for an unknown paper", async () => {
    const store = new EvidenceStore(database());
    await expect(
      store.add({
        id: "e",
        paperId: "missing",
        level: "metadata",
        excerpt: null,
        paraphrase: "",
        locator: { url: "https://example.test", section: "metadata" },
        verification: "unreviewed",
        contentHash: "sha256:x",
        fetchedAt: new Date().toISOString(),
      }),
    ).rejects.toThrow(/已保存/);
  });
  it("links reviewed publication versions without merging their records", async () => {
    const db = database();
    const store = new PaperStore(db);
    await store.save(paper());
    await store.save(
      paper({ id: "paper-2", externalIds: { openalex: "W999" } }),
    );
    await store.linkVersions("paper-1", "paper-2");
    expect((await store.get("paper-1"))?.relatedVersionIds).toEqual([
      "paper-2",
    ]);
    expect((await store.get("paper-2"))?.relatedVersionIds).toEqual([
      "paper-1",
    ]);
    expect(await store.list()).toHaveLength(2);
  });
});
