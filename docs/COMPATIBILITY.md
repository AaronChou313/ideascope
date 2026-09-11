# v0.1.0 浏览器兼容性实测

本文件只记录实际运行过的结果。Node/curl 成功不计作浏览器成功；模型 mock 不计作真实 Provider 成功。凭证值、Authorization header 与原始响应不写入记录。

## 测试环境

| 项目 | 值 |
|---|---|
| 日期 | 2026-09-10（localhost）；2026-09-11（Pages） |
| 应用 origin | `http://127.0.0.1:4173`；`https://aaronchou313.github.io` |
| 构建方式 | Vite 8.3.0 production build + `vite preview`；GitHub Pages Actions build |
| 浏览器 | Codex 内置 Chromium（localhost）；系统 Chrome headless（Pages） |
| Pages HTTPS origin | `https://aaronchou313.github.io/ideascope/`，已验证 |

## 文献来源

| 来源 | 认证 | 基础检索 | CORS | 结果 |
|---|---|---|---|---|
| `https://api.openalex.org/works` | 匿名 | 固定查询 `retrieval augmented generation`，`per_page=1` | 浏览器可读取响应 | **已测试通过**；返回 count 187,295，首条题名 *Retrieval-Augmented Generation for Large Language Models: A Survey* |
| `https://api.openalex.org/works` | 匿名 | 0.3-A 普通关键词 `retrieval augmented generation reliability evidence`，`cursor=*`，`per_page=10` | localhost production preview 浏览器可读取并归一化响应 | **已测试通过**；归一化 10 条，首条题名 *Retrieval-Augmented Generation for Large Language Models: A Survey* |
| `https://api.openalex.org/works` | 匿名 | Pages origin 基础请求 `retrieval augmented generation reliability evidence`，`per-page=1` | `https://aaronchou313.github.io` 浏览器 origin 收到 CORS response | **已测试通过**；HTTP 200，首条题名 *Retrieval-Augmented Generation for Large Language Models: A Survey* |

数字与题名是测试时的实时返回值，不是稳定产品数据或质量结论。429、空结果、超时、取消和异常响应均使用 mock 测试了受控状态；尚未真实触发 OpenAlex 429，也未测试 OpenAlex key、Authorization header、语义检索与长期额度。Pages HTTPS origin 的匿名基础 CORS 已验证。

## 模型 Provider 协议

用户明确选择 Provider Format，并输入 Base URL、Model ID 和仅内存 API Key 后运行逐项探针。远程地址强制 HTTPS；localhost/127.0.0.1 允许 HTTP。请求只发送到用户填写并规范化后的 origin，不读取 `/models`，不会重复拼接协议路径。

| Provider Format | Endpoint | 结构化输出策略 | 认证 | mock 验证 | 真实凭证验证 |
|---|---|---|---|---|---|
| OpenAI Chat Completions | `/chat/completions` | `json_object`；不假定兼容服务支持 OpenAI `json_schema` | `Authorization: Bearer` | 请求、文本/reasoning/tool/finish、usage 已通过 | DeepSeek `deepseek-chat` 完成与 JSON 已通过；OpenAI/其他服务待验证 |
| OpenAI Responses API | `/responses` | `text.format: json_schema` | `Authorization: Bearer` | input、嵌套 output_text、function_call、usage 已通过 | 待 OpenAI 真实凭证与预算授权 |
| Anthropic Messages API | `/v1/messages` | 纯 JSON prompt fallback + 本地严格校验 | `x-api-key` + `anthropic-version` | system/messages、text/tool_use、usage 已通过 | 待 Anthropic 真实凭证与预算授权 |

DeepSeek 实测日期为 2026-09-11。普通完成与结构化输出均从本地 production build 的系统 Chrome 发起；普通完成收到文本，结构化输出收到有效 JSON。探针使用 64 output tokens，并请求关闭 thinking；不保存临时 key、响应正文或完整请求。流式、工具、取消及 `deepseek-reasoner` 未额外消耗用户预算实测。

| 能力 | mock/本地实现 | 真实服务 | 说明 |
|---|---|---|---|
| 普通完成 | 三协议通过 | DeepSeek Chat 通过；其余待验证 | 必须有最终文本才标支持；reasoning-only/token 用尽标结果不足，空文本标测试失败，不误报不支持 |
| 流式响应 | 三协议事件解析通过 | 待验证 | 解析 SSE/stream JSON、协议 delta/output event，并要求至少一个模型输出事件及合法终止或正常 EOF |
| 结构化输出 | 三策略通过 | DeepSeek json_object 通过；Responses/Messages 待验证 | 必须可解析 JSON 且严格等于 `{ok:true}` schema（拒绝缺字段、错误类型和额外字段） |
| 工具调用 | 三协议调用校验通过 | 待验证 | 必须返回真实 `probe_ok` tool/function call，且 arguments/input 是合法 JSON object；不执行工具 |
| 取消 | fake transport 自动测试通过 | 待验证 | AbortSignal 阻止客户端继续处理；不保证供应商停止计费 |
| usage reporting | 三协议字段解析通过 | DeepSeek 响应包含 usage；其余待验证 | 只有响应包含有效 usage 时才标 supported |

除用户明确授权的 DeepSeek 两项最小探针外，没有使用其他真实模型凭证；不能把 OpenAI Responses、Anthropic Messages 或未实测能力标记为真实 Provider 验收通过。

## 错误与安全行为

- 能力状态为“支持 / 不支持 / 测试失败 / 待验证”。HTTP、网络、CORS 或响应格式错误会把对应能力更新为“测试失败”，不继续显示“待验证”；HTTP 400 不自动等于“不支持”。
- 401、403、404、429、400 请求格式、模型不存在、参数不支持、响应格式异常、离线网络与疑似 CORS 分开诊断。标准 JSON error body 只提取并截断显示 `type / code / message`，同时脱敏 Bearer token 与 key 形状。
- API Key 只存在模块内存和受控 input 中；组件卸载时清除，不进入 URL、存储、日志、文档或导出。
- 每个模型能力探针都需要用户在页面中主动点击；“一键测试四项能力”按顺序执行四次最小请求，并明确提示可能产生费用。
- 未使用 `no-cors`、开发代理、公共 CORS 代理或关闭浏览器安全机制。
