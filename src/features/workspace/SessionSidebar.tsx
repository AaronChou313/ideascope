import { Plus, MoreHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { WorkspaceRecord } from "../../infrastructure/storage/ideascope-database";
import { WorkspaceRepository } from "../../infrastructure/storage/workspace-repository";
import { createEmptyWorkspace } from "../../domain/workspace/create-workspace";
import styles from "./SessionSidebar.module.css";

export function SessionSidebar({ activeId, refreshKey = 0 }: { activeId?: string; refreshKey?: number }) {
  const navigate = useNavigate(); const [items, setItems] = useState<WorkspaceRecord[]>([]); const repository = useMemo(() => new WorkspaceRepository(), []);
  useEffect(() => { let active = true; void repository.list().then(value => { if (active) setItems(value.filter(item => !item.archivedAt)); }); return () => { active = false; }; }, [refreshKey, repository]);
  async function create() { const value = createEmptyWorkspace(); const result = await repository.save(value); if (result.status === "saved") void navigate(`/workspace/${value.workspace.id}`); }
  return <aside className={styles.sidebar}><div className={styles.brand}>IdeaScope</div><button className={styles.newButton} onClick={() => void create()}><Plus size={16}/>新建探索</button><p className={styles.label}>探索会话</p><nav>{items.map(item => <div key={item.id} className={`${styles.item} ${item.id === activeId ? styles.active : ""}`}><button className={styles.open} onClick={() => void navigate(`/workspace/${item.id}`)}><strong>{item.title}</strong><span>{new Date(item.updatedAt).toLocaleDateString()}</span></button><button className={styles.more} aria-label={`${item.title} 的更多操作`}><MoreHorizontal size={15}/></button></div>)}</nav>{!items.length && <p className={styles.empty}>还没有探索会话</p>}</aside>;
}
