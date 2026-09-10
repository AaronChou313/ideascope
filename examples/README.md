# 演示数据说明

`workspace.demo.json` 含 3 篇真实文献的题名、作者、预印本年份与摘要页面入口。网络图和候选方向是人工编排的界面示例，不是完整文献调研，也不证明新颖性。对应官方页面见文档 S14—S16。

为避免保存大段原文，Paper.abstract 为 null；Evidence.paraphrase 保留极简摘要概括与页面定位，其 verification 为 source_located，而非全文已核验。fetchedAt 使用核查日期的 00:00 UTC 占位基线，不是精确 API 请求时间；生产代码必须填写真实获取时间。contentHash 是示例释义的哈希，不是全文哈希。

`patch.demo.json` 是尚未应用的提案，应在已有 demo 分支 revision=0 下测试。run-demo-001 是测试控制器准备创建的运行上下文，不表示文件已完成该次运行。

运行时需验证所有引用 ID、branch/revision、用户锁定和最终图。JSON Schema 验证仅覆盖补丁形状；不能代替这些检查。
