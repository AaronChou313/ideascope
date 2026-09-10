# 04 · 单智能体、证据与图谱协议

## 1. 原则：一个研究助手，受控工具循环

用户只面对一个研究助手。内部采用可取消、可测试的状态机，不以多个角色互相对话来模拟复杂度。

```text
idle → framing → planning → searching → synthesizing → validating
                                                   ↓
                         awaiting_approval ← proposal_ready
                                                   ↓
                                             committing → completed
任一执行状态 → cancelling → cancelled
任一执行状态 → failed / budget_exhausted / interrupted
```

“解释一个已有概念”可以直接走上下文回答，不必每次检索；“近期进展”“是否已有工作”“某条判断依据”必须考虑新增检索或明确告知使用缓存及时间。状态机不是逼用户按固定阶段点下一步的向导。

一次工作区同时只运行一个写入型任务。Run 绑定 workspaceId、branchId、baseRevision、runId、promptVersion 与策略快照。切换界面不会改变这些绑定。取消后不再执行新工具，晚到结果可丢弃，不再提交地图；取消不保证供应商停止计费。

## 2. 初轮检索策略

先构造 framing：对象、问题、预期理解、用户约束、可能领域与待确认假设。领域分类是导航线索，不是不可修改的分类结论。

将检索目的分成：入门综述/概念，主要路线，代表性工作，近期研究，反例或局限。首轮使用多个互补查询；英文关键词来源必须有中文解释。先取较小候选集，去重后按问题相关性、路线覆盖、证据可得性、时间跨度综合选择，不只按被引数。

默认预算是产品拟定值，运行时可调整：单轮最多 6 次 LLM 调用、8 次工具调用、4 个不同检索查询、60 条候选记录、送入综合的至多 12—20 篇摘要、至多 40 项图操作。低预算模式相应减半。不能为了凑满配额搜索或造节点。

模型上下文预留不少于 25% 给输出与工具返回；模型长度未知时保守限制输入，错误时缩减。文字长度估算只能标“估算”；Provider 未报告 usage 时不可显示确切 token/金额。

## 3. 核心实体

### Paper：文献记录

Paper 是可识别的出版记录，字段包括内部 id、externalIds、title、authors、year、venue、url、abstract、source、fetchedAt。未知值保留 null/空数组，不能让模型补齐。

DOI 规范化去前缀、转小写；arXiv base id 与版本号分开记录。精确 ID 可自动合并重复抓取。疑似同文献的标题匹配仅提出建议；预印本和正式发表版本建立 `relatedVersionIds`，不能把两者当作相互独立的证据票数。

### Evidence：可定位的证据片段

Evidence 关联一个 Paper，可含原文短片段、来源层级、所在位置、抓取时间、内容哈希。只读到摘要就标 abstract；只有题名/年份就是 metadata。用户自己贴的内容标 user_excerpt 并记录出处，不冒充平台已获取全文。

`text_matched` 只代表能在来源文本中找到片段，不等于结论科学上成立。摘要支持范围有限；不从摘要推导未陈述的参数、数据集细节或实验结果。合理性核验与位置核验必须分开。

### Claim：研究判断

Claim 存放一句可讨论的陈述，包含 `epistemicStatus`：sourced / inference / hypothesis / user_note；`evidenceLinks`：支持、反对、背景；`qualifiers`：适用条件；`verification`：未审阅、机器检查、用户审阅。

sourced 必须有与陈述匹配的证据；metadata-only 只支持书目信息，不支持方法效果或研究空白。inference 需要说明推断来自哪些资料，但不能因有引用就变成 sourced。hypothesis 允许无引用，必须显式标“待验证”。

### GraphNode / GraphEdge：认知结构

Node 类型固定为 question、concept、approach、finding、debate、gap、direction。Subproblem 用 question 的 parent/group 表达，避免类型过多。Node 的标题与一句话摘要服务理解，详细论述放 Claim 与详情面板。

Edge 类型为 decomposes_into、addressed_by、requires、contrasts_with、limited_by、motivates、related_to。各端点方向在契约中固定；边带简短 label 和可选 claimIds。不要用 supports 将两个复杂节点简单相连，支持/反对应精确落在 Claim ↔ Evidence。

### Branch / Direction

Branch 保存研究范围、图快照、revision、焦点、分支摘要、父分支与 forkedFromRevision。共享的 Paper/Evidence 内容不可变，图状态在分支内独立。

DirectionCard 包含 researchQuestion、motivation、knownWork、possibleDifference、counterEvidence、unresolvedQuestions、nextLiteratureQuestions、status。`possibleDifference` 的措辞必须是“可能差异/待核查”，不是创新性裁决。

## 4. 工具边界

| 工具 | 可做 | 不可做 |
|---|---|---|
| search_literature | 指定已启用来源、查询与筛选 | 任意 URL 请求、传出凭证 |
| get_papers | 根据已获 ID 批量补全 | 模型自造 DOI 当已查证文献 |
| get_evidence | 读取已有证据片段 | 读取用户未选择共享的项目 |
| get_graph_context | 当前分支局部图与摘要 | 无约束加载所有历史 |
| propose_graph_patch | 提出受 Schema 限定的图操作 | 直接写数据库、生成 Paper/Evidence |
| propose_branch | 提出新分支标题/范围 | 自动破坏旧分支 |
| propose_direction | 提出方向卡片草稿 | 执行实验、写论文 |

模型没有 `fetch(url)`、shell、eval、改设置、读密钥、删除项目或发布网络分享等能力。写入动作由 application 层执行，客户端对 ID、关系、数量、权限逐项验证。提示词只是一层约束，不是安全边界 [S11]。

## 5. 图补丁：可验证、原子化、可撤销

补丁 envelope：protocolVersion、patchId、runId、workspaceId、branchId、baseRevision、summary、operations。JSON Schema 草案见 `contracts/graph-patch.schema.json`。

v1.0 操作：ADD_NODE、UPDATE_NODE、ADD_CLAIM、UPDATE_CLAIM、ADD_EDGE、UPDATE_EDGE、ARCHIVE_NODE、MERGE_NODES。没有 DELETE_WORKSPACE、SET_PROVIDER、任意 JavaScript 或任意 JSON path。

校验顺序：JSON 结构 → 大小/操作数 → run/branch/revision → 已知 ID → 引用与证据级别 → 节点/边完整性 → 用户锁定 → 合并安全 → 提案可应用。

在副本中依次执行全部操作，全部通过后在同一 IndexedDB 事务中检查 revision 并写新图、checkpoint、运行状态。任一失败则零写入，保留原图并说明失败原因。网络检索在事务外完成，不在事务内等待 LLM。

相同 patchId 重放必须幂等；baseRevision 落后时拒绝并重新生成或要求用户审阅，不能静默覆盖。模型摘要与正式聊天回答只能描述已提交操作；未应用时写“建议新增”，不能写“已经更新”。

### 用户审批策略

普通补充节点/边：可自动应用但显示可撤销通知与变更摘要。

合并、归档、重写用户编辑内容：展示预览后应用；锁定节点不可被自动改写。用户明确要求该次归档/合并时可执行已授权操作，但仍保存 checkpoint。视觉布局调整不是语义修改，不占用 LLM 操作。

### 合并语义

MERGE_NODES 指定 sourceIds 与 targetId。汇集所有 claimIds 与别名，重连入/出边，移除自环与重复边，保留来源节点归档及 mergedInto。不能把支持与反对的 Claim 混成一个“共识”。被锁定的源节点或目标节点触发审阅，不强行合并。

## 6. 分支与持续上下文

新分支采用“复制当前已提交快照”的简单策略。保留 parentBranchId、forkedFromRevision 与 forkedAt，随后 revision 从 0 开始独立变化。共享证据不等于共享可变图对象。

每次请求上下文包含：全局用户目标与边界、当前分支摘要、用户最近消息、当前焦点邻域、相关 Claim/Evidence、检索历史摘要和预算。默认只发当前分支；用户明确比较分支时才加入被选中的其他分支摘要。

不每次附完整对话、全部论文与整个图。旧消息可压缩，但摘要要保留关键决定、用户约束、否定结论和相应来源 ID。摘要失败保留旧摘要，不覆盖为空。用户笔记不自动升级为事实。

## 7. 图的整理与认知负担

区分三种动作：视觉折叠（数据不变）、语义合并（改变数据需审阅）、归档（隐藏但保留）。不得为了把画布控制在 30 个节点以内自动删除研究内容。

初轮 8—15 可见节点是建议，深入后通常 15—30；焦点模式展示 1—2 跳邻域；超过时提供主题分组与折叠。布局按节点实际尺寸计算，尽量只调整新邻域，保留用户 pin 的位置。

图可以存在争议、未知与断开的待调查主题。不要为了视觉完整凭空加边。可见连线标签优先当前选中路径，其余在悬停/选中时展示，避免所有线都带长文字。

## 8. 错误与降级语义

- 检索零结果：调整查询或显示未找到，不把零结果等同于研究空白。
- 来源故障：保留已有资料，显示哪一源失败，可选择仅基于已有资料讨论。
- Provider 不支持工具：严格 JSON 模式回退；无合法结构则只解释，不写图。
- 预算耗尽：停在已提交版本，列已完成和未完成部分，由用户决定继续。
- 刷新/关闭：运行标 interrupted，恢复最近 checkpoint，不声称后台继续工作。
- 修复 JSON：最多一次，失败后显式报错；不以循环“自动修复”吞掉预算。
- 网络重试：GET 查询可有限重试；LLM POST 网络结果不明时不盲目重发，以免重复费用。

## 9. 系统提示词结构

角色与边界 → 当前用户目标 → 证据约束 → 工具权限 → 输出格式 → 当前分支上下文 → 不可信检索资料。外部资料永远位于独立数据区，不包含执行权限。提示词要有版本号、测试集与变更记录。

本包 `prompts/RESEARCH_AGENT_SYSTEM.md` 是起始模板，不是绕过验证的万能指令。模型最终输出只包括给用户的回答、引用、图提案和下一步问题；不要求输出隐式思维链。
