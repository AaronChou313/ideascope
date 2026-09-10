# 开发进度

当前状态：**v0.1.0-A 已完成；工程与契约基线可安装、检查和构建。v0.1.0 整体尚未完成。**

| 阶段 | 状态 | 产物/证据 |
|---|---|---|
| 计划与设计 | 已形成文档包 | README、专题文档、契约草案、原型、包内检查报告 |
| v0.1.0-A | 已完成 | React/TypeScript/Vite 空壳、lockfile、严格检查、契约/示例测试、ADR 与依赖基线 |
| v0.1.0-B | 待开始 | 未提供/验证真实 Provider |
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
