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

  getActiveBase() {
    return this.db.researchProfiles.get("base:active");
  }

  async saveActiveBase(profile: ResearchProfile) {
    const parsed = researchProfileSchema.parse({
      ...profile,
      id: "base:active",
      mode: "base",
      updatedAt: new Date().toISOString(),
    });
    await this.db.researchProfiles.put(parsed);
    return parsed;
  }

  listSessions() {
    return this.db.researchProfiles.where("mode").equals("session").sortBy("updatedAt");
  }

  clearActiveBase() {
    return this.db.researchProfiles.delete("base:active");
  }

  async deleteBase(profileId: string) {
    const profile = await this.db.researchProfiles.get(profileId);
    if (profile?.mode === "base") await this.db.researchProfiles.delete(profileId);
  }
}
