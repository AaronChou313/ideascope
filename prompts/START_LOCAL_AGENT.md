请读取当前项目中的 AGENTS.md、README.md、docs/PROGRESS.md，以及 docs/02_RELEASE_ROADMAP.md 的 v0.1.0 部分，开始开发 IdeaScope。

这次只完成 v0.1.0-A：检查现有目录并保护未提交修改；建立 React + TypeScript + Vite 生产工程、严格类型检查/测试/构建入口；落实 CSS tokens；编译并校验 contracts/ 中的数据与图补丁草案；补充示例引用完整性测试；记录实际依赖版本与下一阶段连接验证事项。

请先检查而不是假设这是空仓库。若已有工程，增量接入，不整体重建。不要只输出计划，要在当前目录实施可完成部分。

产品边界：纯前端部署至 GitHub Pages、单研究智能体、用户自配 Provider、只做辅助调研/思考与方向收敛。不增加后端、账号、云同步、多智能体、PDF 流水线、实验执行或论文撰写。

视觉以 design/index.html 和 docs/05_DESIGN_SYSTEM.md 为基线。视觉主体必须是黑 / 白 / 中性灰，蓝色只用于主操作、当前焦点、选中关系与少量交互状态；不要使用大面积淡绿、淡蓝、淡紫背景，不要通过给节点整块染色来表达语义。它是可点击的样式原型，不是生产应用，不能把演示对话当真接入。正式图使用 React Flow + elkjs，语义数据与渲染状态分离。

密钥不得进入源码、VITE_*、存储、日志、prompt 或导出。浏览器 CORS 和真实 Provider 能力留给 0.1-B 实测，不能把 mock 结果记为真实连接成功。

结束时运行已具备的 lint、typecheck、测试、build，更新 docs/PROGRESS.md，报告修改文件、真实结果、待验证事项和下一阶段。不要自动推送、创建远端仓库、发布 Pages 或调用付费模型。
