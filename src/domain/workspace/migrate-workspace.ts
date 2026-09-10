import type { WorkspaceExport } from "../../../contracts/domain";

export class WorkspaceFormatError extends Error {}

export function migrateWorkspaceExport(raw: unknown): WorkspaceExport {
  if (!raw || typeof raw !== "object") throw new WorkspaceFormatError("导入文件不是对象。");
  const input = raw as Record<string, unknown>;
  if (input.documentType !== "ideascope.workspace") throw new WorkspaceFormatError("不是 IdeaScope workspace 文件。");
  const version = input.formatVersion;
  if (version !== 0 && version !== 1) {
    if (typeof version === "number" && version > 1) throw new WorkspaceFormatError(`文件版本 ${version} 来自未来版本，当前不能安全导入。`);
    throw new WorkspaceFormatError("缺少可识别的格式版本。");
  }
  const workspace = input.workspace;
  if (!workspace || typeof workspace !== "object") throw new WorkspaceFormatError("workspace 内容缺失。");
  const migrated = structuredClone(input) as unknown as WorkspaceExport;
  migrated.formatVersion = 1;
  if (typeof migrated.createdWith !== "string") migrated.createdWith = version === 0 ? "legacy-0" : "unknown";
  if (typeof migrated.exportedAt !== "string") migrated.exportedAt = new Date(0).toISOString();
  if (typeof migrated.isDemo !== "boolean") migrated.isDemo = false;
  const value = migrated.workspace;
  if (!value.id || !value.title || !value.activeBranchId || !Array.isArray(value.branches) || !Array.isArray(value.papers) || !Array.isArray(value.evidence) || !Array.isArray(value.messages) || !Array.isArray(value.runs)) throw new WorkspaceFormatError("workspace 必填字段不完整。");
  return migrated;
}
