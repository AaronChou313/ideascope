import type { Evidence, Paper } from "../../../contracts/domain";
import {
  reviewDuplicate,
  type DuplicateReview,
} from "../../domain/evidence/deduplicate";
import { normalizePaperExternalIds } from "../../domain/evidence/identifiers";
import { IdeaScopeDatabase, ideaScopeDatabase } from "./ideascope-database";

export class PaperStore {
  constructor(private readonly db: IdeaScopeDatabase = ideaScopeDatabase) {}
  async save(
    paper: Paper,
  ): Promise<{ id: string; duplicateReviews: DuplicateReview[] }> {
    const normalized = structuredClone(paper);
    normalized.externalIds = normalizePaperExternalIds(normalized);
    const existing = await this.db.papers.toArray();
    const duplicateReviews = reviewDuplicate(
      normalized,
      existing.filter((item) => item.id !== normalized.id),
    );
    const exact = duplicateReviews.find((item) => item.relation === "exact");
    if (exact) return { id: exact.paperId, duplicateReviews };
    await this.db.papers.put(normalized);
    return { id: normalized.id, duplicateReviews };
  }
  list() {
    return this.db.papers.toArray();
  }
  get(id: string) {
    return this.db.papers.get(id);
  }
  async linkVersions(leftId: string, rightId: string) {
    await this.db.transaction("rw", this.db.papers, async () => {
      const [left, right] = await Promise.all([
        this.db.papers.get(leftId),
        this.db.papers.get(rightId),
      ]);
      if (!left || !right) throw new Error("只能关联已保存的文献版本。");
      left.relatedVersionIds = [
        ...new Set([...left.relatedVersionIds, rightId]),
      ];
      right.relatedVersionIds = [
        ...new Set([...right.relatedVersionIds, leftId]),
      ];
      await this.db.papers.bulkPut([left, right]);
    });
  }
}

export class EvidenceStore {
  constructor(private readonly db: IdeaScopeDatabase = ideaScopeDatabase) {}
  async add(item: Evidence) {
    if (!(await this.db.papers.get(item.paperId)))
      throw new Error("Evidence 必须关联已保存的 Paper。");
    const existing = await this.db.evidence.get(item.id);
    if (existing && JSON.stringify(existing) !== JSON.stringify(item))
      throw new Error("已引用的 Evidence 快照不可原地覆盖。");
    await this.db.evidence.put(structuredClone(item));
    return item.id;
  }
  byPaper(paperId: string) {
    return this.db.evidence.where("paperId").equals(paperId).toArray();
  }
}

export class SearchRecordStore {
  constructor(private readonly db: IdeaScopeDatabase = ideaScopeDatabase) {}
  save(record: import("../../domain/search/literature").SearchRecord) {
    return this.db.searchRecords.put(structuredClone(record));
  }
}
