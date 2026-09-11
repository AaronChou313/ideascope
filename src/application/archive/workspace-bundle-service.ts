import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { workspaceBundleManifestSchema, type WorkspaceBundlePreviewItem } from "../../domain/archive/workspace-bundle";
import { WorkspaceArchiveService } from "./workspace-archive-service";
import { IdeaScopeDatabase, ideaScopeDatabase } from "../../infrastructure/storage/ideascope-database";
import { literatureSourceManifestSchema } from "../../domain/literature-source/literature-source";
import { researchProfileSchema } from "../../domain/research-profile/research-profile";

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
      documentType: "ideascope.bundle", bundleVersion: 1, createdWith: "0.6.15", exportedAt: new Date().toISOString(), workspaces,
      ...(includeResources ? { resources: { sources: sourcePaths, profiles: profilePaths } } : {}),
    });
    files["ideascope-bundle.json"] = strToU8(JSON.stringify(manifest, null, 2));
    return { bytes: zipSync(files, { level: 6 }), manifest };
  }

  async preview(bytes: Uint8Array) {
    inspectZipEntries(bytes);
    const files = unzipSync(bytes);
    const rawManifest = files["ideascope-bundle.json"];
    if (!rawManifest) throw new Error("Bundle 缺少 ideascope-bundle.json。");
    const manifest = workspaceBundleManifestSchema.parse(JSON.parse(strFromU8(rawManifest)));
    for (const path of manifest.resources?.sources ?? []) {
      const file = files[path];
      if (!file) throw new Error(`Bundle 缺少 ${path}。`);
      literatureSourceManifestSchema.parse(JSON.parse(strFromU8(file)));
    }
    for (const path of manifest.resources?.profiles ?? []) {
      const file = files[path];
      if (!file) throw new Error(`Bundle 缺少 ${path}。`);
      researchProfileSchema.parse(JSON.parse(strFromU8(file)));
    }
    const items: WorkspaceBundlePreviewItem[] = [];
    const archiveService = new WorkspaceArchiveService(this.db);
    for (const entry of manifest.workspaces) {
      const file = files[entry.path];
      if (!file) throw new Error(`Bundle 缺少 ${entry.path}。`);
      if (await sha256(file) !== entry.sha256) throw new Error(`${entry.path} 完整性校验失败。`);
      const archive = archiveService.parse(JSON.parse(strFromU8(file)));
      const local = await new WorkspaceArchiveService(this.db).create(entry.workspaceId).catch(() => null);
      const duplicate = !local ? "none" : await sha256(strToU8(JSON.stringify(local.workspace.workspace))) === await sha256(strToU8(JSON.stringify(archive.workspace.workspace))) ? "same-id-same-content" : "same-id-different";
      items.push({ workspaceId: entry.workspaceId, title: entry.title, path: entry.path, branches: archive.workspace.workspace.branches.length, nodes: archive.workspace.workspace.branches.reduce((sum, branch) => sum + branch.graph.nodes.length, 0), papers: archive.workspace.workspace.papers.length, evidence: archive.workspace.workspace.evidence.length, duplicate });
    }
    return { manifest, items, files };
  }

  async importSelected(bytes: Uint8Array, selectedPaths?: readonly string[]) {
    const preview = await this.preview(bytes);
    const selected = new Set(selectedPaths ?? preview.items.map((item) => item.path));
    if (!selected.size) throw new Error("请至少选择一个通过校验的探索项目。");
    if ([...selected].some((path) => !preview.items.some((item) => item.path === path))) throw new Error("选择包含未经校验的 Bundle 条目。");
    const archives = [...selected].map((path) => new WorkspaceArchiveService(this.db).parse(JSON.parse(strFromU8(preview.files[path]!))));
    const tables = [this.db.workspaces, this.db.branches, this.db.papers, this.db.evidence, this.db.messages, this.db.runExecutions, this.db.runSummaries, this.db.searchRecords, this.db.researchProfiles, this.db.sourceManifests, this.db.sourceInstallations];
    const imported: string[] = [];
    await this.db.transaction("rw", tables, async () => {
      for (const archive of archives) {
        const workspace = await new WorkspaceArchiveService(this.db).import(archive);
        imported.push(workspace.workspace.id);
      }
    });
    return imported;
  }
}

function safeName(value: string) { return value.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 180) || crypto.randomUUID(); }
async function sha256(value: Uint8Array) {
  const digest = await crypto.subtle.digest("SHA-256", value as Uint8Array<ArrayBuffer>);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function inspectZipEntries(bytes: Uint8Array) {
  const maxCompressed = 64 * 1024 * 1024;
  const maxExpanded = 256 * 1024 * 1024;
  const maxFile = 64 * 1024 * 1024;
  if (bytes.byteLength > maxCompressed) throw new Error("Bundle 压缩大小超过 64 MiB 安全上限。");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = -1;
  for (let offset = Math.max(0, bytes.byteLength - 65_557); offset <= bytes.byteLength - 22; offset += 1)
    if (view.getUint32(offset, true) === 0x06054b50) eocd = offset;
  if (eocd < 0) throw new Error("Bundle ZIP 目录无效。");
  const count = view.getUint16(eocd + 10, true);
  const centralSize = view.getUint32(eocd + 12, true);
  let offset = view.getUint32(eocd + 16, true);
  if (count > 1_000) throw new Error("Bundle 文件数量超过 1000 个安全上限。");
  if (offset + centralSize > bytes.byteLength) throw new Error("Bundle ZIP central directory 越界。");
  const names = new Set<string>();
  let expanded = 0;
  for (let index = 0; index < count; index += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) throw new Error("Bundle ZIP central directory 损坏。");
    const size = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const externalAttributes = view.getUint32(offset + 38, true);
    const name = strFromU8(bytes.subarray(offset + 46, offset + 46 + nameLength));
    if (unsafeZipPath(name)) throw new Error(`Bundle 包含不安全路径：${name}`);
    if (names.has(name)) throw new Error(`Bundle 包含重复路径：${name}`);
    names.add(name);
    const unixMode = externalAttributes >>> 16;
    if ((unixMode & 0o170000) === 0o120000) throw new Error(`Bundle 不允许符号链接：${name}`);
    if (name.endsWith(".json") && size > maxFile) throw new Error(`${name} 超过单 JSON 64 MiB 安全上限。`);
    expanded += size;
    if (expanded > maxExpanded) throw new Error("Bundle 展开后超过 256 MiB 安全上限。");
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return { count, expandedBytes: expanded };
}

function unsafeZipPath(path: string) {
  return !path || path.startsWith("/") || path.startsWith("\\") || /^[A-Za-z]:/.test(path) || path.split(/[\\/]/).some((segment) => segment === ".." || segment === "") || path.includes("\\");
}
