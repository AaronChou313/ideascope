import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { workspaceBundleManifestSchema, type WorkspaceBundlePreviewItem } from "../../domain/archive/workspace-bundle";
import { WorkspaceArchiveService } from "./workspace-archive-service";
import { IdeaScopeDatabase, ideaScopeDatabase } from "../../infrastructure/storage/ideascope-database";

export class WorkspaceBundleService {
  constructor(private readonly db: IdeaScopeDatabase = ideaScopeDatabase) {}

  async create(workspaceIds: readonly string[], includeResources = true) {
    if (!workspaceIds.length) throw new Error("请至少选择一个探索项目。");
    if (workspaceIds.length > 250) throw new Error("单个 Bundle 最多包含 250 个探索项目。");
    const archiveService = new WorkspaceArchiveService(this.db);
    const files: Record<string, Uint8Array> = {};
    const workspaces = [];
    const sources = new Map<string, unknown>();
    const profiles = new Map<string, unknown>();
    for (const workspaceId of workspaceIds) {
      const archive = await archiveService.create(workspaceId);
      const path = `workspaces/${safeName(workspaceId)}.ideascope.json`;
      const bytes = strToU8(JSON.stringify(archive));
      files[path] = bytes;
      workspaces.push({ workspaceId, title: archive.workspace.workspace.title, path, sha256: await sha256(bytes) });
      if (includeResources) {
        archive.sourceSnapshots.forEach((source) => sources.set(source.id, source));
        archive.baseProfileSnapshots.forEach((profile) => profiles.set(profile.id, profile));
      }
    }
    const sourcePaths: string[] = [];
    const profilePaths: string[] = [];
    if (includeResources) {
      for (const [id, source] of sources) { const path = `resources/sources/${safeName(id)}.ideascope-source.json`; files[path] = strToU8(JSON.stringify(source)); sourcePaths.push(path); }
      for (const [id, profile] of profiles) { const path = `resources/profiles/${safeName(id)}.ideascope-profile.json`; files[path] = strToU8(JSON.stringify(profile)); profilePaths.push(path); }
    }
    const manifest = workspaceBundleManifestSchema.parse({
      documentType: "ideascope.bundle", bundleVersion: 1, createdWith: "0.6.11", exportedAt: new Date().toISOString(), workspaces,
      ...(includeResources ? { resources: { sources: sourcePaths, profiles: profilePaths } } : {}),
    });
    files["ideascope-bundle.json"] = strToU8(JSON.stringify(manifest, null, 2));
    return { bytes: zipSync(files, { level: 6 }), manifest };
  }

  async preview(bytes: Uint8Array) {
    const files = unzipSync(bytes);
    const rawManifest = files["ideascope-bundle.json"];
    if (!rawManifest) throw new Error("Bundle 缺少 ideascope-bundle.json。");
    const manifest = workspaceBundleManifestSchema.parse(JSON.parse(strFromU8(rawManifest)));
    const items: WorkspaceBundlePreviewItem[] = [];
    const archiveService = new WorkspaceArchiveService(this.db);
    for (const entry of manifest.workspaces) {
      const file = files[entry.path];
      if (!file) throw new Error(`Bundle 缺少 ${entry.path}。`);
      if (await sha256(file) !== entry.sha256) throw new Error(`${entry.path} 完整性校验失败。`);
      const archive = archiveService.parse(JSON.parse(strFromU8(file)));
      items.push({ workspaceId: entry.workspaceId, title: entry.title, path: entry.path, branches: archive.workspace.workspace.branches.length, nodes: archive.workspace.workspace.branches.reduce((sum, branch) => sum + branch.graph.nodes.length, 0), papers: archive.workspace.workspace.papers.length, evidence: archive.workspace.workspace.evidence.length });
    }
    return { manifest, items };
  }
}

function safeName(value: string) { return value.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 180) || crypto.randomUUID(); }
async function sha256(value: Uint8Array) {
  const digest = await crypto.subtle.digest("SHA-256", value as Uint8Array<ArrayBuffer>);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
