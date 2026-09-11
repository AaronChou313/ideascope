# 数据流与安全边界

IdeaScope 是纯前端静态应用，没有 IdeaScope 自建后端。浏览器中存在三类数据流：

1. 用户填写的 Provider origin：仅在用户主动测试或运行单一研究智能体时，按用户选择的协议向该明确 origin 的 `/chat/completions`、`/responses` 或 `/v1/messages` 发送系统约束、当前研究上下文和所需 Evidence ID。OpenAI 协议凭证只放 `Authorization` header，Anthropic 协议只放 `x-api-key` header；均默认仅存模块内存。远程 origin 必须 HTTPS，禁止 URL 内嵌凭证和跨 origin redirect。
2. OpenAlex：仅在用户主动检索时向 `https://api.openalex.org/works` 发送实际关键词、筛选、游标和公开 API 参数；不发送 Provider 密钥、完整研究对话或 workspace 导出。
3. 本地文件下载：JSON/Markdown/SVG/PNG 与脱敏诊断通过 Blob 在浏览器本地生成，不上传到第三方。导出可能包含用户消息、用户笔记和 Evidence excerpt，下载前显示数量审计。

外部题名、摘要、模型文本和 Markdown 默认作为文本节点渲染；不使用 `dangerouslySetInnerHTML`，不执行 HTML，不自动加载 Markdown 图片，不接受 `javascript:` 链接。SVG 导出只生成固定的 `<svg>/<rect>/<path>/<text>/<g>` 结构并进行 XML 转义。

纯前端页面无法为长期 API key 提供与系统钥匙串或服务端密钥库相同的安全保证。用户应优先使用短期、限额、可撤销的 Provider key。刷新、离开设置页或“清除全部本地数据”会清空当前内存 key；清除操作需要输入完整确认文字且不可撤销，执行前应先导出项目备份。

脱敏诊断只包含固定 endpoint、HTTP 状态、受控错误码、额度元数据、结果计数、运行状态和 usage；不包含查询词、缓存键、完整 URL、请求头、key、prompt、响应正文或消息。
