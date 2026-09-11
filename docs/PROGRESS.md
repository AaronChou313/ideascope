# 开发进度

当前状态：**v0.6.7-B 已完成工程实现：六类文献入口进入统一 Registry，arXiv/IEEE adapter 与 Google Scholar 外部入口已建立；arXiv 官方 API 的浏览器 CORS、IEEE 真实凭证仍待外部门禁验证。**

| 阶段       | 状态                  | 产物/证据                                                                                                      |
| ---------- | --------------------- | -------------------------------------------------------------------------------------------------------------- |
| 计划与设计 | 已形成文档包          | README、专题文档、契约草案、原型、包内检查报告                                                                 |
| v0.1.0-A   | 已完成                | React/TypeScript/Vite 空壳、lockfile、严格检查、契约/示例测试、ADR 与依赖基线                                  |
| v0.1.0-B   | 待验收                | 探针与错误分类已实现；OpenAlex localhost 与 Pages origin 浏览器通过；真实 Provider 待凭证与调用授权            |
| v0.1.0-C   | 已完成                | Hash 路由、Pages 子路径、CI/e2e 与手动部署 workflow 已验证；真实 Pages HTTPS origin 与 OpenAlex CORS 通过      |
| v0.2.0-A   | 已完成                | 首页、三栏工作台、设置页、基础组件、折叠/响应式与三档截图                                                      |
| v0.2.0-B   | 已完成                | demo adapter、React Flow 语义节点、ELK 分层布局、列表视图与详情同步                                            |
| v0.2.0-C   | 已完成                | 关键演示状态、来源与方向视图、可访问导出弹窗、移动视图切换、四档视觉基准与组件尺寸表                           |
| v0.3.0-A   | 已完成                | LiteratureAdapter、OpenAlex 普通关键词/游标/节流/取消/归一化、SearchRecord、脱敏诊断与真实 localhost 查询      |
| v0.3.0-B   | 已完成                | DOI/arXiv/OpenAlex 规范化、精确/候选去重、Dexie Paper/Evidence/SearchRecord、版本关联与审阅界面                |
| v0.3.0-C   | 已完成                | 四类检索配方、4 查询/60 候选预算、部分失败聚合、三学科离线夹具与质量审阅                                       |
| v0.4.0-A   | 已完成                | 单一 AgentController、状态轨迹、ProviderAdapter、结构化/JSON 回退、预算、上下文、工具校验与 mock 测试          |
| v0.4.0-B   | 已完成                | GraphPatch reducer、证据/锁定/revision 校验、原子事务、checkpoint、幂等回执与引用渲染                          |
| v0.4.0-C   | 工程完成 / 外部待验收 | 运行状态与中断恢复、reported/unknown usage、端到端审查；真实 Provider 未调用                                   |
| v0.5.0-A   | 已完成                | 追问意图门禁、焦点邻域、补丁预览/应用/撤销与多轮 e2e                                                           |
| v0.5.0-B   | 已完成                | BranchService、快照/消息/运行隔离、活动运行门禁与晚到响应拒绝                                                  |
| v0.5.0-C   | 已完成                | 非破坏折叠、合并建议、完整方向卡片与用户保存/排除状态                                                          |
| v0.6.0-A   | 已完成                | workspace 持久化、刷新/中断恢复、quota、版本迁移、项目生命周期与单写者租约                                     |
| v0.6.0-B   | 已完成                | JSON/Markdown/SVG/PNG、敏感内容审计、SVG 降级、导入新项目与下载 e2e                                            |
| v0.6.0-C   | 已完成                | 安全文本、endpoint/redirect 限制、脱敏诊断、全量清除、攻击夹具与数据流说明                                     |
| v0.6.1     | 已完成                | Chat Completions、Responses、Anthropic Messages 三协议 Adapter；DeepSeek 完成/JSON 实测与三类 mock 契约        |
| v0.6.2     | 已完成                | 四项探针严格判定、完整流事件解析、failed 状态、脱敏错误诊断与一键测试                                          |
| v0.6.3     | 已完成                | Provider 非敏感配置持久化与 active guard、四个设置子页、来源健康检查、returnTo、探索历史列表与首次使用回归     |
| v0.6.4     | 已完成                | 直接工作台、Session Sidebar、真实 Initial Exploration、节点继续、增量图、方向分支、真实 DeepSeek/OpenAlex 验收 |
| v0.6.5     | 已完成                | 可展开研究进度、OpenAlex 部分结果容错与 Crossref/Semantic Scholar 降级、会话级 Key 恢复、节点主上下文          |
| v0.6.6     | 工程完成 / 真实待复测 | Root/parent/depth、Primary/Cross、层级综合契约、节点上下文、稳定增量布局、短关系标签与 Workspace v2 迁移       |
| v0.6.7-A   | 已完成                | Literature Source Manifest/Capability/Installation/Registry、三类内置来源注册与既有降级路径回归              |
| v0.6.7-B   | 工程完成 / 外部待验收 | arXiv Atom、IEEE 可选凭证适配、Google Scholar 外部入口、六来源能力清单；浏览器 CORS/IEEE Key 待验证            |

## v0.6.7-B 阶段记录

实施日期：2026-09-11。

范围：扩展内置 Literature Source，不改变探索流程的当前主源/降级语义，不实现 Source 设置 UX 或复杂 Router。

已完成：新增 arXiv Atom adapter，归一化版本 ID、标题、作者、年份、摘要与 DOI；新增 IEEE Xplore 声明式认证描述和可选 adapter，API Key 只由运行时 credential callback 提供，缺失时 installation 默认禁用且不发请求，诊断 endpoint 不含 query secret；Google Scholar 仅提供安全编码的外部搜索 URL，不创建自动抓取 adapter。Registry 现在枚举 OpenAlex、Crossref、Semantic Scholar、arXiv、IEEE Xplore 与 Google Scholar 六类入口。

真实检查：2026-09-11 从开发环境请求 arXiv 官方 Atom endpoint，返回 HTTP 200 和真实结果；响应头未见 `Access-Control-Allow-Origin`，因此静态 Pages 浏览器直连可能被 CORS 阻止，不能标记为真实浏览器已验证。IEEE 未提供独立 API Key，保持“未配置/待验证”，且不会阻塞现有来源。

测试：`npm run check` 通过，包括 ESLint、严格 TypeScript、23 个 Vitest 文件 / 111 项测试、production build、5 项 Playwright E2E 与 secret scan。覆盖 Manifest contract、Registry、arXiv Atom 归一化、IEEE 无 Key 零请求、Google Scholar 仅外部链接，以及既有三来源 adapter 回归。构建仍有既有 2.17 MB 主 chunk 非阻断警告。

下一阶段入口：v0.6.7-C，简化文献来源设置体验；arXiv 浏览器 CORS 和 IEEE 凭证不得在 UI 中伪装可用。

## v0.6.7-A 阶段记录

实施日期：2026-09-11。

范围：只建立 Literature Source Contract 与 Registry 基线；未实现来源商店、Source Assistant、第三方清单导入 UI、复杂多来源排序或 v0.6.7-B 之后的能力。

契约与注册表：新增 `ideascope.literature-source` manifest 的 JSON Schema 与等价 Zod 严格校验，定义来源身份、适配器描述、认证描述和 search/abstract/citations/references/filter/fullText/directLookup 能力状态。`SourceInstallation` 只保存启用状态、时间和凭证槽位引用；Manifest 不允许 API Key、Authorization 或任意额外字段。`SourceRegistry` 负责注册、枚举、能力查询、启用门禁与统一 `LiteratureAdapter` 创建。

内置来源与探索行为：OpenAlex、Crossref、Semantic Scholar 以只读 built-in manifest 注册。`runExploration` 不再直接实例化具体适配器，而从 Registry 获取 OpenAlex 主来源，并在出现既有检索警告时按 Crossref、Semantic Scholar 顺序降级。部分成功候选继续保留；禁用来源不会实例化或执行；本阶段没有改变查询预算、去重、Evidence 映射或综合流程。

兼容与迁移：Workspace formatVersion 保持 2，不需要业务数据迁移；新建/恢复记录的 `createdWith` 更新为 0.6.7。当前三个来源默认视为内置启用安装，尚未持久化用户可编辑来源安装，也未改变 Provider/API Key 的既有会话存储策略。

测试：`npm run check` 通过，包括 ESLint、严格 TypeScript、23 个 Vitest 文件 / 108 项测试、production build、5 项 Playwright E2E 与 secret scan。新增 Manifest JSON Schema/Zod 正反例、额外 secret 字段拒绝、内置来源枚举、能力查询、disabled 门禁、OpenAlex 回归、Crossref 与 Semantic Scholar 降级归一化和探索路径回归。构建仍有既有 2.16 MB 主 chunk 非阻断警告。

人工验收：本阶段没有修改页面结构或视觉，不生成新的产品截图；浏览器行为由既有 production E2E 回归覆盖。

下一阶段入口：停止在 v0.6.7-A，等待确认后再进入 v0.6.7-B；不自动继续实现 Source Assistant、来源导入 UI 或 v0.7.0。

## v0.6.6 阶段记录

实施日期 / commits：2026-09-11 / `6afd996`（Graph Contract、Agent Contract、交互与布局）及最终验收提交。

范围：只重构 Research Map 数据结构、探索综合契约、节点上下文交互、布局和边渲染；未进入 v0.7.0，未改 Provider、文献来源、Session Sidebar 或 Settings 架构。

Graph Contract：Workspace export 升为 formatVersion 2。GraphNode 新增 `parentId` 与 `depth`；GraphEdge 新增 `primary/cross` role。Root 唯一、父子 depth、Primary Edge 与无环结构由 Domain 校验。旧 v0/v1 Workspace 按 question/入度选择 Root，用有向 BFS 推断主树，无法纳入主树的关系降为 Cross；Paper、Evidence、Claim、Message 均保留，迁移后的旧 positions 清空一次并重新建立可持久化布局。

Agent Contract：系统在 Intent Plan 后确保唯一 Root；模型只输出带 `tempId/parentRef/existingNodeId` 的层级节点草案和最多 5 条 Cross Link。首次探索限制为 Root 后最多两层；节点上下文探索默认向 anchor 右侧扩展。Evidence ID、已有节点引用、父引用、节点预算和树结构全部验证后转换为 GraphPatch 原子应用；非法结构不会部分写入。

交互与布局：普通点击只更新 `selectedNodeId` 并打开详情，不改变 Agent 上下文。“基于此节点继续探索”仅设置 `composerContextNodeId`、Context Chip 和输入焦点，不自动请求；发送显式传入 contextNodeId。全图整理仅使用 Primary Edge；增量布局复用 `Branch.view.positions`，旧节点保持原位置，只在父节点右侧安置新增子树；viewport 持久化。Primary 使用 step 正交实线，Cross 使用低透明虚线；Canvas 默认不显示关系长句，选中/Context 直连关系只显示受控短标签。节点收紧为 228×148，Root、Selected、Context、Gap 使用克制的黑灰蓝/amber 标识。

自动测试：`npm run lint`、`npm run typecheck`、`npm test`（21 files / 100 tests）、`npm run build` 与 `npm run test:e2e`（5/5）通过。覆盖旧格式迁移、唯一 Root、Primary/Cross、非法 depth 拒绝、depth 列布局、Cross 不参与层级、增量旧位置稳定、首次层级生成、anchor 子树、普通选择不改变 Context、Context Chip、刷新恢复。production build 仍有既有 2.15 MB chunk 非阻断警告。

真实测试：用户授权的临时 DeepSeek `deepseek-chat` 与 OpenAlex 在本地完成 4 组查询、取得 27 条候选资料并返回综合；但该次 Chrome 标签复用了 v0.6.5 HMR 模块，模型返回旧自由网络格式，不能作为 v0.6.6 新层级契约的真实通过证据。v0.6.6 新契约已由 mock production E2E 通过，仍需在干净 origin 用真实凭证复测首次 Root/路线结构和第二轮 anchor 子树。

截图：`reports/visual/v0.6.6/` 包含空工作台三档、首次层级图、节点选择、Context Chip、Focused Expansion、Provider Settings 与刷新恢复。截图来自最新 production E2E，不沿用旧版本图片。

下一阶段入口：停止在 v0.6.6，等待真实使用反馈；不进入 v0.7.0。

## v0.6.5 阶段记录

实施日期：2026-09-11。

问题与修复：OpenAlex 公共 API 返回 429 时，旧逻辑会把任意一次查询失败升级为整轮失败，即使此前已有候选也会停止。现在保留已成功候选、停止继续请求受限来源，并按 Crossref、Semantic Scholar 顺序尝试补充；只有所有来源都没有取得可分析资料才停止。部分检索受限会作为进度警告和最终回复限制说明呈现，不再伪装完整成功。

体验变化：对话中的单一瞬时状态改为运行时自动展开、完成后可折叠的步骤记录，展示意图理解、检索计划、候选数量、来源降级、综合和地图更新。API Key 使用 sessionStorage 与内存双层会话存储，刷新恢复、关闭标签页清除，仍不进入 IndexedDB、导出、URL、日志或源码。点击节点即更新 active focus；Agent 输入明确拆分为主要上下文（节点、邻域、节点 Evidence）和整体上下文（Research Summary、Scope、图谱轮廓、近期对话）。

真实验收：使用用户授权的临时 DeepSeek `deepseek-chat` 凭证与真实公网来源，在 localhost 输入“我想研究激光雷达在机器人定位导航方面的作用”。当 OpenAlex 返回 429 时，Crossref 降级成功；首次探索生成 4 组查询、15 条 Evidence、12 个节点，并正常完成回复和本地保存。随后从节点执行“围绕此处继续”，图增量扩展到 23 个节点、38 条 Evidence，首轮节点与对话保留。刷新设置页后 Provider 显示仍可使用。未记录或提交凭证；未测得 Provider 返回的精确计费金额。

自动测试：`npm run check` 通过，包括 ESLint、严格 TypeScript、21 个 Vitest 文件 / 94 项测试、production build、5 项 Playwright E2E 与 secret scan。新增部分成功限流、完全无资料失败、Crossref 归一化、会话 Key 存取和可展开进度覆盖。构建仍有既有大 chunk 非阻断警告。

限制：sessionStorage 并非操作系统安全钥匙串，同源脚本若被攻破仍可能读取；这是在纯前端静态部署与刷新可用性之间的明确折中。Semantic Scholar 已接入并有契约测试，真实本轮因 Crossref 已取得足量资料而未继续调用。当前“节点式对话”实现为节点焦点化上下文，消息仍按 Branch 保存为时间序列，尚未改成每节点独立消息树。

视觉修复：根据真实 9 节点截图修正 Research Canvas。ELK 原先按 220×132 估算，但内容卡片高度远大于 132px，导致相邻层和同层节点遮挡；现统一为 232×214 的可预测节点尺寸，标题/摘要受控截断，并增加正交路由、层间距、边到节点间距与最终碰撞消解。右侧研究过程的步骤文字不再继承 7px 状态点尺寸，展开后保持正常横排和换行。新增真实卡片矩形与 20 个孤立节点无重叠测试；Playwright 截图确认 6 节点图无重叠，步骤记录横排可读。

下一阶段入口：停止在 v0.6.5，等待真实使用反馈；不进入 v0.7.0。

## v0.6.4 阶段记录

实施日期 / commits：2026-09-11 / `c2266c6`、`7658eac`、`c1e40ca`、`8cb1683` 及最终文档/视觉提交。

产品结构：删除独立 Homepage、旧 ProjectLibrary、旧 WorkspaceContent 演示状态与旧 startExploration。`/` 直接进入三栏研究工作台；左栏是轻量 Session 列表，中间保持 React Flow + ELK 画布，右栏只保留探索对话/节点详情。设置使用校验后的 returnTo 返回原 Session。

真实研究链路：`WorkspacePage` 调用 `runExploration`；先由 Provider 生成意图、标题和 2–4 组检索词，再由 OpenAlex adapter 真实检索、归一化与去重，建立 metadata/abstract Evidence；第二次 Provider 调用只允许引用已有 Evidence ID，输出经受控规范化和 Zod 校验后转为节点、Claim 与 Edge，并保存完整 Workspace。节点继续和自由追问共用该 use case；方向转移创建继承当前图的新 Branch。

真实浏览器验收：使用用户授权的临时 DeepSeek Chat Completions 凭证及 OpenAlex，在 localhost production preview 输入“四足机器人足端传感器对于定位导航的作用”。连接探针成功；模型生成 4 组查询，OpenAlex 去重得到 26 条候选，最终保存 25 条 Evidence，生成 10 个节点、12 条边。首次综合因 1600 token 输出预算/轻微格式偏差被严格拒绝且未覆盖图；提升到 4000 token 并增加受控规范化后成功。点击“触觉蒙特卡洛定位”节点可打开真实 DOI、作者、年份、期刊和摘要；“围绕此处继续”执行第二轮真实检索并增量扩展到 20 节点、44 Evidence，首轮节点仍存在。

自动测试：最终 `npm run check` 包含 lint、strict typecheck、21 个 Vitest 文件/90 项测试、production build、5 项 Playwright E2E 和 secret scan。E2E 使用 mock Provider/OpenAlex 验证确定性行为；真实 API 结果单独按上述浏览器验收记录，不冒充 CI。

视觉验收：`reports/visual/v0.6.4/` 包含 1440、1920、1100 空工作台和 Initial running、Research Graph、Node Detail、Node Continue、Provider Settings、Session History 最新截图。

限制与风险：API Key 仍仅存运行内存，刷新后须重新输入；当前只接入 OpenAlex 作为生产研究来源；方向转移由明确语言启发式触发；图综合允许受控修正未知 kind/relation，但所有 Evidence ID 仍需白名单；ELK 仍在主线程异步 promise 中运行，30 节点性能尚未建立正式 benchmark；本次未部署 Pages。

下一阶段入口：停止在 v0.6.4，等待实际使用反馈；不进入 v0.7.0。

## v0.6.3 阶段记录

实施日期 / commit：2026-09-11 / `aef9f7d`（A）、`f3032f3`（B）、`3be9c7e`（C）及最终 D 提交。

范围：只修正首次使用、Provider 配置保存、设置页信息架构、路由返回与探索历史，不修改研究 Agent、研究图和工作流语义。

已完成：非敏感 Provider profile 进入既有 Dexie，密钥继续只在内存；测试与保存分离；协议切换只改变协议字段；统一 `startExploration` 检查 active profile 与会话密钥；首页草稿跨设置往返保留；设置拆为模型 Provider、文献来源、数据与存储、关于；OpenAlex 仅执行固定最小健康检查；诊断移至关于并排除查询、URL、正文和凭证；设置入口携带经校验的 `returnTo`；历史项目改为紧凑列表并复用重命名、JSON 导出和确认删除。

测试证据：`npm run check` 通过，包括 ESLint、严格 TypeScript、20 个 Vitest 文件 / 89 项测试、production build、16 项 Playwright e2e 与凭证扫描。Playwright 覆盖首次使用引导、草稿保留、未保存配置不生效、Workspace 往返设置、来源健康检查不污染历史、历史进入与确认删除。构建仍报告既有大 chunk 和动态导入无效 warning，不影响构建成功。

待真实验证：真实 Provider 凭证能力矩阵沿用 v0.6.2 状态；刷新会按安全设计丢失 API Key，已保存非敏感配置会恢复并提示重新输入。未部署 GitHub Pages。

下一阶段入口：停止在 v0.6.3，等待真实使用反馈；不自动进入 v0.6.4 或 v0.7.0。

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

人工验收与截图：1280px 浏览器视图检查通过；Provider 表单、四项能力按钮、取消入口、OpenAlex 状态与长题名无横向溢出。OpenAlex 实测返回 count 187,295，首条题名为 _Retrieval-Augmented Generation for Large Language Models: A Survey_；这是当时 API 响应，不是稳定数据或研究结论。

未完成 / 待实测：未获得并获准使用真实 Provider 凭证，因此普通完成、流式、结构化输出、工具调用、真实取消与 usage reporting 保持待验证；目标 Pages HTTPS origin 也未验证。

风险与决策：每个 Provider 探针可能产生费用，只允许用户主动点击。AbortSignal 只保证客户端停止继续处理，不承诺供应商停止计费。OpenAlex localhost 成功不能代替 Pages origin 成功。

下一阶段入口：先由用户选择是否提供一个允许浏览器调用、可产生极小测试费用的 Provider 配置以完成 0.1-B 门禁；门禁完成后进入 v0.1.0-C，实施 Hash 路由、Vite base、Pages workflow 草案、production preview 子路径与失败样例。

## v0.1.0-C 阶段记录

阶段 ID：v0.1.0-C（真实 Pages 部署与 origin 验证完成）

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

远端部署补充（2026-09-11）：经用户明确授权，手动运行 `.github/workflows/pages.yml`，GitHub Actions run `34542847656` 成功将 commit `3b5d49c` 部署至 `https://aaronchou313.github.io/ideascope/`。HTTPS 首页返回 200，HTML 中 JS/CSS/favicon 均使用 `/ideascope/` 子路径；系统 Chrome headless 从真实 Pages origin 打开 `#/` 与 `#/workspace/demo`，页面内容完整且 console/page error 为 0。另从该 Pages origin 发起一次匿名 OpenAlex `per-page=1` 基础请求，得到 CORS response、HTTP 200；未调用 Provider 或付费模型。

未完成 / 待实测：真实 Provider 能力仍因没有凭证与付费调用授权而待验证；尚无 ELK Worker，Worker 路径留至其首次引入时验证。

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

人工验收与截图：`reports/visual/literature-search-1440x1000.png` 已检查；检索表单、来源/状态/数量与结果层级清晰，延续黑白灰与克制蓝色主操作。localhost production preview 使用 Chromium 从页面真实请求 OpenAlex 成功，查询为 `retrieval augmented generation reliability evidence`、`cursor=*`、`per_page=10`，归一化 10 条记录；首条题名为 _Retrieval-Augmented Generation for Large Language Models: A Survey_。

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

## v0.4.0-A 阶段记录

阶段 ID：v0.4.0-A

实施日期 / commit：2026-09-10 / 见本阶段 Git 提交

范围：单一 AgentController、状态轨迹、上下文组装、预算、ProviderAdapter、OpenAI-compatible transport、优先结构化输出与严格 JSON 回退、一次修复、检索工具参数校验、取消与 mock 测试。不实现图补丁事务或真实模型验收。

实际修改文件：`src/agent/*`、`src/infrastructure/llm/agent-provider.ts`、`tests/unit/agent-controller.test.ts`、`docs/AGENT_RUNTIME.md` 与本文件。

已完成：控制器绑定 run/workspace/branch/revision/promptVersion；默认限制 6 次模型、8 次工具、4 次检索、60 条候选和 24k 字符上下文。结构化/JSON 均由同一 Zod 契约验证，失败最多修复一次。非法工具参数不执行；外部检索内容以不可信数据区加入；未知 Evidence ID 拒绝。传输层 key 只从内存 getter 读取并放 Authorization header，URL 中不含 key。

测试命令与结果：`npm run check` 全部通过；ESLint、严格 typecheck、9 个 unit/contract 文件共 37 项测试、production build、9 项 Playwright e2e 与 secret scan 均成功。新增 mock 测试覆盖无理由不调用工具、结构化优先、JSON 回退与一次修复、合法检索后综合、非法工具/伪造 Evidence 拒绝，以及 Provider 严格 schema 请求与 key 不进入 URL。

未完成 / 待实测：没有获准使用真实 Provider 凭证，因此未声称真实模型输出、usage、取消或费用已验证。当前 Controller 产生回答/工具请求；图提案验证与事务提交属于 0.4-B。

风险与决策：一个 Controller，不引入多角色对话或框架。控制器实例每轮重置预算；外部文本不改变工具权限。失败只返回解释，不执行半成品。

下一阶段入口：v0.4.0-B，实现 GraphPatch reducer、严格引用/图完整性/revision/锁定校验、全有或全无事务、checkpoint、提案与已提交回答一致性。

## v0.4.0-B 阶段记录

阶段 ID：v0.4.0-B

实施日期 / commit：2026-09-11 / 见本阶段 Git 提交

范围：实现 GraphPatch 0.1 的纯 reducer、来源引用与图完整性校验、revision 乐观锁、Dexie 原子提交、提交前 checkpoint、幂等回执与运行摘要；在节点详情渲染可定位引用。不接入真实 Provider 自动提交，不创建 Paper/Evidence。

实际修改文件：`src/domain/graph/apply-graph-patch.ts`、`src/infrastructure/storage/ideascope-database.ts`、`src/infrastructure/storage/graph-patch-repository.ts`、`src/features/evidence/CitationList.tsx`、工作区详情页、图补丁测试、`docs/GRAPH_PATCH_RUNTIME.md` 与本文件。

已完成：补丁先在 branch 深拷贝执行并做最终完整性检查；workspace/branch/baseRevision 不匹配、未知节点/关系/判断/证据、重复 ID、自连接、空 sourced 引用和锁定节点改写均拒绝。Dexie v2 保留 v1 表并新增 branches/checkpoints/patchReceipts/runSummaries；一次事务写入全部提交产物，失败无部分写入。同一 patch 的合法重放不重复递增 revision。空检索演示补丁只生成明确标识的 hypothesis 与 question。详情页仅为 sourced 判断显示文献题名、立场、证据深度和 locator 链接，非 sourced 判断明确不显示为文献事实。

测试命令与结果：`npm run check` 全部通过；ESLint、严格 typecheck、10 个 unit/contract 文件共 43 项测试、production build、9 项 Playwright e2e 与 secret scan 均成功。图补丁测试覆盖纯 reducer 不改原值、非法操作全量拒绝、伪造 Evidence、锁定节点、过期 revision、原子事务和幂等重放。

人工验收与截图：已检查更新后的 `reports/visual/workspace-1440x900.png`；右侧 hypothesis 判断明确显示“不是文献事实”，布局仍保持白/灰面板与单一蓝色选中态，未改变既有视觉系统。

未完成 / 待实测：真实 Provider 输出到提案再由用户应用的 UI 流程尚未接入；多标签页同时提交同一 branch 与大图事务性能待浏览器压力验证；真实模型仍未调用。

风险与决策：GraphPatch schema 是输入形状门槛，不能代替本地领域验证。checkpoint 保存提交前完整 branch，会增加 IndexedDB 占用；保留到 v0.6 的存储治理阶段处理。补丁无 Paper/Evidence 操作类型，从协议层阻止“补丁创造假论文”。

下一阶段入口：v0.4.0-C，把 AgentController、检索工具和 GraphPatch 提案/应用 UI 串成一条可取消、可恢复、状态明确的单智能体流程；使用 mock Provider 完成端到端验收，并保留真实 Provider 待验证标记。

## v0.4.0-C 阶段记录

阶段 ID：v0.4.0-C

实施日期 / commit：2026-09-11 / 见本阶段 Git 提交

范围：补齐首轮运行持久状态、刷新中断恢复和 Provider usage 真实性语义；汇总真实 OpenAlex 浏览器验证、mock Provider 控制流、GraphPatch 提交与来源定位的端到端审查。不调用真实或付费模型，不把 demo 当模型输出。

实际修改文件：Agent Provider/Controller usage 契约、Dexie v3 runExecutions 表、`RunExecutionStore`、相关单测、`reports/v0.4-first-run-review.md` 与本文件。

已完成：OpenAI-compatible transport 读取 Provider 原生 prompt/completion token，缺失即记录 unknown；Controller 聚合多次 reported usage，不维护可能过期的价格表，也不计算金额。运行开始即落 running 记录，完成后保存终态、状态轨迹与 usage；刷新恢复会把遗留 running 原子标为 interrupted，并明确未提交结果已丢弃。审查表逐项区分已验证的真实 OpenAlex 请求、mock 控制链和未验证的真实 Provider 门禁。

测试命令与结果：`npm run check` 全部通过；ESLint、严格 typecheck、11 个 unit/contract 文件共 45 项测试、production build、9 项 Playwright e2e 与 secret scan 均成功。新增测试覆盖 reported/unknown token 语义以及刷新后 running → interrupted 恢复。

人工验收：沿用并复核 v0.4-B 工作区截图；用户可从 sourced 判断定位公开来源，论文保留在资料/引用层，摘要深度明确，画布不堆论文节点。

未完成 / 待实测：没有真实 Provider 凭证与调用授权，因此真实模型首轮输出、流式中断、实际 usage 和 Provider CORS 保持待验证；GitHub Pages 未部署。此门禁不会以 mock 或演示数据冒充通过。

风险与决策：v0.4 工程链路完成不等于外部 Provider 验收完成。运行记录不保存 prompt、响应正文或密钥；价格未知时不从 token 推算金额。

下一阶段入口：v0.5.0-A，实现节点聚焦的持续追问、解释/探索意图区分、局部 GraphPatch 预览与撤销；保持布局、锁定节点和重试幂等。

## v0.5.0-A 阶段记录

阶段 ID：v0.5.0-A

实施日期 / commit：2026-09-11 / 见本阶段 Git 提交

范围：实现持续追问的确定性意图门禁、焦点节点/邻域上下文、GraphPatch 无写入预览和事务撤销；在演示工作台提供明确的提案应用/拒绝/撤销交互。不调用模型，不把演示提案当真实生成。

实际修改文件：`src/domain/agent/turn-intent.ts`、Agent context 契约、GraphPatch repository、工作区提案交互、unit/e2e、视觉截图与本文件。

已完成：默认意图是 explain，仅明确检索/探索/范围/分支请求允许进入改图流程；选中节点的 ID、标题、摘要、邻居与判断 ID 进入有界上下文。`preview` 在副本验证并返回节点/边/判断增量，不写 IndexedDB；`undoLast` 在事务内恢复提交前 checkpoint，同时创建新 revision，避免回滚 revision 引发晚到响应写入。已有 patchId 重试继续幂等。演示状态可应用一个明确的 hypothesis/question 提案、暂不应用并撤销；每一步均标注演示。

测试命令与结果：`npm run check` 全部通过；ESLint、严格 typecheck、12 个 unit/contract 文件共 48 项测试、production build、10 项 Playwright e2e 与 secret scan 均成功。新增测试覆盖解释不改图、探索意图、焦点邻域、预览零写入、提交与单次撤销；e2e 实际执行提案预览、应用和撤销。

人工验收与截图：已检查更新后的 `reports/visual/workspace-1440x900.png`；默认态无多余彩色面板，提案控制沿用紧凑 banner 与既有按钮层级，撤销入口只在有可撤销变更时出现。

未完成 / 待实测：真实多轮 Provider 对话仍受凭证与调用授权门禁；当前意图分类是保守产品门禁，不宣称语义分类模型精度。

风险与决策：撤销产生新 revision 而不是把 revision 数字倒退，保证旧响应永远过期；用户手动布局和锁定状态随 branch checkpoint 原样恢复。

下一阶段入口：v0.5.0-B，实现 BranchService、快照复制、消息/运行按 branchId 路由、活动运行门禁及分支切换恢复测试。

## v0.5.0-B 阶段记录

阶段 ID：v0.5.0-B

实施日期 / commit：2026-09-11 / 见本阶段 Git 提交

范围：实现 BranchService、分支快照复制、消息按 workspace/branch 路由、活动运行建分支门禁和跨分支晚到写入拒绝；保留共享不可变 Paper/Evidence。不调用模型。

实际修改文件：Dexie v4 messages 表、`src/infrastructure/storage/branch-service.ts`、分支 unit/e2e、视觉截图与本文件。

已完成：新分支复制来源 branch 的图、视图、范围、摘要与方向，记录 parentBranchId/forkedFromRevision，并从自身 revision 0 开始；后续对象与来源分离。Paper/Evidence 不复制，继续使用 workspace 级记录。消息落库前验证目标 branch，查询同时过滤 workspaceId/branchId。workspace 存在 running 运行时拒绝建分支；GraphPatch 自身的 branch/revision 门禁使 A 的晚到响应不能写入 B。浏览旧分支只读本地快照，不调用模型。

测试命令与结果：`npm run check` 全部通过；ESLint、严格 typecheck、13 个 unit/contract 文件共 50 项测试、production build、11 项 Playwright e2e 与 secret scan 均成功。新增 fake IndexedDB 测试覆盖快照隔离、消息路由、活动运行门禁和晚到补丁拒绝；e2e 验证切换分支后恢复各自状态且未调用模型。

人工验收与截图：复核 `reports/visual/workspace-1440x900.png`；分支导航延续左侧紧凑轨迹列表，切换不改变地图和右侧详情的视觉层级。

未完成 / 待实测：多标签页同时创建同名分支的竞争将在 v0.6-A 单写者策略中处理；真实 Provider 活动时切分支仍待真实凭证验证。

风险与决策：branch ID 在 workspace 内唯一；服务不复制 Evidence，避免同一来源因分支增加而重复计数。分支切换不隐式取消运行，创建分支则要求先结束或取消，保持写入目标清晰。

下一阶段入口：v0.5.0-C，实现结构折叠/合并建议和完整方向卡片的保存、排除与证据保留规则。

## v0.5.0-C 阶段记录

阶段 ID：v0.5.0-C

实施日期 / commit：2026-09-11 / 见本阶段 Git 提交

范围：实现非破坏结构整理、最多 30 个默认可见目标、重复概念合并建议与方向卡片状态事务；补齐方向卡的已有工作、潜在差异、反证和剩余问题。不实现创新评分，不自动合并。

实际修改文件：`src/domain/graph/compaction.ts`、`src/infrastructure/storage/direction-service.ts`、方向 UI、unit/e2e、视觉截图与本文件。

已完成：整理计划从焦点按邻域优先选取最多 30 个非归档节点，其余只进入 collapsedIds，原图记录不删除。标题或用户显式 alias 相同只产出需确认的合并建议；实际合并仍走 GraphPatch 校验并保留 claim/evidence 引用。DirectionService 在 branch 事务内写保存/排除状态、userEdited、checkpoint 和新 revision。方向视图完整显示价值、已有工作、待核查差异、反证/限制与未决问题，并提供保存/排除操作。

测试命令与结果：`npm run check` 全部通过；ESLint、严格 typecheck、14 个 unit/contract 文件共 52 项测试、production build、11 项 Playwright e2e 与 secret scan 均成功。新增测试证明 35 节点只显示 30 而不删数据、重复概念只形成建议，以及方向决定带 checkpoint 持久化；e2e 执行保存和排除操作。

人工验收与截图：`reports/visual/directions-1440x900.png` 在最终 e2e 生成并人工复核；完整卡片仍使用白底、细边框与黑灰文字，蓝色仅保留在选择/主操作，不引入评分或彩色大卡。

未完成 / 待实测：真实模型生成的合并建议与方向质量仍受 Provider 门禁；当前不提供也不暗示伪精确创新分。

风险与决策：折叠是视图决策，不是归档或删除；方向状态属于用户决策，自动流程不得覆盖 userEdited 内容。

下一阶段入口：v0.6.0-A，实现 workspace repositories、刷新恢复、容量错误、单写者租约与导入版本迁移夹具。

## v0.6.0-A 阶段记录

阶段 ID：v0.6.0-A

实施日期 / commit：2026-09-11 / 见本阶段 Git 提交

范围：实现 workspace repository、项目重命名/归档/确认删除、全量本地保存与刷新恢复、容量错误状态、运行中断恢复、单写者租约和导入格式版本迁移。不实现文件导出 UI。

实际修改文件：Dexie v5 workspaces/writerLeases、`src/infrastructure/storage/workspace-repository.ts`、`writer-lease.ts`、`src/domain/workspace/migrate-workspace.ts`、故障/迁移测试与本文件。

已完成：WorkspaceExport v1 可事务写入 workspace metadata、branches、Paper、Evidence 与 messages，新 repository 实例可恢复语义等价数据。首页可从用户原始想法创建不调用模型、不伪造证据的本地 question workspace，本地项目列表支持打开、重命名、归档和确认名称后删除；实际 workspace 路由从 IndexedDB 恢复项目，不再固定加载 demo。QuotaExceededError 返回 quota_exceeded 与“未保存”文案。遗留 running 恢复为 interrupted 已由 v0.4-C 覆盖。单写者租约使用 ownerId/过期时间，其他标签页在有效租约内不可写，原 owner 可续期，过期后可接管。formatVersion 0 显式迁移为 v1，未来版本明确拒绝。

测试命令与结果：`npm run check` 全部通过；ESLint、严格 typecheck、15 个 unit/contract 文件共 57 项测试、production build、11 项 Playwright e2e 与 secret scan 均成功。新增 fake IndexedDB 测试覆盖刷新恢复、v0 迁移、未来版拒绝、quota、项目生命周期与租约竞争。

人工验收：本阶段没有新增视觉结构；沿用现有保存/错误状态样式。真实浏览器容量上限因环境差异保持待压力验证，自动测试验证错误语义。

未完成 / 待实测：真实浏览器的配额阈值和崩溃时租约接管时延待跨浏览器压力测试；Pages 部署仍未执行。

风险与决策：Paper/Evidence 作为共享不可变记录不在删除单一 workspace 时物理删除，避免破坏其他项目引用；孤立记录的安全垃圾回收留给显式“清除全部数据”。

下一阶段入口：v0.6.0-B，实现 JSON/Markdown/SVG/PNG 导出、可见图/完整分支选择、敏感内容预览、导入生成新项目与往返等价测试。

## v0.6.0-B 阶段记录

阶段 ID：v0.6.0-B

实施日期 / commit：2026-09-11 / 见本阶段 Git 提交

范围：实现 WorkspaceExport v1 JSON、Markdown 理解提纲、纯 SVG 与浏览器 PNG 导出，可见图/完整分支语义、敏感内容审计和导入新项目 ID。更新工作区导出 UI，不上传文件。

实际修改文件：`src/domain/export/workspace-export.ts`、`src/infrastructure/export/download.ts`、工作区导出 Dialog、unit/e2e 与本文件。

已完成：JSON 导出覆盖完整 workspace 且不含凭证字段；Markdown 按节点/判断输出 epistemicStatus、编号引用与参考文献，并保留“推断/假设非事实”声明。SVG 只含文本、路径和矩形，不含脚本、HTML、远程图片；Dialog 可选择当前可见图或完整非归档分支。PNG 在安全尺寸内用本地 Canvas 栅格化，超 8192px 或无法解析尺寸时降级下载 SVG，不生成空文件。导出 Dialog 预览消息、用户笔记、证据 excerpt 数量和 credentials=0。导入经版本迁移后总是分配不冲突的新 workspace ID 并标记为非 demo，避免覆盖。

测试命令与结果：`npm run check` 全部通过；ESLint、严格 typecheck、16 个 unit/contract 文件共 61 项测试、production build、11 项 Playwright e2e 与 secret scan 均成功。unit 覆盖 JSON 往返/密钥扫描、Markdown 引用、visible/complete SVG、惰性 SVG、安全 PNG 降级与导入 ID 冲突；e2e 验证 JSON/SVG 实际下载及文件名。

人工验收与截图：已检查 `reports/visual/export-dialog-1440x900.png`；导出仍使用既有 Dialog、按钮和黑白灰层级，敏感内容摘要先于下载操作，无新增大面积彩色区域。

未完成 / 待实测：PNG 已在 Chromium 路径实现，Safari/Firefox 实机下载和极大图内存压力待跨浏览器验证；未部署 Pages。导入文件选择在 v0.6-C 安全面板补齐，文件只在本地读取。

风险与决策：导出前明确列出可能敏感的本地内容；SVG 作为大图可靠兜底。Paper/Evidence 题名和摘要一律转义为文本，不执行 HTML。

下一阶段入口：v0.6.0-C，完成外部文本安全渲染、远程图片/endpoint 限制、导出审计、脱敏诊断、清除全部数据与三方数据流说明。

## v0.6.0-C 阶段记录

阶段 ID：v0.6.0-C

实施日期 / commit：2026-09-11 / 见本阶段 Git 提交

范围：完成外部文本/Markdown 安全渲染、远程资源和 Provider endpoint 限制、脱敏诊断、确认清除全部数据、攻击夹具与三方数据流说明；执行 v0.6.0 最终本地审计。不部署、不调用付费模型。

实际修改文件：`SafeRichText`、Provider transports、`DiagnosticExporter`、`LocalDataService`、设置页安全面板、攻击夹具/测试、`docs/DATA_FLOWS_AND_SECURITY.md`、e2e/截图与本文件。

已完成：不可信 HTML、Markdown image 和 javascript link 只作为文本显示；http(s) 明文 URL 才生成带 noreferrer/noopener 的链接，不使用 innerHTML，不自动加载图片。远程 Provider 强制 HTTPS，localhost 例外；URL 禁止内嵌 username/password，fetch 禁止 redirect，凭证只发往用户明确配置的 origin。脱敏诊断排除查询、cache key、完整 URL、headers、prompt、response 和消息。本地 JSON 文件经迁移校验后始终以新 UUID 导入，不覆盖现有项目，也不上传。清除全部数据需输入完整确认文字，在单一 Dexie 事务清空所有表并清空内存 key。文档列出 Provider、OpenAlex 与本地下载的具体数据流，并明确纯前端不能安全保管长期密钥。

测试命令与结果：最终 `npm run check` 全部通过；ESLint、严格 typecheck、18 个 unit/contract 文件共 66 项测试、production build、13 项 Playwright e2e 与 secret scan 均成功。新增本地项目创建 unit 与创建→刷新恢复→确认删除 e2e；安全测试覆盖攻击渲染、endpoint、redirect、诊断字段、导入和全量清除。package 与演示导出版本均为 0.6.0。

人工验收与截图：最终检查 `reports/visual/data-safety-1440x1000.png` 与 `reports/visual/local-projects-1440x1000.png`；安全面板与本地项目列表沿用白底、细边框和紧凑控件，危险操作与导出备份分开，不改变设计基线。

未完成 / 待实测：真实 Provider 仍无凭证与付费调用授权；Firefox/Safari 导出、实际容量阈值与多标签崩溃接管仍需相应环境验证。Pages HTTPS origin 已在 2026-09-11 完成部署、路由、资源与 OpenAlex CORS 验证。上述其余项目没有以 mock、Chromium 或构建成功冒充通过。

风险与决策：纯前端只能降低凭证暴露面，不能承诺长期 key 安全。清除全部数据不可撤销，因此 UI 强制精确确认并持续提示先导出项目；单项目删除不会误删共享 Evidence。

下一阶段入口：v1.0.0-A；先补齐真实 Provider/Pages/跨浏览器外部门禁，再执行跨学科任务集、20 轮稳定性和科研质量人工抽查，不以本次 v0.6 构建结果代替 v1.0 验收。

## v0.6.1 阶段记录

阶段 ID：v0.6.1

实施日期 / commit：2026-09-11 / 见本阶段 Git 提交

范围：仅修复 Provider 协议与连接可靠性，支持 OpenAI Chat Completions、OpenAI Responses API、Anthropic Messages API；不改变产品结构、研究工作流或视觉体系，不扩展 v0.7.0 功能。

实际修改文件：`src/infrastructure/llm/{types,provider-protocol,openai-compatible,agent-provider}.ts`、网络错误分类、连接实验室格式选择、Provider mock/unit 测试、版本与兼容/安全文档。

已完成：三类协议分别生成 endpoint、header、请求体、结构化输出、工具和返回解析；统一 factory 映射到 `OpenAIChatCompletionsProvider`、`OpenAIResponsesProvider`、`AnthropicMessagesProvider`。Chat 普通探针从 4 提升为 64 output tokens，优先发送通用 thinking disabled 扩展并在格式拒绝时无该字段重试；成功识别 content、reasoning_content、tool_calls 与 finish_reason。Chat 结构化输出使用兼容面更广的 `json_object`，Responses 使用原生 JSON Schema，Anthropic 使用严格 JSON prompt fallback。错误细分 401、403、404 endpoint、429、模型不存在、请求格式不兼容、返回格式异常、离线网络、疑似 CORS 与取消。

真实验收：经用户明确提供临时凭证并授权 2 元预算，在本地 production build 的系统 Chrome 中对 `https://api.deepseek.com/chat/completions` / `deepseek-chat` 执行普通完成与结构化输出最小探针。普通完成收到文本；结构化输出收到有效 `{ok:true}` JSON。请求使用 `max_tokens: 64`、`thinking: {type:"disabled"}` 与 `response_format: {type:"json_object"}`。未记录凭证、Authorization、模型原文或完整响应，测试页面随后清空内存 key；未调用其他付费 Provider。

测试命令与结果：最终 `npm run check` 通过；ESLint、严格 typecheck、18 个 unit/contract 文件共 76 项测试、production build、13 项 Playwright e2e 与 secret scan 全部成功。首次完整检查时既有图谱撤销 e2e 因新增 select 样式选择器作用域过宽而超时；将样式限制到 Provider 面板后，该项单独复跑与完整门禁均通过。既有 ELK 动态 chunk 体积警告仍为非阻断项。

人工验收与截图：检查 `reports/visual/provider-formats-1440x1000.png`；Provider Format、Base URL、Model ID、API Key 与四项探针保持原有双栏布局、黑白灰层级和蓝色主操作，没有改变设置页或研究工作流结构。

未完成 / 待实测：OpenAI Chat Completions、OpenAI Responses 与 Anthropic Messages 尚无对应真实凭证授权；DeepSeek 流式、工具、取消与 reasoner 模型未额外消耗预算实测。三类协议的这些能力均有 mock 请求/响应覆盖，不能记作真实服务验收。

风险与决策：不按厂商散布硬编码逻辑；常见服务通过三种协议格式、Base URL 和 Model ID 映射。浏览器 fetch 对在线状态下的网络失败与 CORS 无法取得服务端诊断，当前以 `navigator.onLine` 区分明确离线，其余 Fetch TypeError 标为疑似 CORS，不伪造确定原因。

下一阶段入口：仍为 v1.0.0-A 外部门禁；如用户提供 OpenAI/Anthropic 凭证与预算授权，再补真实 Responses/Messages 能力矩阵。否则保持待验证，不以 mock 替代。

## v0.6.2 阶段记录

阶段 ID：v0.6.2

实施日期 / commit：2026-09-11 / 见本阶段 Git 提交

范围：只修复普通完成、流式响应、结构化输出、工具调用四项能力探针的判定、状态显示和错误诊断，并增加顺序执行四项探针的按钮；不增加 Provider、不改变研究工作流或页面结构。

已完成：能力状态扩展为 supported/unsupported/failed/unknown，UI 对应“支持/不支持/测试失败/待验证”，请求异常会写入对应能力而非停留在待验证。普通完成只有最终文本才标支持；reasoning-only 尤其 finish_reason=length 时标结果不足，HTTP 200 空最终文本标测试失败。流式探针读取完整响应，验证 SSE/event framing、三协议模型输出事件和合法终止/正常 EOF。结构化探针实际 JSON.parse，并严格验证唯一布尔字段 `ok=true`。工具探针验证协议对应的真实调用、名称 `probe_ok` 与可解析 object 参数。一键按钮用同一 AbortController 顺序执行四项，取消可中止余下测试。

错误诊断：HTTP 400 不自动映射 unsupported。Provider 标准 JSON error body 的 type/code/message 经换行规整、240 字符截断和 Bearer/key 脱敏后显示；区分 401、403、404、429、模型不存在、参数不支持、请求格式、响应格式、离线网络、疑似 CORS 与取消。

测试覆盖：HTTP 200 空 content + reasoning、output token 用尽、空最终文本、正常 SSE 与无效 stream、JSON 解析失败、schema 失败/额外字段、合法与非法 tool call、HTTP 400 tool 参数诊断、错误脱敏、UI failed 状态及一键四项顺序执行。未再次使用 v0.6.1 的临时 DeepSeek 凭证或产生付费调用。

测试命令与结果：最终 `npm run check` 通过；ESLint、严格 typecheck、19 个 unit/contract 文件共 86 项测试、production build、13 项 Playwright e2e 与 secret scan 全部成功。构建仍只保留既有 ELK/主入口 chunk 大小非阻断警告。

人工验收与截图：更新并检查 `reports/visual/provider-formats-1440x1000.png`；一键测试按钮位于四项探针下方，沿用既有蓝色主操作、白底细边框与双栏结构，1440px 下无横向溢出，未改变其他页面视觉。

待验证：三协议流式事件在各真实服务的浏览器 CORS 与事件变体、真实工具参数错误文案，以及 reasoning 模型在不同 token 预算下的最终输出仍待相应凭证和预算授权，mock 不替代真实验收。

下一阶段入口：保持 v1.0.0-A 外部门禁；不因本补丁引入 v0.7.0 范围。
