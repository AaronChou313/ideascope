import type { CapabilityState } from "../llm/types";
import { providerDraftSchema, type ProviderDraft, type SavedProviderProfile } from "../../domain/provider/provider-profile";
import { IdeaScopeDatabase, ideaScopeDatabase } from "./ideascope-database";
import { normalizeBaseUrl } from "../llm/provider-protocol";

export class ProviderProfileRepository {
  constructor(private readonly db: IdeaScopeDatabase = ideaScopeDatabase) {}

  async getActive() { return this.db.providerProfiles.filter(({ active }) => active).first(); }

  async list() { return this.db.providerProfiles.orderBy("updatedAt").reverse().toArray(); }

  async saveProfile(draft: ProviderDraft, options: { id?: string; activate?: boolean; test?: { state: CapabilityState; testedAt: string | null } } = {}) {
    const parsed = providerDraftSchema.parse({ ...draft, baseUrl: normalizeBaseUrl(draft.baseUrl) });
    const existing = options.id ? await this.db.providerProfiles.get(options.id) : undefined;
    const profile: SavedProviderProfile = {
      ...parsed,
      id: existing?.id ?? crypto.randomUUID(),
      active: options.activate ?? existing?.active ?? false,
      lastTestState: options.test?.state ?? existing?.lastTestState ?? "unknown",
      lastTestedAt: options.test?.testedAt ?? existing?.lastTestedAt ?? null,
      updatedAt: new Date().toISOString(),
      webSearchState: existing?.webSearchState ?? "unknown",
    };
    await this.db.transaction("rw", this.db.providerProfiles, async () => {
      if (profile.active) await this.db.providerProfiles.toCollection().modify({ active: false });
      await this.db.providerProfiles.put(profile);
    });
    return profile;
  }

  async setActive(id: string) {
    const profile = await this.db.providerProfiles.get(id);
    if (!profile) throw new Error("Provider 配置不存在。");
    await this.db.transaction("rw", this.db.providerProfiles, async () => {
      await this.db.providerProfiles.toCollection().modify({ active: false });
      await this.db.providerProfiles.update(id, { active: true, updatedAt: new Date().toISOString() });
    });
    return { ...profile, active: true };
  }

  async delete(id: string) { await this.db.providerProfiles.delete(id); }

  async saveActive(draft: ProviderDraft, test?: { state: CapabilityState; testedAt: string | null }) {
    const existing = await this.getActive();
    return this.saveProfile(draft, { id: existing?.id, activate: true, test });
  }
}
