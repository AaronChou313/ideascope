# v0.4 受控单智能体运行时

IdeaScope 只使用一个 `AgentController`。运行绑定 run/workspace/branch/baseRevision/promptVersion；控制器按 framing → planning → searching（可选）→ synthesizing → validating → completed 推进，并保留状态轨迹。取消、失败和预算耗尽是显式终态，不存在后台继续运行。

默认硬预算：6 次模型调用、8 次工具调用、4 个检索查询、60 条候选、24,000 字符上下文。上下文只装配目标、分支摘要、最近 8 条消息和当前可见 Evidence ID；超限时先缩减消息并标记 truncated。

Provider 支持严格结构化输出时使用 JSON Schema；否则要求纯 JSON 并用相同 Zod 契约校验。失败最多修复一次，仍无效则终止，不执行工具。`search_literature` 参数先按严格 Schema 校验再执行；检索返回作为 `UNTRUSTED_SEARCH_DATA` 独立注入，不获得指令权限。

模型输出中的 Evidence ID 必须来自运行开始时可见证据或本轮受控工具明确返回的 Evidence ID。未知 ID 导致整次输出拒绝。OpenAI-compatible transport 只通过内存 getter 读取 key，并仅发往用户配置且通过既有 URL 校验的 endpoint；不会记录请求、Authorization 或原始模型内容。

本阶段只用 mock Provider 验证 Controller。没有用户提供并授权使用的真实凭证，因此真实结构化能力、JSON 回退质量、usage、取消和费用全部仍待验证。
