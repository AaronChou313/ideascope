# v0.1.0-A 依赖基线

记录日期：2026-09-10。以下版本来自本机 `npm install` 后的 `package-lock.json` 与 `npm ls --depth=0`，不是根据旧资料推测。

## 运行环境

| 项目 | 实测版本 |
|---|---|
| Node.js | 24.18.0 |
| npm | 11.16.0 |
| 包管理与锁文件 | npm / `package-lock.json` lockfileVersion 3 |

`.node-version` 与 `package.json#engines` 固定当前工程基线。后续 CI 与本地环境应使用同一 Node 版本；升级需单独运行完整检查并更新本文件。

## 生产依赖

| 依赖 | 锁定版本 | 当前职责 |
|---|---:|---|
| react / react-dom | 19.3.0 | 静态 SPA UI |
| react-router-dom | 7.18.3 | Hash 路由与静态托管路径 |
| @xyflow/react | 12.11.6 | 后续语义图渲染，0.1-A 未接入业务 UI |
| elkjs | 0.12.0 | 后续自动布局，0.1-A 未执行布局 |
| zustand | 5.0.15 | 后续临时 UI 状态 |
| dexie | 4.4.5 | 后续 IndexedDB 业务数据 |
| zod | 4.6.1 | 后续不可信运行时输入校验 |

这些依赖在 0.1-A 仅完成安装和锁定。除 React 外，不将“已安装”表述为对应能力已实现。

## 工程与测试依赖

| 依赖 | 锁定版本 |
|---|---:|
| vite / @vitejs/plugin-react | 8.3.0 / 6.1.1 |
| typescript | 6.0.3 |
| eslint / typescript-eslint | 10.10.0 / 8.70.0 |
| @eslint/js | 10.0.1 |
| eslint-plugin-react-hooks / react-refresh | 7.1.1 / 0.5.6 |
| vitest / jsdom | 5.0.0 / 30.0.1 |
| @testing-library/react / jest-dom | 16.3.3 / 7.0.1 |
| @playwright/test | 1.63.0 |
| ajv | 8.20.0 |
| @types/node / react / react-dom | 22.20.2 / 19.3.0 / 19.3.0 |
| globals | 17.12.0 |

安装审计结果：263 个包，`npm audit` 报告 0 个已知漏洞。首次尝试的 TypeScript 7.0.2 不满足 typescript-eslint 8.70.0 的 `<6.1` peer 范围，因此未使用强制安装，改锁定兼容的 TypeScript 6.0.3。

## 仍待验证

- 0.1-B：浏览器中真实 Provider 普通完成、流式、结构化能力、取消与 CORS。
- 0.1-B：OpenAlex 浏览器直连、认证、限流与错误分类。
- 0.1-C：目标 GitHub Pages 子路径、Hash 路由、静态资源与 production preview 的完整部署检查。
- 0.2：React Flow、ELK、Zustand 与 Dexie 的实际集成行为和浏览器兼容性。
