import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { WorkspaceRecord } from "../../infrastructure/storage/ideascope-database";
import { WorkspaceRepository } from "../../infrastructure/storage/workspace-repository";
import styles from "./ProjectLibrary.module.css";

export function ProjectLibrary() {
  const navigate = useNavigate();
  const [items, setItems] = useState<WorkspaceRecord[]>([]);
  const [confirm, setConfirm] = useState<Record<string, string>>({});
  const repository = useMemo(() => new WorkspaceRepository(), []);
  const refresh = useCallback(async () => {
    try { setItems(await repository.list()); }
    catch { setItems([]); }
  }, [repository]);
  useEffect(() => {
    if (!("indexedDB" in globalThis)) return;
    let active = true;
    void repository.list().then((value) => { if (active) setItems(value); }, () => { if (active) setItems([]); });
    return () => { active = false; };
  }, [repository]);
  return <section className={styles.library} aria-labelledby="local-projects-title">
    <div><small>LOCAL PROJECTS</small><h2 id="local-projects-title">本地项目</h2><p>保存在当前浏览器；不会同步到云端。</p></div>
    {items.filter(({ archivedAt }) => !archivedAt).length ? items.filter(({ archivedAt }) => !archivedAt).map((item) => <article key={item.id}>
      <div><strong>{item.title}</strong><small>{new Date(item.updatedAt).toLocaleString()}</small></div>
      <button onClick={() => void navigate(`/workspace/${item.id}`)}>打开</button>
      <button onClick={() => { const title = window.prompt("新项目名称", item.title); if (title) void repository.rename(item.id, title).then(refresh); }}>重命名</button>
      <button onClick={() => void repository.archive(item.id).then(refresh)}>归档</button>
      <label>输入项目名确认删除<input aria-label={`确认删除 ${item.title}`} value={confirm[item.id] ?? ""} onChange={(event) => setConfirm((current) => ({ ...current, [item.id]: event.target.value }))}/></label>
      <button disabled={confirm[item.id] !== item.title} onClick={() => void repository.delete(item.id, confirm[item.id] ?? "").then(refresh)}>删除</button>
    </article>) : <p>还没有本地项目。写下想法即可创建一个不调用模型的探索起点。</p>}
  </section>;
}
