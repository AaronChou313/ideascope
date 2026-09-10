import { lazy, Suspense } from "react";
import { AppHeader } from "../shared/ui/AppHeader";
import { ConnectionLab } from "../features/provider-settings/ConnectionLab";
const LiteratureSearchLab = lazy(() =>
  import("../features/literature-search/LiteratureSearchLab").then(
    (module) => ({ default: module.LiteratureSearchLab }),
  ),
);
export function SettingsPage() {
  return (
    <>
      <AppHeader context="模型与来源设置" />
      <ConnectionLab />
      <Suspense fallback={<p role="status">正在加载检索工具…</p>}>
        <LiteratureSearchLab />
      </Suspense>
    </>
  );
}
