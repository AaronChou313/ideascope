import Dexie, { type EntityTable } from "dexie";
import type { Evidence, Paper } from "../../../contracts/domain";
import type { SearchRecord } from "../../domain/search/literature";

export class IdeaScopeDatabase extends Dexie {
  papers!: EntityTable<Paper, "id">;
  evidence!: EntityTable<Evidence, "id">;
  searchRecords!: EntityTable<SearchRecord, "id">;
  constructor(name = "ideascope") {
    super(name);
    this.version(1).stores({
      papers:
        "id,externalIds.doi,externalIds.arxiv,externalIds.openalex,fetchedAt",
      evidence: "id,paperId,level,fetchedAt",
      searchRecords: "id,source,status,endedAt,cacheKey",
    });
  }
}

export const ideaScopeDatabase = new IdeaScopeDatabase();
