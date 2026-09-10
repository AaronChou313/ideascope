# v0.1.0 浏览器兼容性实测

本文件只记录实际运行过的结果。Node/curl 成功不计作浏览器成功；模型 mock 不计作真实 Provider 成功。凭证值、Authorization header 与原始响应不写入记录。

## 测试环境

| 项目 | 值 |
|---|---|
| 日期 | 2026-09-10 |
| 应用 origin | `http://127.0.0.1:4173` |
| 构建方式 | Vite 8.3.0 production build + `vite preview` |
| 浏览器 | Codex 内置 Chromium（具体版本未由测试接口提供） |
| Pages HTTPS origin | 待 0.1-C 部署授权与实际域名 |

## 文献来源

| 来源 | 认证 | 基础检索 | CORS | 结果 |
|---|---|---|---|---|
| `https://api.openalex.org/works` | 匿名 | 固定查询 `retrieval augmented generation`，`per-page=1` | 浏览器可读取响应 | **已测试通过**；返回 count 187,295，首条题名 *Retrieval-Augmented Generation for Large Language Models: A Survey* |

该数字是测试时的实时返回值，不是稳定产品数据或质量结论。尚未测试 OpenAlex key、Authorization header、429、语义检索、额度及目标 Pages HTTPS origin。

## OpenAI-compatible Provider

实现了由用户明确输入 Base URL、Model ID 和仅内存 API Key 后运行的逐项探针。远程地址强制 HTTPS；localhost/127.0.0.1 允许 HTTP。请求只发送到用户填写并规范化后的 origin，不读取 `/models`，不会重复拼接 `/v1/v1`。

| 能力 | localhost preview | Pages HTTPS origin | 说明 |
|---|---|---|---|
| 普通完成 | 待真实凭证 | 待验证 | 最小非敏感 prompt |
| 流式响应 | 待真实凭证 | 待验证 | 以收到首个 response body chunk 为基础信号 |
| 结构化输出 | 待真实凭证 | 待验证 | 使用最小 JSON Schema；不能推断所有 schema 均支持 |
| 工具调用 | 待真实凭证 | 待验证 | 只请求无参数 `probe_ok`，不执行外部工具 |
| 取消 | fake transport 自动测试通过；真实端点待验证 | 待验证 | AbortSignal 阻止客户端继续处理；不保证供应商停止计费 |
| usage reporting | 待真实凭证 | 待验证 | 只有响应包含 usage 时才标 supported |

未提供或授权使用真实模型凭证，因此没有发起付费模型请求，不能把本阶段整体标记为真实 Provider 验收通过。

## 错误与安全行为

- 401、403、429 分开显示；其他网络失败使用“网络错误或浏览器跨域策略阻止访问”，不伪造具体原因。
- API Key 只存在模块内存和受控 input 中；组件卸载时清除，不进入 URL、存储、日志、文档或导出。
- 每个模型能力探针都需要用户在页面中主动点击，并明确提示可能产生费用。
- 未使用 `no-cors`、开发代理、公共 CORS 代理或关闭浏览器安全机制。
