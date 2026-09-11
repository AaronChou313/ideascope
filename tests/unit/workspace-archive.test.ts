import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { WorkspaceArchiveService } from "../../src/application/archive/workspace-archive-service";
import { createEmptyWorkspace } from "../../src/domain/workspace/create-workspace";
import { createEmptySessionProfile } from "../../src/domain/research-profile/research-profile";
import { IdeaScopeDatabase } from "../../src/infrastructure/storage/ideascope-database";
import { WorkspaceRepository } from "../../src/infrastructure/storage/workspace-repository";
import { ResearchProfileRepository } from "../../src/infrastructure/storage/research-profile-repository";

describe("complete workspace archive", () => {
  it("exports and restores workspace, graph view, profile and relevant records without credentials", async () => {
    const db = new IdeaScopeDatabase(`archive-${crypto.randomUUID()}`);
    const workspace = createEmptyWorkspace("archive-source");
    workspace.workspace.title = "Archive Test";
    workspace.workspace.branches[0]!.view.viewport = { x: 21, y: 34, zoom: 1.2 };
    await new WorkspaceRepository(db).save(workspace);
    await new ResearchProfileRepository(db).save({ ...createEmptySessionProfile("archive-source"), scope: { domains: ["Robotics"], subfields: [], concepts: [] } });
    await db.searchRecords.put({
      id: "search-1", workspaceId: "archive-source", source: "openalex", status: "completed",
      startedAt: "a", endedAt: "b", query: { originalIdea: "idea", keywords: "robotics", language: "en", rationale: "plan" }, cacheKey: "cache", resultCount: 0, totalAvailable: 0, pagesFetched: 1,
      diagnostic: { endpoint: "https://api.openalex.org/works", httpStatus: 200, rateLimitRemaining: null, rateLimitResetSeconds: null, requestCostUsd: null, errorCode: null },
    });
    const service = new WorkspaceArchiveService(db);
    const archive = await service.create("archive-source");
    expect(archive).toMatchObject({ documentType: "ideascope.workspace-archive", archiveVersion: 1, provenance: { originalWorkspaceId: "archive-source" } });
    expect(archive.searchRecords).toHaveLength(1);
    expect(archive.sessionProfile?.scope.domains).toEqual(["Robotics"]);
    expect(JSON.stringify(archive)).not.toContain("Authorization");
    const restored = await service.import(archive);
    expect(restored.workspace.id).not.toBe("archive-source");
    expect(restored.workspace.branches[0]!.view.viewport).toEqual({ x: 21, y: 34, zoom: 1.2 });
    expect((await new ResearchProfileRepository(db).getSession(restored.workspace.id))?.scope.domains).toEqual(["Robotics"]);
    expect(await db.searchRecords.where("workspaceId").equals(restored.workspace.id).count()).toBe(1);
    await db.delete();
  });

  it("rejects unknown archive versions before writing", async () => {
    const db = new IdeaScopeDatabase(`archive-invalid-${crypto.randomUUID()}`);
    const service = new WorkspaceArchiveService(db);
    await expect(service.import({ documentType: "ideascope.workspace-archive", archiveVersion: 99 })).rejects.toThrow("不支持");
    expect(await db.workspaces.count()).toBe(0);
    await db.delete();
  });
});
