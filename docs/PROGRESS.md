# 开发进度

当前状态：**v0.3.0-C 检索配方与离线质量夹具已完成；v0.1.0-B 的真实 Provider 与 v0.1.0-C 的 Pages origin 仍待验证，因此 v0.1.0 整体门禁仍未关闭。**

| 阶段 | 状态 | 产物/证据 |
|---|---|---|
| 计划与设计 | 已形成文档包 | README、专题文档、契约草案、原型、包内检查报告 |
| v0.1.0-A | 已完成 | React/TypeScript/Vite 空壳、lockfile、严格检查、契约/示例测试、ADR 与依赖基线 |
| v0.1.0-B | 待验收 | 探针与错误分类已实现；OpenAlex localhost 浏览器通过；真实 Provider/Pages origin 待凭证与部署验证 |
| v0.1.0-C | 本地完成 | Hash 路由、Pages 子路径 production preview、CI/e2e 与手动部署 workflow 已验证；真实 Pages 待执行 |
| v0.2.0-A | 已完成 | 首页、三栏工作台、设置页、基础组件、折叠/响应式与三档截图 |
| v0.2.0-B | 已完成 | demo adapter、React Flow 语义节点、ELK 分层布局、列表视图与详情同步 |
| v0.2.0-C | 已完成 | 关键演示状态、来源与方向视图、可访问导出弹窗、移动视图切换、四档视觉基准与组件尺寸表 |
| v0.3.0-A | 已完成 | LiteratureAdapter、OpenAlex 普通关键词/游标/节流/取消/归一化、SearchRecord、脱敏诊断与真实 localhost 查询 |
| v0.3.0-B | 已完成 | DOI/arXiv/OpenAlex 规范化、精确/候选去重、Dexie Paper/Evidence/SearchRecord、版本关联与审阅界面 |
| v0.3.0-C | 已完成 | 四类检索配方、4 查询/60 候选预算、部分失败聚合、三学科离线夹具与质量审阅 |
| 其余版本 | 计划中 | 按路线逐阶段执行 |

## 每阶段记录模板

阶段 ID：
实施日期 / commit：
范围：
实际修改文件：
已完成：
测试命令与结果：
人工验收与截图：
未完成 / 待实测：
风险与决策：
下一阶段入口：

## v0.1.0-A 阶段记录

阶段 ID：v0.1.0-A

实施日期 / commit：2026-09-10 / 尚未创建 commit

范围：只建立仓库、生产空壳、工程检查、设计 token、契约严格编译与示例引用完整性校验；未实现真实智能体、Provider、文献检索、复杂图编辑或部署。

实际修改文件：

- 新增工程入口：`package.json`、`package-lock.json`、`.node-version`、`.gitignore`、`index.html`、Vite/Vitest/TypeScript/ESLint 配置。
- 新增生产空壳：`src/main.tsx`、`src/app/App.tsx`、CSS Module 与 `src/shared/styles/`。
- 新增检查：`tests/unit/app.test.tsx`、`tests/contract/*.test.ts`、`tests/setup.ts`、`scripts/check-secrets.mjs`。
- 新增记录：`docs/DEPENDENCY_BASELINE.md`、`docs/adr/0001-static-spa-and-contract-boundaries.md`。
- 修正契约：`contracts/graph-patch.schema.json` 的 sourced claim 条件分支显式声明 `evidenceLinks` 为数组，使其可由 Ajv Draft 2020-12 严格模式编译。
- 更新本文件。原计划、原型、示例和报告均保留；`MANIFEST.json` 继续作为原交付包快照，不重写为生产工程清单。

已完成：

- 本地初始化 Git 元数据；未创建远端、commit、推送或发布。
- React 19 + TypeScript 6 + Vite 8 生产工程和 npm lockfile。
- 严格 TypeScript：应用、测试与 `contracts/domain.ts` 均进入检查；契约额外启用 `exactOptionalPropertyTypes`。
- 设计变量转为生产 `src/shared/styles/tokens.css`；空壳保持黑/白/中性灰与克制蓝色焦点，并明确标注“不联网、不调用模型”。
- Ajv 严格编译补丁 Schema；测试合法补丁、未知字段/任意操作拒绝、sourced claim 必须有 evidence。
- 校验 demo workspace 的唯一 ID、Paper/Evidence/Claim/Node/Edge/Branch/Message/Run/Direction 跨记录引用及 patch workspace/branch/revision 锚定。
- 敏感信息形状扫描，不在源码、配置或构建内容中提供真实 key。

测试命令与结果：

- `npm install`：成功；安装并审计 263 个包，0 个已知漏洞。
- `npm run lint`：成功，0 error / 0 warning。
- `npm run typecheck`：成功。
- `npm run test`：成功，3 个测试文件、7 项测试全部通过。
- `npm run build`：成功，Vite 8.3.0 构建 19 个模块；产物 JS 221.77 kB（gzip 69.67 kB），CSS 3.59 kB（gzip 1.38 kB）。
- `npm run check:secrets`：成功，未发现 credential-shaped value。
- 聚合命令 `npm run check`：成功。

人工验收与截图：

- 本地 production preview `http://127.0.0.1:4173/` 在 Codex 内置 Chromium 以 1280×720 截图检查。
- 页面宽度与 viewport 同为 1280px，无横向溢出；主标题与阶段状态可见；控制台 0 error / 0 warning。
- 视觉为白底、灰线、黑字与单一蓝色状态点；未接入或呈现原型中的演示研究结论。
- 1600×1000、1440×900、390×844 以及正式工作台多页面视觉验收不属于本空壳的完整验收，留至 0.2 UI 阶段。

未完成 / 待实测：真实 Provider、流式/结构化输出与取消、OpenAlex 浏览器 CORS、目标 Pages origin、Hash 路由与子路径、React Flow/ELK、Zustand、Dexie 均尚未进行能力实现或验证。

风险与决策：TypeScript 最新 7.0.2 与 typescript-eslint 8.70.0 的 peer 范围不兼容，基线锁定为 TypeScript 6.0.3；不使用强制安装。`MANIFEST.json` 的哈希描述原始交付包，生产开发后自然不再代表当前树，保留其历史含义。

下一阶段入口：v0.1.0-B“浏览器真实连接探针”。先建立仅内存凭证存储与最小 Provider 表单，分别实测普通完成、流式、结构化/工具能力、取消和 OpenAlex 基础检索；没有用户明确提供的凭证与预算授权时，所有真实连接项必须保持“待验证”。

## v0.1.0-B 阶段记录

阶段 ID：v0.1.0-B（实现完成，真实 Provider 门禁待验收）

实施日期 / commit：2026-09-10 / 见本阶段 Git 提交（真实 Provider 门禁待补充）

范围：浏览器直连探针、仅内存凭证、OpenAI-compatible 能力分项、OpenAlex 匿名基础检索、取消与错误分类。不实现研究 Agent、持久化 Provider key、自动检索或公共代理。

实际修改文件：

- `src/features/provider-settings/ConnectionLab.tsx` 与 CSS Module：生产连接实验室。
- `src/infrastructure/llm/*`：Base URL 规范化和普通完成、流式、结构化输出、工具调用探针。
- `src/infrastructure/literature/openalex.ts`：固定非敏感查询的匿名浏览器探针。
- `src/infrastructure/network/errors.ts`：401/403/429/取消/网络或 CORS 分类。
- `src/infrastructure/secrets/memory-key-store.ts`：刷新与卸载后丢失的模块内存凭证。
- `tests/unit/connection-probes.test.ts`、应用空壳及其测试。
- `docs/COMPATIBILITY.md` 与本文件。

已完成：逐项能力状态、显式费用提示、受控 origin、HTTPS 约束、取消入口、OpenAlex 真实浏览器基础查询；不使用开发代理、`no-cors` 或公共 CORS 代理。

测试命令与结果：`npm run lint`、`npm run typecheck`、`npm run test`、`npm run build`、`npm run check:secrets` 均通过；4 个测试文件、13 项测试通过。production preview 的内置 Chromium 从 `http://127.0.0.1:4173` 直接读取 OpenAlex 响应成功，控制台 0 error / 0 warning。

人工验收与截图：1280px 浏览器视图检查通过；Provider 表单、四项能力按钮、取消入口、OpenAlex 状态与长题名无横向溢出。OpenAlex 实测返回 count 187,295，首条题名为 *Retrieval-Augmented Generation for Large Language Models: A Survey*；这是当时 API 响应，不是稳定数据或研究结论。

未完成 / 待实测：未获得并获准使用真实 Provider 凭证，因此普通完成、流式、结构化输出、工具调用、真实取消与 usage reporting 保持待验证；目标 Pages HTTPS origin 也未验证。

风险与决策：每个 Provider 探针可能产生费用，只允许用户主动点击。AbortSignal 只保证客户端停止继续处理，不承诺供应商停止计费。OpenAlex localhost 成功不能代替 Pages origin 成功。

下一阶段入口：先由用户选择是否提供一个允许浏览器调用、可产生极小测试费用的 Provider 配置以完成 0.1-B 门禁；门禁完成后进入 v0.1.0-C，实施 Hash 路由、Vite base、Pages workflow 草案、production preview 子路径与失败样例。

## v0.1.0-C 阶段记录

阶段 ID：v0.1.0-C（本地与 workflow 草案完成，真实 Pages 待执行）

实施日期 / commit：2026-09-10 / 见本阶段 Git 提交

范围：HashRouter、可配置 Vite base、GitHub Actions CI、手动 Pages workflow、项目子路径 production preview、e2e 与部署检查清单。不修改远端 Pages 设置，不自动运行部署 workflow。

实际修改文件：`vite.config.ts`、`playwright.config.ts`、`src/main.tsx`、`tests/e2e/static-preview.spec.ts`、`.github/workflows/{ci,pages}.yml`、`public/favicon.svg`、`docs/DEPLOYMENT_CHECKLIST.md`、依赖与本文件。

已完成：

- 应用使用 HashRouter；构建 base 由非敏感的 `IDEASCOPE_BASE_PATH` 设置。
- production preview 以 `/ideascope/#/` 打开并加载同子路径 JS/CSS/favicon。
- 未配置模型和 key 时，可能付费的 Provider 探针在 e2e 中保持禁用。
- push/PR CI 运行 lockfile 安装与完整门禁；Pages workflow 只允许手动触发。
- 401/403/429、取消、网络或 CORS 的用户可操作错误分类具备单测。

测试命令与结果：`npm run check` 包含 lint、严格 typecheck、15 项 unit/contract 测试、production build、2 项 Playwright e2e 与 secret scan，全部通过。子路径首次 e2e 暴露 preview 未挂载 base 导致资源 404，补充 `vite preview --base /ideascope/` 后通过；随后补齐 base-aware favicon，控制台 404 清零。

人工验收与截图：连接实验室此前已在 1280px Chromium 截图检查；本阶段以 Playwright Headless Chromium 153 验证 `/ideascope/#/` 页面、标题、探针禁用状态与零 console error。

未完成 / 待实测：未运行 `.github/workflows/pages.yml`，未验证真实 Pages URL、刷新、资源、OpenAlex CORS 或 Pages 环境权限；尚无 ELK Worker，Worker 路径留至其首次引入时验证。

风险与决策：仓库名当前按 `ideascope` 设置 base；仓库改名或自定义域上线时必须同步调整。push 不触发 Pages 部署，避免把“允许推送”扩展成“允许发布”。

下一阶段入口：v0.1.0 仍被真实 Provider 门禁阻塞。完成一次经用户授权的普通、流式、结构化/工具与取消实测，并验证目标 Pages origin 后，才可将 v0.1.0 标为完成；否则可按路线允许的条件并行进入 v0.2.0-A，但必须继续显示连接待验证。

## v0.2.0-A 阶段记录

阶段 ID：v0.2.0-A

实施日期 / commit：2026-09-10 / 见本阶段 Git 提交

范围：按原型与设计系统实现 Typography、Button/Input/Dialog/Tabs/Tooltip、首页、工作台、设置页、左右折叠、空状态和响应式页面壳；不实现语义图、真实对话或业务持久化。

实际修改文件：`src/pages/*`、`src/shared/ui/*`、`src/shared/i18n/zh-CN.ts`、路由入口、e2e 与 `reports/visual/*`。

已完成：首页保留编辑式标题与输入入口；未配置模型时输入保留并引导设置；工作台采用 60px 顶栏、216px 左栏、380px 右栏和中央填满画布；设置页承接既有连接实验室。常用文案开始集中管理，组件不复制原型单文件脚本。

测试命令与结果：`npm run check` 通过；15 项 unit/contract、5 项 Playwright e2e（含 1600×1000、1440×900、1280×800 横向溢出检查）通过；build 与 secret scan 通过。

人工验收与截图：已检查 `reports/visual/workspace-{1600x1000,1440x900,1280x800}.png`。1440×900 下三栏比例、工具栏、空状态与字体清晰，无横向溢出；主体只使用黑白灰，蓝色未被用作大面积背景。

未完成 / 待实测：Dialog 当前覆盖 Esc、遮罩关闭与初始焦点，完整 focus trap/焦点恢复留在 0.2-C 可访问性收尾；<900px 的工作台视图切换、真实节点内容及节点/详情联动分别留待 0.2-B/C。

风险与决策：0.2-A 的中央画布刻意为空，不将原型示例冒充业务接入；点阵仅使用中性灰。v0.1 的真实 Provider 与 Pages 门禁仍保持待验证。

下一阶段入口：v0.2.0-B，使用 demo adapter 读取现有示例数据，引入 React Flow 自定义语义节点、ELK 初始布局、关系列表替代视图与节点/右栏双向选择。

## v0.2.0-B 阶段记录

阶段 ID：v0.2.0-B

实施日期 / commit：2026-09-10 / 见本阶段 Git 提交

范围：React Flow 自定义语义节点、关系标签、缩放/适应画布、ELK 初始分层布局、结构列表、分支切换、节点与右栏详情同步；不实现真实模型或研究数据写入。

实际修改文件：`src/features/graph/*`、`src/infrastructure/demo/workspace-demo.ts`、`src/pages/WorkspacePage.*`、图布局单测、e2e 与三档视觉截图。

已完成：

- 示例数据只通过 demo adapter 读取并以 `structuredClone` 隔离，不在组件中另造一套研究结果。
- 图节点投影 question/approach/gap/direction 等语义实体，Paper 保持证据实体而非画布节点。
- ELK 使用固定 RIGHT layered 布局，无力导向动画；React Flow 负责选择、缩放和 fit view。
- 所有节点统一白底灰边；question 黑色左线、direction 蓝色左线、selected 蓝色细框，gap 仅用小面积待验证标签。
- 地图点击与结构列表点击均同步右栏详情；分支切换保持各分支焦点。

测试命令与结果：`npm run check` 通过；5 个 unit/contract 文件共 17 项测试、6 项 Playwright e2e 通过，包含 demo 深拷贝、ELK 坐标、节点/详情/列表联动和三档无横向溢出检查。构建成功；主入口 475.08 kB（gzip 152.20 kB），ELK 动态 chunk 1,431.53 kB（gzip 442.30 kB）。

人工验收与截图：重新生成并检查 `reports/visual/workspace-{1600x1000,1440x900,1280x800}.png`，等待 ELK 节点真实出现后再截图。1440×900 下 7 个节点、8 条关系、右栏所选 gap 判断均可见，标签未裁切，无横向溢出。

未完成 / 待实测：来源面板的 Paper/Evidence 展开、移动端右栏抽屉、关键加载/失败/取消/待应用状态、方向卡与导出弹窗留待 0.2-C。ELK bundle 虽已从主入口动态拆分，仍超过 500 kB warning；首次引入 Worker 时继续评估传输与缓存，不调高阈值掩盖警告。

风险与决策：图渲染状态不作为业务数据源；React Flow nodes/edges 每次由 Branch GraphModel 投影。所有示例研究判断继续显示“示例整理、非完整调研”。

下一阶段入口：v0.2.0-C，补齐关键演示状态、来源面板、方向卡、导出弹窗、移动端视图切换与完整 Dialog focus trap，并冻结视觉尺寸基准。

## v0.2.0-C 阶段记录

阶段 ID：v0.2.0-C

实施日期 / commit：2026-09-10 / 见本阶段 Git 提交

范围：完成首访、加载、无结果、失败、取消与待应用变更的可信演示状态；补齐来源、方向、导出边界、移动端视图切换及 Dialog 键盘可访问性；冻结 v0.2 视觉尺寸。未实现真实模型、实时检索、持久化或正式导出。

实际修改文件：`src/features/workspace/*`、`src/pages/WorkspacePage.*`、`src/shared/ui/index.tsx`、`tests/e2e/static-preview.spec.ts`、`docs/COMPONENT_SIZES.md`、`reports/visual/*` 与本文件。

已完成：

- 演示状态选择器覆盖首访、正常、加载、无结果、失败、已取消与待应用；状态文案明确没有网络请求、实时检索或业务写入。
- 文献与证据视图只展示 demo adapter 中的示例记录，并提供公开来源链接；方向卡持续标注“示例方向 · 未核查新颖性”。
- 导出弹窗明确完整 JSON/Markdown/SVG/PNG 导出属于 v0.6-B，不生成残缺文件；Dialog 支持初始焦点、Tab/Shift+Tab 环绕、Esc 关闭和触发点焦点恢复。
- 小于 900px 时使用地图 / 资料 / 详情三视图切换并隐藏空白侧轨；桌面三栏结构不变。
- `docs/COMPONENT_SIZES.md` 冻结顶栏、侧栏、工具栏、节点、控件与断点尺寸。

测试命令与结果：`npm run check` 通过；ESLint 与严格 typecheck 通过；5 个 unit/contract 文件共 17 项测试通过；production build 通过；8 项 Playwright e2e 通过，覆盖 Pages 子路径、付费探针禁用、节点双向选择、所有关键演示状态、来源/方向、导出边界与焦点管理、390×844 移动视图、三档桌面无横向溢出；secret scan 通过。

人工验收与截图：检查 `reports/visual/workspace-1440x900.png` 与 `reports/visual/workspace-390x844.png`，并生成 1600×1000、1440×900、1280×800、390×844 四档基准。桌面保持白/灰面板、单一蓝色选择态和完整三栏比例；移动端地图可平移查看完整语义结构，底部切换栏不遮挡画布控件，无页面级横向溢出。

未完成 / 待实测：真实 Provider 能力、Pages HTTPS origin 与 OpenAlex 在 Pages 上的 CORS 仍待用户提供凭证或执行部署后验证；导出仅为边界说明，实际实现留到 v0.6-B。

风险与决策：ELK 动态 chunk 为 1,431.53 kB（gzip 442.30 kB），构建仍给出超过 500 kB 的非阻断警告；继续保留警告并在 Worker/加载策略阶段评估，不上调阈值掩盖。移动端不把完整横向图压缩到不可读，而是保留可平移画布。

下一阶段入口：v0.3.0-A，按路线实现 OpenAlex 检索适配器、查询/游标/限速与错误契约；先复核现有探针边界，不调用付费模型，不把检索结果直接写成模型判断。

## v0.3.0-A 阶段记录

阶段 ID：v0.3.0-A

实施日期 / commit：2026-09-10 / 见本阶段 Git 提交

范围：实现 OpenAlex 普通关键词检索适配器、游标与产品预算上限、串行节流、取消/超时、运行时响应校验、Paper 归一化、SearchRecord 与脱敏诊断，并提供用户主动触发的真实查询列表。不实现 semantic search、持久化缓存、去重合并、证据判断或模型生成关键词。

实际修改文件：`src/domain/search/*`、`src/infrastructure/literature/*`、`src/features/literature-search/*`、设置页、检索 unit/e2e、`docs/LITERATURE_SEARCH.md`、`docs/COMPATIBILITY.md`、检索页视觉截图、依赖锁与本文件。

已完成：

- `LiteratureAdapter.search(query, options, signal)` 返回 normalized Paper、next cursor 与 SearchRecord；单轮最多 60 条、最多 5 页，每页不超过 100 条。
- 使用 OpenAlex 普通 `search`、`cursor`、`select`、筛选与显式排序；不启用 `search.semantic`。共享 RequestThrottle 默认 120ms 间隔，整轮 30 秒超时。
- Zod 校验响应；缺失摘要保持 null，倒排摘要只按位置还原；外部文本经 React 文本节点显示，不执行 HTML。
- 中文原始想法、实际关键词、语言和转换依据分离；含中文的想法不能原样作为关键词提交。
- 缓存键覆盖来源、关键词、筛选、排序、字段和语言。脱敏诊断仅保存固定 endpoint、状态、额度响应头、请求费用与错误码，不保存完整 URL、凭证或响应体。
- 设置页新增真实关键词检索实验室；用户点击前不发请求，结果只保留当前组件内存，不调用模型、不自动生成研究判断。

测试命令与结果：`npm run check` 全部通过；ESLint、严格 typecheck、6 个 unit/contract 文件共 25 项测试、production build、9 项 Playwright e2e 与 secret scan 均成功。新增 8 项适配器/契约单测覆盖请求参数、归一化、游标与 60 条上限、429/503、空结果、异常响应、超时、取消、中文查询边界及缓存键；Playwright 增加真实查询 UI 的受控响应测试，并验证实际网络 URL 不含中文原始想法。

人工验收与截图：`reports/visual/literature-search-1440x1000.png` 已检查；检索表单、来源/状态/数量与结果层级清晰，延续黑白灰与克制蓝色主操作。localhost production preview 使用 Chromium 从页面真实请求 OpenAlex 成功，查询为 `retrieval augmented generation reliability evidence`、`cursor=*`、`per_page=10`，归一化 10 条记录；首条题名为 *Retrieval-Augmented Generation for Large Language Models: A Survey*。

未完成 / 待实测：未真实触发 OpenAlex 429；API key、Authorization header、长期额度、GitHub Pages HTTPS origin 和 Pages CORS 待验证。SearchRecord 与结果尚未写 Dexie；缓存策略、去重、版本关联与证据片段属于后续阶段。

风险与决策：OpenAlex 2026-08 官方文档描述免费匿名基础使用，同时 Search 请求会计入 API 费用/预算；界面因此明确“消耗匿名 API 预算”。Zod 和检索 UI 通过 lazy chunk 隔离，主入口保持约 482 kB；ELK 动态块的既有体积警告仍存在。

下一阶段入口：v0.3.0-B，先实现 DOI/arXiv/OpenAlex ID 规范化与候选去重，再建立 Dexie PaperStore/EvidenceStore 和人工审阅界面；不得凭题名生成摘要，也不得把相似题目静默合并。

## v0.3.0-B 阶段记录

阶段 ID：v0.3.0-B

实施日期 / commit：2026-09-10 / 见本阶段 Git 提交

范围：规范 DOI、arXiv 与 OpenAlex ID，区分精确重复和候选重复；建立 Dexie Paper/Evidence/SearchRecord 表与 repository；将检索结果保存到本地文献库并提供候选重复人工决策。不实现检索配方、模型摘要、全文抓取或静默合并。

实际修改文件：`src/domain/evidence/*`、`src/infrastructure/storage/*`、`src/features/literature-search/*`、fake IndexedDB 测试、e2e、依赖锁、检索文档、视觉截图与本文件。

已完成：DOI 去 URL/前缀并小写；arXiv base ID 与版本可解析；OpenAlex Work ID 统一大写。相同精确 ID 复用已有记录；规范化题名、首位作者与相近年份只提示候选。人工可“关联为不同版本”或“保留独立”，关联保持两条 Paper。摘要缺失显示“摘要缺失”，不会按题名补写。Evidence 必须指向已保存 Paper，同 ID 不同内容不可覆盖。检索记录与 Paper 写入 IndexedDB，但不包含 Provider 密钥。

测试命令与结果：`npm run check` 全部通过；ESLint、严格 typecheck、7 个 unit/contract 文件共 30 项测试、production build、9 项 Playwright e2e 与 secret scan 均成功。新增 fake IndexedDB 单测覆盖三类 ID、精确/候选重复、Paper 持久化、Evidence 外键与不可变快照、显式版本关联；e2e 覆盖两条相似记录触发候选审阅、保留独立及本地库计数。

人工验收与截图：已检查更新后的 `reports/visual/literature-search-1440x1000.png`；本地库、摘要深度、精确 ID 和查询记录层级清楚，候选审阅只用小面积琥珀边框，未改变既有黑白灰视觉基线。

未完成 / 待实测：真实跨来源重复、预印本与正式发表版本关系需要 0.3-C 夹具与人工质量审阅；当前只保存 OpenAlex 元数据/摘要，不声称取得全文。IndexedDB 迁移、备份恢复和容量压力留到 v0.6。

风险与决策：题名相似不自动合并；版本关联也不把两条记录计算成两份独立证据。引文计数未进入证据强度。候选审阅决定当前只反映在 Paper 版本关联或保留独立，不建立不可解释的相似度阈值。

下一阶段入口：v0.3.0-C，实现综述/代表路线/近期/反证四类检索配方、预算组合、至少三个学科的离线夹具及质量审阅记录；单一来源失败不得导致整轮丢失。

## v0.3.0-C 阶段记录

阶段 ID：v0.3.0-C

实施日期 / commit：2026-09-10 / 见本阶段 Git 提交

范围：建立入门综述、代表路线、近期研究、反证/局限四类检索配方；限制查询与候选预算；聚合部分成功；提供计算机科学、公共卫生、人文学科三组离线夹具与质量审阅。不增加第二个未经验证的真实来源，不启用 semantic search。

实际修改文件：`src/domain/search/recipes.ts`、`examples/search-recipes.fixture.json`、`tests/unit/search-recipes.test.ts`、检索页配方预览、e2e、`reports/search-quality-review.md`、视觉截图与本文件。

已完成：每个配方固定最多 4 查询、每项 15 条、总候选 60；近期配方使用显式年份筛选，反证配方使用领域相关 limitation/bias/confounding 等术语。每条查询保留中文原始想法、英文关键词、语言与生成依据。运行器逐来源/目的记录失败并保留其他成功结果。界面可在不联网、不调用模型的情况下预览四类实际查询。

测试命令与结果：`npm run check` 全部通过；ESLint、严格 typecheck、8 个 unit/contract 文件共 32 项测试、production build、9 项 Playwright e2e 与 secret scan 均成功。新增配方单测验证三学科均覆盖四类目的、预算不超限、转换依据存在，以及单个来源调用失败时其余三类结果保留。

人工验收与质量审阅：`reports/search-quality-review.md` 逐案记录纳入/排除理由和离线审阅结论；这是配方审阅，不冒充实时召回率或科研质量结论。检索页配方预览延续现有紧凑工具视觉。

未完成 / 待实测：三组夹具尚未在多个真实来源进行召回率/精确率抽样；当前只有 OpenAlex 已在 localhost 浏览器验证。真实多源、语义检索与引文链不是 v0.3 必需项。

风险与决策：固定配方是可解释起点，不是领域分类结论；用户或后续单智能体可修正术语。缺一来源不崩溃不等于隐藏失败，失败仍保留 source、purpose 与受控原因。

下一阶段入口：v0.4.0-A，建立单一 AgentController、意图/状态机、ProviderAdapter、严格结构化/JSON 回退、上下文预算、取消与 mock LLM 测试；在没有真实 Provider 凭证时不得声称真实模型端到端通过。
