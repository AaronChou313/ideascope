import { memoryKeyStore } from "../secrets/memory-key-store";
import { sourceCredentialStore } from "../secrets/source-credential-store";
import { IdeaScopeDatabase, ideaScopeDatabase } from "./ideascope-database";

export class LocalDataService {
  constructor(private readonly db: IdeaScopeDatabase = ideaScopeDatabase) {}
  async clearAll(confirmation: string) {
    if (confirmation !== "清除全部数据") throw new Error("确认文字不匹配。");
    await this.db.transaction("rw", this.db.tables, async () => Promise.all(this.db.tables.map((table) => table.clear())));
    memoryKeyStore.clear();
    sourceCredentialStore.clear();
  }
  async clearCache() { await this.db.searchRecords.clear(); }
  async summary() {
    const [projects, searches] = await Promise.all([this.db.workspaces.count(), this.db.searchRecords.count()]);
    const estimate = typeof navigator !== "undefined" && navigator.storage?.estimate ? await navigator.storage.estimate() : {};
    return { projects, searches, usage: estimate.usage ?? null, quota: estimate.quota ?? null };
  }
}
