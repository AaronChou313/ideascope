# 开发进度

当前状态：**v0.1.0-A 已完成；v0.1.0-B 探针实现与 OpenAlex localhost 浏览器验证完成，真实 Provider 与 Pages origin 仍待验证。v0.1.0 整体尚未完成。**

| 阶段 | 状态 | 产物/证据 |
|---|---|---|
| 计划与设计 | 已形成文档包 | README、专题文档、契约草案、原型、包内检查报告 |
| v0.1.0-A | 已完成 | React/TypeScript/Vite 空壳、lockfile、严格检查、契约/示例测试、ADR 与依赖基线 |
| v0.1.0-B | 待验收 | 探针与错误分类已实现；OpenAlex localhost 浏览器通过；真实 Provider/Pages origin 待凭证与部署验证 |
| v0.1.0-C | 待开始 | 未部署真实 Pages |
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
