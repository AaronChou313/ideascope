# v0.1.0 浏览器兼容性实测

## v0.6.3 设置与首次使用状态

- Provider 名称、类型、协议、Base URL 与 Model 作为 active profile 保存在 IndexedDB；自 v0.6.5 起 API Key 仅进入当前标签页的 sessionStorage，刷新可恢复、关闭标签页清除，且始终不导出。
- “测试连接”只更新当前草稿的探针结果；只有“保存配置”才会更新 active Provider。编辑后的配置若未重新测试，保存状态回到“待验证”。
- 切换 Chat Completions、Responses 与 Messages 协议不会覆盖 Base URL、Model、名称或内存中的 API Key。
- 首页入口同时要求已保存 active profile 和当前会话密钥；底层调用仍保留自身安全检查。
- OpenAlex 设置测试使用固定、最小健康检查参数，不运行用户关键词检索，不写入研究项目或探索历史。

## v0.6.4 真实研究链路

- localhost Chromium + DeepSeek Chat Completions (`deepseek-chat`)：普通完成和完整 Initial Exploration 成功；密钥未写入文档、源码、IndexedDB、诊断或截图。
- OpenAlex：4 组模型生成英文查询成功，归一化/去重后得到 26 条候选；25 条进入当前 Workspace Evidence。来源包含 metadata 与 abstract，两者在节点详情明确区分。
- 节点继续：第二轮 Provider + OpenAlex 调用成功，Research Graph 从 10 节点增量增长到 20 节点，旧节点未丢失。
- OpenAI Responses 与 Anthropic Messages 的完整研究链路仍只有协议 mock，待真实凭证验收；不能从 DeepSeek 成功推断其真实兼容性。

## v0.6.5 来源降级与上下文

- 真实 localhost 流程触发 OpenAlex HTTP 429（响应要求稍后重试）；应用不再把已有候选作废，而会停止继续请求该来源并降级。
- Crossref 浏览器 CORS 与真实查询通过，并在本次激光雷达探索中提供补充资料；Semantic Scholar Adapter、CORS endpoint 与 mock 归一化已接入，真实研究轮次因 Crossref 已满足候选预算而未调用。
- DeepSeek `deepseek-chat` 真实完成激光雷达 Initial Exploration：12 节点、15 Evidence；节点继续后增量为 23 节点、38 Evidence。
- 节点选择后的请求包含节点/邻域/Evidence 的主要上下文，以及研究摘要/范围/图谱轮廓/近期对话的整体上下文。消息持久化仍是 Branch 级时间序列，不宣称已实现每节点独立消息树。

本文件只记录实际运行过的结果。Node/curl 成功不计作浏览器成功；模型 mock 不计作真实 Provider 成功。凭证值、Authorization header 与原始响应不写入记录。

## v0.6.12 集成 Dogfooding

- 2026-09-11 直接访问公开 API：OpenAlex、Crossref、arXiv 均为 HTTP 200；Semantic Scholar 匿名 API 返回 HTTP 429。该 429 被视为单来源限流而不是整次研究失败，已有多来源 partial/fallback 自动化覆盖。
- OpenAlex 三主题实时抽样：Robotics、Localization、Geomatics 查询各返回 5 条；其中分别有 4、4、5 条摘要可用。实时总命中数仅作连通性证据，不作为产品质量承诺。
- 生产构建 E2E 已覆盖 Initial Exploration、节点上下文继续、刷新恢复、Provider guard、来源设置、Profile 保存、多会话切换以及档案入口；模型与文献响应使用受控 mock，因此不记作真实 Provider 验收。
- 本次运行时 macOS 交互桌面锁定，进程环境没有 Provider 凭证。未读取浏览器存储中的密钥、未把旧凭证复制进命令，故 v0.6.12 没有新增真实 Provider 消耗记录；v0.7.0 仍需用户解锁并确认产品体验稳定后才能开始。

## 测试环境

| 项目               | 值                                                                       |
| ------------------ | ------------------------------------------------------------------------ |
| 日期               | 2026-09-10（localhost）；2026-09-11（Pages）                             |
| 应用 origin        | `http://127.0.0.1:4173`；`https://aaronchou313.github.io`                |
| 构建方式           | Vite 8.3.0 production build + `vite preview`；GitHub Pages Actions build |
| 浏览器             | Codex 内置 Chromium（localhost）；系统 Chrome headless（Pages）          |
| Pages HTTPS origin | `https://aaronchou313.github.io/ideascope/`，已验证                      |

## 文献来源

| 来源                             | 认证 | 基础检索                                                                                          | CORS                                                              | 结果                                                                                                              |
| -------------------------------- | ---- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `https://api.openalex.org/works` | 匿名 | 固定查询 `retrieval augmented generation`，`per_page=1`                                           | 浏览器可读取响应                                                  | **已测试通过**；返回 count 187,295，首条题名 _Retrieval-Augmented Generation for Large Language Models: A Survey_ |
| `https://api.openalex.org/works` | 匿名 | 0.3-A 普通关键词 `retrieval augmented generation reliability evidence`，`cursor=*`，`per_page=10` | localhost production preview 浏览器可读取并归一化响应             | **已测试通过**；归一化 10 条，首条题名 _Retrieval-Augmented Generation for Large Language Models: A Survey_       |
| `https://api.openalex.org/works` | 匿名 | Pages origin 基础请求 `retrieval augmented generation reliability evidence`，`per-page=1`         | `https://aaronchou313.github.io` 浏览器 origin 收到 CORS response | **已测试通过**；HTTP 200，首条题名 _Retrieval-Augmented Generation for Large Language Models: A Survey_           |

数字与题名是测试时的实时返回值，不是稳定产品数据或质量结论。2026-09-11 已真实触发 OpenAlex 429 并验证 Crossref 降级；空结果、超时、取消和异常响应仍主要由 mock 覆盖。Pages HTTPS origin 的匿名基础 CORS 已验证。

## 模型 Provider 协议

用户明确选择 Provider Format，并输入 Base URL、Model ID 和仅内存 API Key 后运行逐项探针。远程地址强制 HTTPS；localhost/127.0.0.1 允许 HTTP。请求只发送到用户填写并规范化后的 origin，不读取 `/models`，不会重复拼接协议路径。

| Provider Format         | Endpoint            | 结构化输出策略                                         | 认证                              | mock 验证                                            | 真实凭证验证                                                       |
| ----------------------- | ------------------- | ------------------------------------------------------ | --------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------ |
| OpenAI Chat Completions | `/chat/completions` | `json_object`；不假定兼容服务支持 OpenAI `json_schema` | `Authorization: Bearer`           | 请求、文本/reasoning/tool/finish、usage 已通过       | DeepSeek `deepseek-chat` 完成与 JSON 已通过；OpenAI/其他服务待验证 |
| OpenAI Responses API    | `/responses`        | `text.format: json_schema`                             | `Authorization: Bearer`           | input、嵌套 output_text、function_call、usage 已通过 | 待 OpenAI 真实凭证与预算授权                                       |
| Anthropic Messages API  | `/v1/messages`      | 纯 JSON prompt fallback + 本地严格校验                 | `x-api-key` + `anthropic-version` | system/messages、text/tool_use、usage 已通过         | 待 Anthropic 真实凭证与预算授权                                    |

DeepSeek 实测日期为 2026-09-11。普通完成与结构化输出均从本地 production build 的系统 Chrome 发起；普通完成收到文本，结构化输出收到有效 JSON。探针使用 64 output tokens，并请求关闭 thinking；不保存临时 key、响应正文或完整请求。流式、工具、取消及 `deepseek-reasoner` 未额外消耗用户预算实测。

| 能力            | mock/本地实现               | 真实服务                                             | 说明                                                                                          |
| --------------- | --------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 普通完成        | 三协议通过                  | DeepSeek Chat 通过；其余待验证                       | 必须有最终文本才标支持；reasoning-only/token 用尽标结果不足，空文本标测试失败，不误报不支持   |
| 流式响应        | 三协议事件解析通过          | 待验证                                               | 解析 SSE/stream JSON、协议 delta/output event，并要求至少一个模型输出事件及合法终止或正常 EOF |
| 结构化输出      | 三策略通过                  | DeepSeek json_object 通过；Responses/Messages 待验证 | 必须可解析 JSON 且严格等于 `{ok:true}` schema（拒绝缺字段、错误类型和额外字段）               |
| 工具调用        | 三协议调用校验通过          | 待验证                                               | 必须返回真实 `probe_ok` tool/function call，且 arguments/input 是合法 JSON object；不执行工具 |
| 取消            | fake transport 自动测试通过 | 待验证                                               | AbortSignal 阻止客户端继续处理；不保证供应商停止计费                                          |
| usage reporting | 三协议字段解析通过          | DeepSeek 响应包含 usage；其余待验证                  | 只有响应包含有效 usage 时才标 supported                                                       |

除用户明确授权的 DeepSeek 两项最小探针外，没有使用其他真实模型凭证；不能把 OpenAI Responses、Anthropic Messages 或未实测能力标记为真实 Provider 验收通过。

## 错误与安全行为

- 能力状态为“支持 / 不支持 / 测试失败 / 待验证”。HTTP、网络、CORS 或响应格式错误会把对应能力更新为“测试失败”，不继续显示“待验证”；HTTP 400 不自动等于“不支持”。
- 401、403、404、429、400 请求格式、模型不存在、参数不支持、响应格式异常、离线网络与疑似 CORS 分开诊断。标准 JSON error body 只提取并截断显示 `type / code / message`，同时脱敏 Bearer token 与 key 形状。
- API Key 只存在模块内存、当前标签页 sessionStorage 和受控 input 中；关闭标签页或执行清除操作后移除，不进入 IndexedDB、URL、日志、文档或导出。
- 每个模型能力探针都需要用户在页面中主动点击；“一键测试四项能力”按顺序执行四次最小请求，并明确提示可能产生费用。
- 未使用 `no-cors`、开发代理、公共 CORS 代理或关闭浏览器安全机制。
