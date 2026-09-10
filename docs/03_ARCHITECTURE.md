# 03 · 技术架构与项目结构

## 1. 架构决策

运行时采用 React + TypeScript + Vite 的静态 SPA，发布至 GitHub Pages。Pages 负责 HTML/CSS/JS 静态托管，不承担自建 API 服务 [S02]。构建时可以使用 Node；这不等于产品需要 Node 后端。

选择 **CSS Modules + 统一 CSS 变量**，不同时引入多套样式体系；交互原语选成熟可访问组件并按本包样式封装，图标选 Lucide。图使用 `@xyflow/react`，布局使用 `elkjs`。React Flow 的图交互与自动布局是不同职责，布局需外部实现 [S07]。

Zustand 只存临时界面状态；Dexie/IndexedDB 保存业务实体 [S08]。Zod 负责运行时输入/输出验证；图补丁同时保存 JSON Schema 便于模型与测试。具体依赖版本在首次安装实测后写入 lockfile，不在本文凭空指定“最新版本”。

不引入 LangChain/LangGraph、多智能体框架、远端向量数据库、SSR、服务端数据库或 monorepo。一个仓库、一个前端应用、清楚的模块边界足够。

## 2. 数据流

用户输入 → Application use case → AgentController → ProviderAdapter / LiteratureAdapter → Paper & Evidence repositories → Claim/GraphPatch 提案 → 本地验证与事务提交 → UI 与导出。

网络数据与模型输出都是不可信输入。界面组件不直接 fetch；Agent 不直接操作 DOM、不直接写数据库、不获取密钥。只有可信 transport 层读取内存凭证。

业务数据不以 React Flow 的 `nodes[]/edges[]` 作为唯一来源。`GraphModel` 是语义模型，`GraphViewState` 是位置/折叠/缩放/选择；图渲染组件只是投影。

## 3. 建议生产目录

以下是目标应用结构；按当前阶段按需建立文件，不要求一次创建空目录和占位类。

```text
idea-scope/
├── AGENTS.md
├── README.md
├── CHANGELOG.md
├── LICENSE                         # 用户确认后选定
├── package.json
├── package-lock.json               # 首次安装后锁定
├── .node-version                   # 与 CI 一致
├── .gitignore
├── index.html
├── vite.config.ts
├── tsconfig.json
├── eslint.config.js
├── vitest.config.ts
├── playwright.config.ts
├── .github/workflows/
│   ├── ci.yml
│   └── pages.yml
├── public/
│   ├── favicon.svg
│   ├── demo/                       # 无密钥、来源明确的公共演示
│   └── robots.txt
├── src/
│   ├── main.tsx
│   ├── app/
│   │   ├── App.tsx
│   │   ├── router.tsx              # HashRouter
│   │   ├── bootstrap.ts
│   │   └── ErrorBoundary.tsx
│   ├── pages/
│   │   ├── HomePage.tsx
│   │   ├── WorkspacePage.tsx
│   │   └── SettingsPage.tsx
│   ├── features/
│   │   ├── projects/               # 列表、新建、删除、导入入口
│   │   ├── workspace/              # 布局、面板、工作区切换
│   │   ├── graph/                  # 节点、边、布局、列表视图
│   │   ├── conversation/           # 消息、输入框、阶段进度
│   │   ├── evidence/               # 论文、片段、证据检视
│   │   ├── branches/               # 分支树、快照与切换 UI
│   │   ├── directions/             # 方向卡片
│   │   ├── provider-settings/      # 配置与能力测试
│   │   └── export/                 # 格式/范围选择与预览
│   ├── application/
│   │   ├── start-exploration.ts
│   │   ├── continue-exploration.ts
│   │   ├── create-branch.ts
│   │   ├── apply-graph-patch.ts
│   │   ├── summarize-direction.ts
│   │   └── import-workspace.ts
│   ├── domain/
│   │   ├── workspace/             # 实体、scope、分支和方向
│   │   ├── graph/                 # 模型、校验、reducer、patch
│   │   ├── evidence/              # Paper/Evidence/Claim
│   │   └── search/                # QueryPlan、检索记录
│   ├── agent/
│   │   ├── controller.ts
│   │   ├── state-machine.ts
│   │   ├── context-builder.ts
│   │   ├── budget.ts
│   │   ├── tools/                 # 受控工具定义与注册
│   │   └── prompts/               # 版本化提示词与输出约束
│   ├── infrastructure/
│   │   ├── llm/
│   │   │   ├── types.ts
│   │   │   ├── openai-compatible.ts
│   │   │   ├── capability-probe.ts
│   │   │   ├── stream-parser.ts
│   │   │   └── mock-provider.ts
│   │   ├── literature/
│   │   │   ├── types.ts
│   │   │   ├── openalex.ts
│   │   │   ├── normalize.ts
│   │   │   ├── deduplicate.ts
│   │   │   └── mock-literature.ts
│   │   ├── storage/
│   │   │   ├── db.ts
│   │   │   ├── migrations.ts
│   │   │   ├── repositories/
│   │   │   └── writer-lock.ts
│   │   ├── network/               # 超时、节流、脱敏、origin 校验
│   │   ├── secrets/               # 仅内存 key store
│   │   └── export/                # JSON/Markdown/SVG/PNG
│   ├── workers/
│   │   └── layout.worker.ts
│   ├── shared/
│   │   ├── ui/                    # Button、Dialog、Tabs 等
│   │   ├── hooks/
│   │   ├── utils/
│   │   ├── i18n/                  # zh-CN、en
│   │   └── styles/
│   │       ├── tokens.css
│   │       ├── reset.css
│   │       └── global.css
│   └── assets/                    # 打包资源，不引用外部字体 CDN
├── tests/
│   ├── unit/
│   ├── contract/
│   ├── integration/
│   ├── e2e/
│   ├── visual/
│   └── fixtures/
├── scripts/
│   ├── check-secrets.mjs
│   └── validate-fixtures.mjs
├── contracts/                     # 本包契约草案，经阶段实测后同步
├── docs/                          # 计划、进度、ADR、兼容矩阵
└── design/                        # 参考原型与截图，非生产入口
```

## 4. 模块边界

`domain` 不依赖 React、浏览器存储或 Provider SDK。纯函数可离线测试。`application` 协调事务与权限；`infrastructure` 实现外部连接；`features` 调用用例，不绕过领域验证。

生产中不要出现巨型 `App.tsx` 或 `agent.ts` 包含 UI、fetch、prompt、布局、存储与导出全部职责。组件按职责拆分，非按“每个文件必须多少行”机械拆分。

配置设置、导出、删除、网络 origin 修改属于用户界面命令；不对模型暴露。模型只能建议允许的研究操作。

## 5. ProviderAdapter

统一接口包含 `complete()`、可选 `stream()`、`probeCapabilities()`，均接收 AbortSignal。能力包括 protocol、streaming、toolCalling、jsonMode、structuredOutput、usageReporting；每项使用 `supported / unsupported / unknown`，不能只给一个“已连接”。

v1.0 首先做好 OpenAI-compatible 协议的配置与差异处理，不假定它等于 OpenAI 所有 API，也不假定任意兼容服务都支持工具或 JSON Schema。Anthropic 原生协议等以后由独立 adapter 按真实需求增加，不要求在第一版写所有供应商。

Base URL 必须标准化；协议与路径选择不能无条件拼出双重 `/v1/v1`。用户可手动输入 model id，不能依赖 `/models` 一定可用。不要向模型发送完整设置对象，更不能把 Authorization 头放进调试消息。

Provider 导航显示“已测试 / 部分支持 / 待验证 / 不可用”。缺少结构化输出时，走纯文本严格 JSON 提案、校验、最多一次修复；仍失败只返回解释，不执行工具或图修改。

## 6. 文献适配器

接口：`search(query, options, signal)`、`getById(id, signal)`；`references/citations/semanticSearch` 是可选能力。返回 normalized Paper 及 source metadata、查询记录、费用或额度信息（可得时）。

OpenAlex 当前文档支持匿名基本查询和可选 key；认证、配额、语义检索均需按最新文档与浏览器实际情况验证 [S04][S05]。v1.0 默认普通关键词检索。semantic search 放到可选增强，不能让它成为整个系统能否工作的唯一依赖。

缓存默认建议：相同检索 24 小时、稳定元数据 7 天；这是产品策略，可调，不是 API 官方保证。用户可强制更新。引用数与开放状态携带获取时间，刷新时保留曾被判断引用的证据快照。

## 7. 本地数据库

建议表：workspaces、branches、branchCheckpoints、papers、evidence、messages、runs、searchRecords、providerProfiles、preferences。**没有 secrets 表。**

branchCheckpoints 保存可恢复图与摘要；Paper/Evidence 的内容版本不可原地覆盖已被引用的快照。允许新版本并存。原始完整 HTTP body 默认不持久化，避免敏感字段和容量膨胀。

小图优先用分支完整快照加有限历史，不先做复杂 CRDT/event-sourcing 引擎。初期保留最近 20 个可撤销 checkpoint；执行合并、导入迁移前额外建 checkpoint。应用级事件可用于诊断，不假称是永久审计存档。

同一工作区跨标签页优先只允许一个写者：Web Locks 能用时使用，否则带过期时间的事务租约加 BroadcastChannel 通知；所有提交仍检查 revision。不要只靠界面禁用按钮维持一致性。

## 8. 导出架构

JSON 是完整可迁移项目格式；Markdown 是理解提纲与证据列表；SVG 是独立矢量图；PNG 是用于展示的光栅图。四者职责不混淆。

SVG 优先从语义模型与布局坐标独立绘制 `rect/text/tspan/path`，避免依赖 HTML `foreignObject` 才能读图；XML 文本转义、系统字体、无外链资源。PNG 可由该 SVG 转 Canvas 得到，避免第三方图像污染 Canvas。HTML 截图插件可作开发参考，不作为唯一导出路径 [S09]。

导出完整分支时先在副本中展开/布局，不改变当前画布；长文本换行与每种节点尺寸共用测量函数。大图超过像素预算则分块或建议 SVG。JSON 不包含凭证、原始请求头与用户未选择共享的诊断记录。

## 9. 部署结构

Hash 路由示例：`/#/`、`/#/workspace/{id}`、`/#/settings`。项目子路径的 Vite base 必须与部署配置一致，图布局 Worker/动态 import/资源 URL 全部用 bundler 路径处理 [S03]。

CI 顺序：安装锁定依赖 → lint → typecheck → unit/contract → build → e2e production preview → secret scan。发布 job 在授权条件下执行 Pages artifact upload/deploy。应用密钥不进入 Actions secrets 后再注入 `VITE_*`；构建期环境变量也会被静态打包。
