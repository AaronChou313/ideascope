import type { CapabilityState } from "../llm/types";
import { providerDraftSchema, type ProviderDraft, type SavedProviderProfile } from "../../domain/provider/provider-profile";
import { IdeaScopeDatabase, ideaScopeDatabase } from "./ideascope-database";

export class ProviderProfileRepository {
  constructor(private readonly db: IdeaScopeDatabase = ideaScopeDatabase) {}

  async getActive() { return this.db.providerProfiles.filter(({ active }) => active).first(); }

  async saveActive(draft: ProviderDraft, test?: { state: CapabilityState; testedAt: string | null }) {
    const parsed = providerDraftSchema.parse(draft);
    const existing = await this.getActive();
    const profile: SavedProviderProfile = {
      ...parsed,
      id: existing?.id ?? "active-provider",
      active: true,
      lastTestState: test?.state ?? existing?.lastTestState ?? "unknown",
      lastTestedAt: test?.testedAt ?? existing?.lastTestedAt ?? null,
      updatedAt: new Date().toISOString(),
    };
    await this.db.transaction("rw", this.db.providerProfiles, async () => {
      await this.db.providerProfiles.toCollection().modify({ active: false });
      await this.db.providerProfiles.put(profile);
    });
    return profile;
  }
}
