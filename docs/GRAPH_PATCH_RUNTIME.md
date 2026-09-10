# GraphPatch 0.1 运行边界

GraphPatch 只修改已存在 workspace 的单一 branch。它不能携带或创建 Paper、Evidence、Provider 配置或密钥；模型输出即使通过 JSON Schema，也必须再次经过本地领域校验。

提交顺序为：校验 workspace / branch / baseRevision → 在副本执行全部操作 → 校验引用与图完整性 → 在一个 Dexie 事务中保存提交前 checkpoint、更新后的 branch、patch receipt 和 run summary。任一操作非法会拒绝整个补丁，不写入部分结果。相同 patchId、runId 与目标的重放返回已有回执，不重复增加 revision。

`sourced` 判断至少引用一条本地已存在 Evidence；所有 evidenceId 都必须可解析。`inference`、`hypothesis` 与 `user_note` 保持各自标识。空检索可以提出无引用的 hypothesis/question，但不能伪装成 sourced 结论。锁定节点不可更新、归档或作为合并来源。

当前阶段仍未把真实 Provider 输出接入 UI 自动提交。演示 workspace 的引用渲染来自仓库内明确标记的 demo 数据；真实模型、并发多标签页冲突与大图事务性能待后续实测。
