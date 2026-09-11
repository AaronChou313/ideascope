import { literatureSourceManifestSchema, type LiteratureSourceManifest } from "../../domain/literature-source/literature-source";
import { BUILTIN_LITERATURE_SOURCE_MANIFESTS } from "../literature/builtin-source-registry";
import { IdeaScopeDatabase, ideaScopeDatabase } from "./ideascope-database";
import { validateRestJsonManifest } from "../literature/rest-json";

export class SourceManifestRepository {
  constructor(private readonly db: IdeaScopeDatabase = ideaScopeDatabase) {}

  async list(): Promise<LiteratureSourceManifest[]> {
    return [...BUILTIN_LITERATURE_SOURCE_MANIFESTS, ...await this.db.sourceManifests.toArray()];
  }

  listCustom() {
    return this.db.sourceManifests.toArray();
  }

  async install(input: unknown) {
    const manifest = literatureSourceManifestSchema.parse(input);
    if (manifest.adapter.kind === "builtin") throw new Error("外部 Manifest 不能注册未知 built-in driver。");
    if (manifest.adapter.kind === "rest-json") validateRestJsonManifest(manifest);
    if (manifest.adapter.kind === "external-search") {
      const sample = new URL(manifest.adapter.urlTemplate.replace("{query}", "test"));
      if (sample.protocol !== "https:" || !manifest.adapter.urlTemplate.includes("{query}") || sample.username || sample.password)
        throw new Error("External Search 必须使用无凭证 HTTPS URL 模板并包含 {query}。");
    }
    const builtin = BUILTIN_LITERATURE_SOURCE_MANIFESTS.find((item) => item.id === manifest.id);
    if (builtin) {
      if (JSON.stringify(builtin) === JSON.stringify(manifest)) return builtin;
      throw new Error("来源 ID 与内置来源冲突，不能静默覆盖。");
    }
    const existing = await this.db.sourceManifests.get(manifest.id);
    if (existing && JSON.stringify(existing) !== JSON.stringify(manifest))
      throw new Error("来源 ID 已存在且内容不同，请更换 ID。");
    await this.db.sourceManifests.put(manifest);
    return manifest;
  }
}
