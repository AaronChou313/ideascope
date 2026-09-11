import {
  createEmptySessionProfile,
  researchProfileSchema,
  type ResearchProfile,
} from "../../domain/research-profile/research-profile";
import { IdeaScopeDatabase, ideaScopeDatabase } from "./ideascope-database";

export class ResearchProfileRepository {
  constructor(private readonly db: IdeaScopeDatabase = ideaScopeDatabase) {}

  getSession(workspaceId: string) {
    return this.db.researchProfiles.get(`session:${workspaceId}`);
  }

  async getOrCreateSession(workspaceId: string) {
    const current = await this.getSession(workspaceId);
    if (current) return current;
    const created = createEmptySessionProfile(workspaceId);
    await this.db.researchProfiles.put(created);
    return created;
  }

  async save(profile: ResearchProfile) {
    const parsed = researchProfileSchema.parse(profile);
    await this.db.researchProfiles.put(parsed);
    return parsed;
  }

  listBase() {
    return this.db.researchProfiles.where("mode").equals("base").toArray();
  }

  async deleteBase(profileId: string) {
    const profile = await this.db.researchProfiles.get(profileId);
    if (profile?.mode === "base") await this.db.researchProfiles.delete(profileId);
  }
}
