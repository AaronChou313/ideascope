import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { applySessionProfilePatch } from "../../src/domain/research-profile/research-profile";
import { IdeaScopeDatabase } from "../../src/infrastructure/storage/ideascope-database";
import { ResearchProfileRepository } from "../../src/infrastructure/storage/research-profile-repository";

describe("research profile persistence", () => {
  it("restores an evolved Session Profile from a new repository instance", async () => {
    const db = new IdeaScopeDatabase(`profile-${crypto.randomUUID()}`);
    const first = new ResearchProfileRepository(db);
    const session = await first.getOrCreateSession("workspace-1");
    await first.save(applySessionProfilePatch(session, {
      patchVersion: 1,
      targetProfileId: session.id,
      operations: [{ op: "addConcept", value: "contact-aided estimation" }],
    }));
    const restored = await new ResearchProfileRepository(db).getSession("workspace-1");
    expect(restored?.scope.concepts).toEqual(["contact-aided estimation"]);
    expect(restored?.mode).toBe("session");
  });
});
