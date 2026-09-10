# v0.3 文献检索边界

## 普通检索契约

v0.3.0-A 默认来源为 OpenAlex `/works` 普通 `search`，不启用 `search.semantic`。调用方必须分别给出原始想法、实际关键词、关键词语言与转换依据；含中文的原始想法不能原样冒充整理后的关键词。

单次产品预算最多 60 条、最多 5 页；适配器使用 `cursor=*` 与服务返回的 `next_cursor`，每页不超过 100 条。请求由共享节流器串行化，默认间隔 120ms，整轮 30 秒超时，支持 AbortSignal 取消。零结果、超时、429、来源不可用和响应异常分别写入受控 `SearchRecord`。

缓存键必须覆盖来源、关键词、筛选、排序、选择字段和关键词语言。它不包含凭证。当前阶段只生成内存查询记录；Dexie 持久化与缓存有效期在后续存储阶段接入。

## 归一化与真实性

OpenAlex 响应以 Zod 在运行时校验，再归一化为 `Paper`。缺少摘要保持 `null`；倒排摘要只按位置还原，不做模型补写。作者、年份、期刊与 URL 缺失时保留空值。外部题名、摘要和作者字段均视为不可信文本，由 React 文本节点转义显示。

检索结果只证明“来源返回了这些记录”，不证明论文支持某个研究判断。去重、版本关联、证据片段与持久化属于 v0.3.0-B，不在本阶段静默执行。

## 脱敏诊断

`SearchRecord.diagnostic` 只保留固定 endpoint（无 query string）、HTTP 状态、可取得的剩余额度/重置秒数、响应声明的请求费用与受控错误码。完整请求 URL、Authorization、API key 和原始响应体不写入诊断、日志或导出。

## 依据与待验证

实现于 2026-09-10 对照 OpenAlex 官方 API 文档：普通 Search、Cursor paging、Select fields、Authentication 与 Error handling。官方当时声明匿名基础使用可用、`per_page` 支持上限为 100、基础分页只覆盖前 10,000 条，429 可表示速率或日预算耗尽，并建议超时与退避。目标 GitHub Pages HTTPS origin、可选 API key 与长期额度仍待真实验证。
