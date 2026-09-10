# 09 · 官方参考、设计决策与待验证事项

核查日期：2026-09-10。来源用于确认外部事实；本项目具体流程、界面、预算和版本顺序是本次设计，不是第三方官方要求。线上 API 行为可能改变，开工时需实测。

## 1. 官方参考

| ID | 资料 | 用于确认 |
|---|---|---|
| S01 | [Semantic Versioning 中文规范](https://semver.org/lang/zh-CN/) | 主/次/修复版本及兼容规则 |
| S02 | [GitHub Pages 简介](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages) | 静态托管与项目站子路径 |
| S03 | [Vite 静态部署](https://vite.dev/guide/static-deploy.html) | base、构建产物、Pages 部署流程 |
| S04 | [OpenAlex API Authentication](https://help.openalex.org/api/authentication/) | 匿名查询、key、认证方式与限流 |
| S05 | [OpenAlex Semantic Search](https://help.openalex.org/api/semantic-search/) | 独立语义检索能力与限制 |
| S06 | [MDN CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS) | 浏览器跨域规则 |
| S07 | [React Flow 布局](https://reactflow.dev/learn/layouting/layouting) | 交互引擎与外部布局的职责 |
| S08 | [Dexie React 文档](https://dexie.org/docs/Tutorial/React) | 本地数据库与 React 集成 |
| S09 | [React Flow 图像导出示例](https://reactflow.dev/examples/misc/download-image) | 导出实现参考，不作为稳定承诺 |
| S10 | [OpenAI API Key 安全建议](https://help.openai.com/en/articles/5112595-best-practices-for-api-key-safety) | 不建议浏览器暴露长期 API key |
| S11 | [OWASP Prompt Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html) | 外部资料与工具控制的安全风险 |
| S12 | [MDN 存储配额与回收](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) | 本地存储不是永久备份 |
| S13 | [OpenAlex API reference](https://help.openalex.org/api/) | 实体接口与非可信文本处理 |
| S14 | [RAG，Lewis 等，2020](https://arxiv.org/abs/2005.11401) | 演示文献题名、年份与简短摘要释义 |
| S15 | [Self-RAG，Asai 等，2023](https://arxiv.org/abs/2310.11511) | 演示文献题名、年份与简短摘要释义 |
| S16 | [CRAG，Yan 等，2024](https://arxiv.org/abs/2401.15884) | 演示文献题名、年份与简短摘要释义 |

参考项目 Paper-Agent 由用户提供；本计划借鉴的是“检索—阅读—整理”的需求背景，不承诺复用其后端实现。计划不依赖对其代码的未验证推断，也未复制其实现。

## 2. 对早期设想作出的必要收紧

第一，不再把“纯前端可部署”写成“所有 Provider 都能用”；浏览器实际 CORS/能力测试前置。

第二，主来源选 OpenAlex 是优先实现策略，不是无限免费承诺。当前官方认证文档列出匿名基本使用与可选 key；更高预算与某些查询可能涉及成本。semantic search 有独立限制，不直接作为初版默认路径。

第三，“摘要可读”不能推出充分了解论文细节；证据深度与判断类型分别记录。

第四，图展示简化不等于数据删除；合并、归档和折叠是不同操作。

第五，图布局引擎与图导出是独立工程任务，不把组件库的一张示例截图当作已经完成。

## 3. 架构决定摘要

| ADR | 决定 | 原因 |
|---|---|---|
| ADR-001 | 静态 SPA，不配套强制后端 | 保持 GitHub Pages 访问门槛低 |
| ADR-002 | 一个 Agent + 受控工具循环 | 可测试、可取消、成本可控 |
| ADR-003 | Paper/Evidence/Claim 三层 | 防止引用表面化与错误确定性 |
| ADR-004 | 图业务模型独立于 UI | 支持导出、迁移和领域测试 |
| ADR-005 | 图补丁原子提交 | 保证失败不破坏既有研究 |
| ADR-006 | 分支快照 + 只读证据共享 | 初版简单且可隔离 |
| ADR-007 | CSS Modules + tokens | 保持统一视觉，减少样式框架叠加 |
| ADR-008 | 无模型也可看明确 demo | 先体验，不假装提供免费推理 |
| ADR-009 | 密钥默认仅内存 | 降低意外持久化泄露风险 |
| ADR-010 | v1.0 无 PDF 全文流水线 | 聚焦探索，不增加服务端依赖 |

## 4. 尚未验证，不得当已完成

未检查 IdeaScope 名称的商标/域名/仓库占用；未使用用户真实 Provider 端点或 key；未验证其目标 Pages origin；未运行生产 React 实现；未做真实用户研究；未证明抽象图一定能提高选题质量；未测未来版本中候选来源的浏览器兼容性。

本包原型仅展示预置示例，研究问题/局限/候选方向为界面设计示例，不是对 RAG 领域完整、最新或创新性的调研结论。真实文献内容仅取题名、年份与简短必要释义；最终产品必须根据真实检索重建依据。
