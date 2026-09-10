# ADR-001：静态 SPA 与契约边界

- 状态：接受
- 日期：2026-09-10

## 背景

IdeaScope 需要在 GitHub Pages 之类的静态托管环境运行，同时让用户自行配置模型服务。研究数据、证据与判断需要保持可验证边界，渲染层也不能成为唯一业务数据来源。

## 决定

采用单个 React + TypeScript + Vite 工程。运行时不要求自建后端；领域模型与 React UI 分离；图补丁使用 TypeScript 契约与 JSON Schema 双重校验。CSS Modules 配合统一设计 token。Provider 凭证只允许由后续可信 transport 的内存存储读取，不进入源码、构建变量、持久化或导出。

## 影响

纯静态部署仍需在 0.1-B/0.1-C 实测 Provider CORS、目标 origin 与 Pages 子路径。当前决定不承诺任意 Provider 均可从浏览器直连，也不实现真实模型、检索、图事务或存储。
