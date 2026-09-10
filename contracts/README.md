# 契约草案

`domain.ts` 定义主要实体；`graph-patch.schema.json` 对图操作进行严格形状检查。Schema 的 example 域名只是规范标识，不要求网络访问，也不表示注册了域名。

**JSON Schema 不能检查跨记录 ID、语义证据支持、用户锁定、事务与分支并发；必须在 application/domain 层补充。** UPDATE_CLAIM 需要验证合并后的完整 Claim；模型提出的 verification 不能由模型自授权升级，运行时只允许 unreviewed 或由可信校验器覆盖。

本包没有生产 reducer/数据库实现。初次开发应编译这些类型，按实际实现同步 Schema，建立差异检测与例子测试。导出格式初版使用 formatVersion=1，Agent patch 使用 protocolVersion=0.1，两者不绑定产品版本。
