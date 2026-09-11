import type { Branch, WorkspaceExport } from "../../../contracts/domain";
import { migrateWorkspaceExport } from "../workspace/migrate-workspace";

export type GraphExportScope = "visible" | "complete";
export interface ExportAudit { messages: number; userNotes: number; evidenceExcerpts: number; credentials: 0 }

const xml = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const md = (value: string) => value.replace(/([\\`*_[\]<>#])/g, "\\$1");

export function auditWorkspaceExport(value: WorkspaceExport): ExportAudit {
  return {
    messages: value.workspace.messages.length,
    userNotes: value.workspace.branches.flatMap(({ graph }) => graph.claims).filter(({ epistemicStatus }) => epistemicStatus === "user_note").length,
    evidenceExcerpts: value.workspace.evidence.filter(({ excerpt }) => Boolean(excerpt)).length,
    credentials: 0,
  };
}

export function exportWorkspaceJson(value: WorkspaceExport, createdWith: string) {
  const clean: WorkspaceExport = { ...structuredClone(value), formatVersion: 2, createdWith, exportedAt: new Date().toISOString() };
  return JSON.stringify(clean, null, 2);
}

export function exportWorkspaceMarkdown(value: WorkspaceExport, branchId = value.workspace.activeBranchId) {
  const branch = value.workspace.branches.find(({ id }) => id === branchId);
  if (!branch) throw new Error("导出分支不存在。");
  const cited = new Set(branch.graph.claims.flatMap(({ evidenceLinks }) => evidenceLinks.map(({ evidenceId }) => evidenceId)));
  const papers = value.workspace.papers.filter((paper) => value.workspace.evidence.some((evidence) => cited.has(evidence.id) && evidence.paperId === paper.id));
  const lines = [`# ${md(value.workspace.title)}`, "", `## ${md(branch.title)}`, "", md(branch.scope.question), "", "## 当前理解", ""];
  for (const node of branch.graph.nodes.filter(({ archived }) => !archived)) {
    lines.push(`### ${md(node.title)}`, "", md(node.summary));
    for (const claimId of node.claimIds) {
      const claim = branch.graph.claims.find(({ id }) => id === claimId);
      if (!claim) continue;
      const refs = claim.evidenceLinks.flatMap(({ evidenceId }) => {
        const evidence = value.workspace.evidence.find(({ id }) => id === evidenceId);
        const index = evidence ? papers.findIndex(({ id }) => id === evidence.paperId) : -1;
        return index >= 0 ? [`[${index + 1}]`] : [];
      }).join("");
      lines.push(`- **${claim.epistemicStatus}** ${md(claim.text)}${refs}`);
    }
    lines.push("");
  }
  lines.push("## 参考文献", "");
  papers.forEach((paper, index) => lines.push(`${index + 1}. ${md(paper.title)}. ${paper.authors.map(md).join(", ")}. ${paper.year ?? "n.d."}. ${paper.url}`));
  lines.push("", "> IdeaScope 导出只反映当前本地理解；推断与假设不等同于文献事实。", "");
  return lines.join("\n");
}

export function exportBranchSvg(branch: Branch, scope: GraphExportScope, visibleIds: string[] = []) {
  const allowed = scope === "complete" ? new Set(branch.graph.nodes.filter(({ archived }) => !archived).map(({ id }) => id)) : new Set(visibleIds);
  const nodes = branch.graph.nodes.filter(({ id, archived }) => !archived && allowed.has(id));
  if (!nodes.length) throw new Error("所选范围没有可导出的节点。");
  const positions = new Map(nodes.map((node, index) => [node.id, branch.view.positions[node.id] ?? { x: (index % 4) * 280, y: Math.floor(index / 4) * 160 }]));
  const maxX = Math.max(...[...positions.values()].map(({ x }) => x)) + 260;
  const maxY = Math.max(...[...positions.values()].map(({ y }) => y)) + 120;
  const edges = branch.graph.edges.filter(({ source, target }) => allowed.has(source) && allowed.has(target)).map((edge) => { const a = positions.get(edge.source)!; const b = positions.get(edge.target)!; return `<path d="M ${a.x + 220} ${a.y + 45} L ${b.x} ${b.y + 45}" fill="none" stroke="#b9bdc5"/><text x="${(a.x + b.x + 220) / 2}" y="${(a.y + b.y) / 2 + 35}" font-size="10" fill="#6b7280">${xml(edge.label)}</text>`; }).join("");
  const boxes = nodes.map((node) => { const p = positions.get(node.id)!; return `<g><rect x="${p.x}" y="${p.y}" width="220" height="90" rx="8" fill="#fff" stroke="#d7d9de"/><text x="${p.x + 14}" y="${p.y + 25}" font-size="10" fill="#6b7280">${xml(node.kind.toUpperCase())}</text><text x="${p.x + 14}" y="${p.y + 53}" font-size="14" font-weight="600" fill="#17191c">${xml(node.title.slice(0, 24))}</text><text x="${p.x + 14}" y="${p.y + 75}" font-size="11" fill="#6b7280">${xml(node.summary.slice(0, 32))}</text></g>`; }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${maxX}" height="${maxY}" viewBox="0 0 ${maxX} ${maxY}" role="img" aria-label="${xml(branch.title)}"><rect width="100%" height="100%" fill="#f7f7f8"/>${edges}${boxes}</svg>`;
}

export function pngEligibility(svg: string, maxDimension = 8192): { format: "png" | "svg"; reason: string | null } {
  const width = Number(svg.match(/width="(\d+)/)?.[1] ?? 0);
  const height = Number(svg.match(/height="(\d+)/)?.[1] ?? 0);
  return width > 0 && height > 0 && width <= maxDimension && height <= maxDimension ? { format: "png", reason: null } : { format: "svg", reason: "图尺寸超过浏览器安全栅格化上限，已降级为 SVG。" };
}

export function cloneImportedWorkspace(raw: unknown, existingIds: ReadonlySet<string>, createId: () => string) {
  const value = migrateWorkspaceExport(raw);
  let id = createId();
  while (existingIds.has(id)) id = createId();
  value.workspace.id = id;
  value.workspace.title = `${value.workspace.title}（导入）`;
  value.workspace.activeBranchId = value.workspace.branches[0]?.id ?? "";
  value.isDemo = false;
  return value;
}
