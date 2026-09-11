import { MoreHorizontal, Plus, Search, Settings, Upload } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { WorkspaceArchiveService } from "../../application/archive/workspace-archive-service";
import { exportBranchSvg, exportWorkspaceMarkdown } from "../../domain/export/workspace-export";
import { createEmptyWorkspace } from "../../domain/workspace/create-workspace";
import { downloadText } from "../../infrastructure/export/download";
import type { WorkspaceRecord } from "../../infrastructure/storage/ideascope-database";
import { WorkspaceRepository } from "../../infrastructure/storage/workspace-repository";
import { Button, Dialog } from "../../shared/ui";
import styles from "./SessionSidebar.module.css";

export function SessionSidebar({ activeId, refreshKey = 0 }: { activeId?: string; refreshKey?: number }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [items, setItems] = useState<WorkspaceRecord[]>([]);
  const [matchedIds, setMatchedIds] = useState<Set<string>>(new Set());
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [deleting, setDeleting] = useState<WorkspaceRecord | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [status, setStatus] = useState("");
  const importFile = useRef<HTMLInputElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const repository = useMemo(() => new WorkspaceRepository(), []);
  const refresh = useCallback(() => void repository.list().then((value) => setItems(value.filter((item) => !item.archivedAt))), [repository]);

  useEffect(() => {
    let active = true;
    void repository.list().then((value) => { if (active) setItems(value.filter((item) => !item.archivedAt)); });
    return () => { active = false; };
  }, [refreshKey, repository]);

  useEffect(() => {
    let active = true;
    const term = query.trim().toLocaleLowerCase();
    if (!term) return () => { active = false; };
    void Promise.all(items.map(async (item) => {
      if (item.title.toLocaleLowerCase().includes(term)) return item;
      const workspace = await repository.get(item.id);
      return workspace?.workspace.messages.some((message) => message.text.toLocaleLowerCase().includes(term)) ? item : null;
    })).then((matches) => { if (active) setMatchedIds(new Set(matches.filter((item): item is WorkspaceRecord => Boolean(item)).map((item) => item.id))); });
    return () => { active = false; };
  }, [items, query, repository]);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleItems = normalizedQuery ? items.filter((item) => item.title.toLocaleLowerCase().includes(normalizedQuery) || matchedIds.has(item.id)) : items;

  async function create() {
    const value = createEmptyWorkspace();
    const result = await repository.save(value);
    if (result.status === "saved") void navigate(`/workspace/${value.workspace.id}`);
  }

  async function importSession(file?: File) {
    if (!file) return;
    try {
      const workspace = await new WorkspaceArchiveService().import(JSON.parse(await file.text()));
      setStatus(`已导入会话“${workspace.workspace.title}”。`);
      refresh();
      void navigate(`/workspace/${workspace.workspace.id}`);
    } catch (error) {
      setStatus(error instanceof Error ? `导入失败：${error.message}` : "导入失败。");
    } finally {
      if (importFile.current) importFile.current.value = "";
    }
  }

  async function withWorkspace(item: WorkspaceRecord, action: (value: NonNullable<Awaited<ReturnType<WorkspaceRepository["get"]>>>) => void) {
    try {
      const value = await repository.get(item.id);
      if (!value) throw new Error("探索项目不存在或已被删除。");
      action(value);
      setStatus(`已导出“${item.title}”。`);
    } catch (error) {
      setStatus(error instanceof Error ? `导出失败：${error.message}` : "导出失败。");
    }
  }

  async function exportArchive(item: WorkspaceRecord) {
    try {
      const value = await new WorkspaceArchiveService().create(item.id);
      downloadText(`${item.title}.ideascope-archive.json`, "application/json", JSON.stringify(value, null, 2));
      setStatus(`已导出“${item.title}”完整档案。`);
    } catch (error) {
      setStatus(error instanceof Error ? `导出失败：${error.message}` : "导出失败。");
    }
  }

  return <aside className={styles.sidebar}>
    <div className={styles.brandRow}><div className={styles.brand}>IdeaScope</div><Link className={styles.iconButton} aria-label="设置" to="/settings/provider" state={{ returnTo: location.pathname }}><Settings size={16} /></Link></div>
    <div className={styles.createRow}><button className={styles.newButton} onClick={() => void create()}><Plus size={16} />新建会话</button><button className={styles.iconButton} aria-label="导入会话" title="导入单个会话" onClick={() => importFile.current?.click()}><Upload size={16} /></button><input ref={importFile} hidden type="file" accept=".json,.ideascope-archive.json,application/json" onChange={(event) => void importSession(event.target.files?.[0])} /></div>
    <div className={styles.labelRow}><p className={styles.label}>探索会话</p><button className={styles.searchToggle} aria-label={searchOpen ? "关闭会话搜索" : "搜索对话记录"} onClick={() => { setSearchOpen((value) => !value); requestAnimationFrame(() => searchInput.current?.focus()); }}><Search size={14} /></button></div>
    {searchOpen ? <label className={styles.searchBox}><Search size={13} /><input ref={searchInput} aria-label="搜索对话记录" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索标题或对话内容" /></label> : null}
    <nav>{visibleItems.map((item) => <div key={item.id} className={`${styles.item} ${item.id === activeId ? styles.active : ""}`}>
      <button className={styles.open} onClick={() => void navigate(`/workspace/${item.id}`)}><strong>{item.title}</strong><span>{new Date(item.updatedAt).toLocaleDateString()}</span></button>
      <details className={styles.actions}>
        <summary aria-label={`${item.title} 的更多操作`}><MoreHorizontal size={15} /></summary>
        <div>
          <button onClick={() => { const title = window.prompt("新的会话名称", item.title); if (title) void repository.rename(item.id, title).then(refresh); }}>重命名</button>
          <button onClick={() => void exportArchive(item)}>导出完整档案</button>
          <button onClick={() => void withWorkspace(item, (value) => downloadText(`${item.title}.md`, "text/markdown", exportWorkspaceMarkdown(value)))}>导出 Markdown</button>
          <button onClick={() => void withWorkspace(item, (value) => { const branch = value.workspace.branches.find(({ id }) => id === value.workspace.activeBranchId); if (!branch) throw new Error("当前研究分支不存在。"); downloadText(`${item.title}-graph.svg`, "image/svg+xml", exportBranchSvg(branch, "complete")); })}>导出研究图</button>
          <button onClick={() => { setDeleting(item); setConfirmation(""); }}>删除</button>
        </div>
      </details>
    </div>)}</nav>
    {!items.length && <p className={styles.empty}>还没有探索会话</p>}
    {items.length > 0 && !visibleItems.length && <p className={styles.empty}>没有匹配的对话记录</p>}
    {status ? <p className={styles.status} role="status">{status}</p> : null}
    <Dialog open={Boolean(deleting)} title="删除探索会话" onClose={() => setDeleting(null)}>
      <p>删除后无法恢复。请输入“{deleting?.title}”确认。</p>
      <input aria-label="输入会话名称确认删除" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
      <div className={styles.confirm}><Button onClick={() => setDeleting(null)}>取消</Button><Button disabled={confirmation !== deleting?.title} onClick={() => { if (deleting) void repository.delete(deleting.id, confirmation).then(() => { if (deleting.id === activeId) void navigate("/"); setDeleting(null); refresh(); }); }}>确认删除</Button></div>
    </Dialog>
  </aside>;
}
