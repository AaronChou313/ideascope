# v0.1.0-C 静态部署检查清单

## 已自动验证

- Vite production build 可使用 `IDEASCOPE_BASE_PATH=/ideascope/` 生成项目子路径资源。
- Playwright 从 `http://127.0.0.1:4173/ideascope/#/` 打开 production preview。
- Hash 路由保留子路径，直接进入与刷新不依赖服务端 rewrite。
- 未配置 Model ID 与 API Key 时，可能产生费用的 Provider 探针保持禁用。
- CI 使用 lockfile、固定 Node 版本并运行 lint、typecheck、unit/contract、build、e2e 与 secret scan。

## 远端执行边界

`.github/workflows/pages.yml` 仅支持手动 `workflow_dispatch`，普通 push 不触发部署。项目仓库名变更时必须同步修改 `IDEASCOPE_BASE_PATH`；自定义域应改为 `/` 并重新验证。

## 远端验证（2026-09-11）

- GitHub Pages 使用 GitHub Actions source，强制 HTTPS；workflow run `34542847656` 成功部署 commit `3b5d49c`。
- `https://aaronchou313.github.io/ideascope/#/` 与 `#/workspace/demo` 在系统 Chrome headless 中加载成功，console/page error 为 0。
- HTML、JS、CSS 与 favicon 均使用 `/ideascope/` 子路径，首页 HTTP 200。
- Pages HTTPS origin 下匿名 OpenAlex `per-page=1` 请求得到 CORS response 与 HTTP 200；未调用 Provider 或付费模型。

## 仍待外部验证

- 401、403、429 与“网络或跨域策略阻止访问”在实际 Provider 上的文案。
- Worker 路径尚无运行时 Worker，留待引入 ELK Worker 时验证。

不得把 localhost production preview 记作真实 Pages 已部署；后续部署仍只在用户明确授权后手动运行 workflow。
