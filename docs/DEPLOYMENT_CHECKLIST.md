# v0.1.0-C 静态部署检查清单

## 已自动验证

- Vite production build 可使用 `IDEASCOPE_BASE_PATH=/ideascope/` 生成项目子路径资源。
- Playwright 从 `http://127.0.0.1:4173/ideascope/#/` 打开 production preview。
- Hash 路由保留子路径，直接进入与刷新不依赖服务端 rewrite。
- 未配置 Model ID 与 API Key 时，可能产生费用的 Provider 探针保持禁用。
- CI 使用 lockfile、固定 Node 版本并运行 lint、typecheck、unit/contract、build、e2e 与 secret scan。

## 远端执行边界

`.github/workflows/pages.yml` 仅支持手动 `workflow_dispatch`，普通 push 不触发部署。项目仓库名变更时必须同步修改 `IDEASCOPE_BASE_PATH`；自定义域应改为 `/` 并重新验证。

## 待远端验证

- 仓库 Settings → Pages 的 GitHub Actions source 与权限。
- 实际 `https://<owner>.github.io/ideascope/#/` 加载、刷新与静态资源路径。
- Pages HTTPS origin 下的 OpenAlex CORS。
- 401、403、429 与“网络或跨域策略阻止访问”在实际 Provider 上的文案。
- Worker 路径尚无运行时 Worker，留待引入 ELK Worker 时验证。

不得把 localhost production preview 记作真实 Pages 已部署；未经明确要求不运行手动部署 workflow。
