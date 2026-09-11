// @vitest-environment node
import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { WorkspaceBundleService } from "../../src/application/archive/workspace-bundle-service";
import { createEmptySessionProfile } from "../../src/domain/research-profile/research-profile";
import { createEmptyWorkspace } from "../../src/domain/workspace/create-workspace";
import { IdeaScopeDatabase } from "../../src/infrastructure/storage/ideascope-database";
import { ResearchProfileRepository } from "../../src/infrastructure/storage/research-profile-repository";
import { WorkspaceRepository } from "../../src/infrastructure/storage/workspace-repository";

describe("v0.6.12 integration dogfooding gate", () => {
  it("moves Robotics, Localization and Geomatics sessions through one portable bundle", async () => {
    const sourceDb = new IdeaScopeDatabase(`dogfood-source-${crypto.randomUUID()}`);
    const domains = [
      ["robotics", "足端感知研究", "Robotics"],
      ["localization", "激光雷达定位研究", "Localization & Navigation"],
      ["geomatics", "道路变化检测研究", "Geomatics / Surveying"],
    ] as const;
    for (const [id, title, domain] of domains) {
      const workspace = createEmptyWorkspace(id);
      workspace.workspace.title = title;
      workspace.workspace.seedIdea = `${domain} seed`;
      workspace.workspace.branches[0]!.summary.understood = [`${domain} summary`];
      await new WorkspaceRepository(sourceDb).save(workspace);
      await new ResearchProfileRepository(sourceDb).save({
        ...createEmptySessionProfile(id),
        scope: { domains: [domain], subfields: [], concepts: [] },
      });
    }

    const bundle = await new WorkspaceBundleService(sourceDb).create(domains.map(([id]) => id));
    const targetDb = new IdeaScopeDatabase(`dogfood-target-${crypto.randomUUID()}`);
    const importedIds = await new WorkspaceBundleService(targetDb).importSelected(bundle.bytes);

    expect(importedIds).toHaveLength(3);
    const restored = await Promise.all(importedIds.map((id) => new WorkspaceRepository(targetDb).get(id)));
    expect(restored.map((item) => item?.workspace.title)).toEqual(domains.map(([, title]) => `${title}（导入）`));
    const restoredDomains = await Promise.all(importedIds.map(async (id) => (await new ResearchProfileRepository(targetDb).getSession(id))?.scope.domains[0]));
    expect(restoredDomains).toEqual(domains.map(([, , domain]) => domain));
    expect(restored.every((item) => item?.workspace.branches[0]?.summary.understood.length === 1)).toBe(true);

    await sourceDb.delete();
    await targetDb.delete();
  });
});
