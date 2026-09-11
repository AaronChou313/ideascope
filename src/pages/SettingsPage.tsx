import { Navigate, NavLink, useLocation, useParams } from "react-router-dom";
import { AboutPanel } from "../features/provider-settings/AboutPanel";
import { ConnectionLab } from "../features/provider-settings/ConnectionLab";
import { DataSafetyPanel } from "../features/provider-settings/DataSafetyPanel";
import { LiteratureSourcePanel } from "../features/provider-settings/LiteratureSourcePanel";
import { ResearchProfilePanel } from "../features/provider-settings/ResearchProfilePanel";
import { AppHeader } from "../shared/ui/AppHeader";
import styles from "./SettingsPage.module.css";

const sections = ["provider", "literature", "profile", "data", "about"] as const;
const labels = { provider: "模型 Provider", literature: "文献来源", profile: "我的研究领域", data: "数据与存储", about: "关于" };
function safeReturnTo(value: unknown) { return typeof value === "string" && (value === "/" || value.startsWith("/workspace/")) ? value : "/"; }
export function SettingsPage() {
  const { section } = useParams(); const location = useLocation();
  const returnTo = safeReturnTo((location.state as { returnTo?: unknown } | null)?.returnTo);
  if (!section || !sections.includes(section as typeof sections[number])) return <Navigate to="/settings/provider" replace state={{ returnTo }} />;
  const current = section as typeof sections[number];
  return <><AppHeader context="设置" /><main className={styles.layout}><nav className={styles.nav} aria-label="设置页面">{sections.map((item) => <NavLink key={item} to={`/settings/${item}`} state={{ returnTo }} aria-current={item === current ? "page" : undefined}>{labels[item]}</NavLink>)}</nav><div className={styles.content}><NavLink className={styles.back} to={returnTo}>← {returnTo === "/" ? "返回首页" : "返回研究工作区"}</NavLink>{current === "provider" && <ConnectionLab />}{current === "literature" && <LiteratureSourcePanel />}{current === "profile" && <ResearchProfilePanel />}{current === "data" && <DataSafetyPanel />}{current === "about" && <AboutPanel />}</div></main></>;
}
