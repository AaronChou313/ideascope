import { expect, test } from "@playwright/test";

async function configureProvider(page: import("@playwright/test").Page) {
  await page.goto("/ideascope/#/settings/provider");
  await page.getByLabel("Model ID").fill("test-model");
  await page.getByLabel("API Key").fill("test-session-key");
  await page.getByRole("button", { name: "保存配置" }).click();
  await expect(page.getByText(/Provider 配置已保存/)).toBeVisible();
}

test("loads from a Pages-style subpath and keeps navigation in the hash", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/ideascope/#/");
  await expect(page.getByRole("heading", { name: /让一个想法/ })).toBeVisible();
  expect(page.url()).toContain("/ideascope/#/");
  expect(errors).toEqual([]);
});

test("guides first use through provider settings and preserves the idea draft", async ({ page }) => {
  const idea = "首次使用流程中的研究想法";
  await page.goto("/ideascope/#/");
  await page.getByLabel("先说说，你在想什么？").fill(idea);
  await page.getByRole("button", { name: /开始探索/ }).click();
  await expect(page.getByRole("dialog", { name: "需要配置模型" })).toBeVisible();
  await page.getByRole("button", { name: "前往设置" }).click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: "reports/visual/settings-provider-1440x1000.png", fullPage: true });
  await page.getByLabel("Model ID").fill("test-model");
  await page.getByLabel("API Key").fill("test-session-key");
  await page.getByRole("button", { name: "保存配置" }).click();
  await page.getByRole("link", { name: "返回首页" }).click();
  await expect(page.getByLabel("先说说，你在想什么？")).toHaveValue(idea);
  await page.getByRole("button", { name: /开始探索/ }).click();
  await expect(page.getByRole("heading", { name: "初始范围" })).toBeVisible();
});

test("returns from settings to the originating workspace", async ({ page }) => {
  await page.goto("/ideascope/#/workspace/demo");
  await page.getByLabel("模型与来源设置").click();
  await expect(page.getByRole("link", { name: "返回研究工作区" })).toBeVisible();
  await page.getByRole("link", { name: "文献来源" }).click();
  await page.getByRole("link", { name: "返回研究工作区" }).click();
  await expect(page).toHaveURL(/#\/workspace\/demo$/);
});

test("does not treat an unsaved provider draft as active", async ({ page }) => {
  await page.goto("/ideascope/#/settings/provider");
  await page.getByLabel("Model ID").fill("unsaved-model");
  await page.getByLabel("API Key").fill("session-key");
  await page.reload();
  await expect(page.getByText("尚未保存", { exact: true })).toBeVisible();
});

test("creates, restores and deletes a local project without a model call", async ({ page }) => {
  const idea = "本地证据边界测试项目";
  await configureProvider(page);
  await page.goto("/ideascope/#/");
  await page.getByLabel("先说说，你在想什么？").fill(idea);
  await page.getByRole("button", { name: /开始探索/ }).click();
  await expect(page.getByRole("heading", { name: "初始范围" })).toBeVisible();
  await expect(page.getByText("用户写下的探索起点；尚未检索或由模型分析。")).toBeVisible();
  await page.goto("/ideascope/#/");
  const project = page.locator("article").filter({ hasText: idea });
  await expect(project).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: "reports/visual/local-projects-1440x1000.png", fullPage: true });
  await project.getByLabel(`${idea} 的更多操作`).click();
  await project.getByRole("button", { name: "删除" }).click();
  await page.getByLabel("输入项目名称确认删除").fill(idea);
  await page.getByRole("button", { name: "确认删除" }).click();
  await expect(project).toBeHidden();
});

test("does not enable paid provider probes without model and key", async ({
  page,
}) => {
  await page.goto("/ideascope/#/settings/provider");
  await expect(page.getByRole("button", { name: /普通完成/ })).toBeDisabled();
  await expect(page.getByRole("button", { name: /结构化输出/ })).toBeDisabled();
});

test("exposes separated data and diagnostic settings", async ({ page }) => {
  await page.goto("/ideascope/#/settings/data");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: "reports/visual/settings-data-1440x1000.png", fullPage: true });
  const clear = page.getByRole("button", { name: "删除所有本地研究项目" });
  await expect(clear).toBeDisabled();
  await page.getByLabel("导入备份").setInputFiles("examples/workspace.demo.json");
  await expect(page.getByText(/已导入 1 个项目/)).toBeVisible();
  await page.getByRole("button", { name: "清理缓存" }).click();
  await expect(page.getByText(/研究项目未删除/)).toBeVisible();
  await page.getByLabel(/输入“清除全部数据”确认/).fill("不清除");
  await expect(clear).toBeDisabled();
  await page.getByRole("link", { name: "关于" }).click();
  await expect(page.getByText(/诊断信息不会包含密钥或研究正文/)).toBeVisible();
  await page.screenshot({ path: "reports/visual/settings-about-1440x1000.png", fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: "reports/visual/data-safety-1440x1000.png", fullPage: true });
});

test("runs a lightweight OpenAlex health check without creating research history", async ({
  page,
}) => {
  let requestedUrl = "";
  let requestCount = 0;
  await page.route("https://api.openalex.org/works**", async (route) => {
    requestedUrl = route.request().url();
    requestCount += 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: {
        "Access-Control-Allow-Origin": "*",
        "X-RateLimit-Remaining": "42",
        "X-RateLimit-Reset": "300",
      },
      body: JSON.stringify({
        meta: { count: 1 }, results: [{ id: "https://openalex.org/W1", title: "Health check" }],
      }),
    });
  });
  await page.goto("/ideascope/#/settings/literature");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: "reports/visual/settings-literature-1440x1000.png", fullPage: true });
  await page.getByRole("button", { name: "测试连接" }).click();
  await expect(page.getByText("可用", { exact: true }).last()).toBeVisible();
  expect(requestCount).toBe(1);
  expect(new URL(requestedUrl).searchParams.get("per_page")).toBe("1");
  expect(new URL(requestedUrl).searchParams.has("search")).toBe(false);
  await page.goto("/ideascope/#/");
  await expect(page.getByText(/还没有探索记录/)).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: "reports/visual/literature-search-1440x1000.png",
    fullPage: true,
  });
});

test("selects a semantic node and mirrors it in details and list views", async ({
  page,
}) => {
  await page.goto("/ideascope/#/workspace/demo");
  await page.getByText("何时检索，如何自检", { exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "何时检索，如何自检" }).last(),
  ).toBeVisible();
  await page.getByRole("tab", { name: "结构" }).click();
  await expect(
    page.getByRole("button", { name: /何时检索，如何自检/ }),
  ).toBeVisible();
});

test("previews, applies and undoes one local graph proposal", async ({ page }) => {
  await page.goto("/ideascope/#/workspace/demo");
  await page.getByLabel("演示状态").selectOption("proposal");
  await expect(page.getByText(/当前图尚未修改/)).toBeVisible();
  await page.getByRole("button", { name: "应用提案" }).click();
  await expect(page.getByRole("heading", { name: "“证据充分”如何界定？" }).last()).toBeVisible();
  await page.getByRole("button", { name: "撤销上次应用" }).click();
  await expect(page.getByRole("heading", { name: "“找到”不等于“足够”" }).last()).toBeVisible();
});

test("switches branches and restores each branch without a model call", async ({ page }) => {
  await page.goto("/ideascope/#/workspace/demo");
  await page.getByRole("button", { name: "按需检索的边界" }).click();
  await expect(page.getByRole("heading", { name: "按需检索的边界" })).toBeVisible();
  await page.getByRole("button", { name: "可靠性" }).click();
  await expect(page.getByRole("heading", { name: "可靠性与证据" })).toBeVisible();
});

test("exposes truthful demo states, sources, directions, and export boundary", async ({
  page,
}) => {
  await page.goto("/ideascope/#/workspace/demo");
  await page.getByLabel("演示状态").selectOption("firstVisit");
  await expect(
    page.getByRole("heading", { name: "从一个研究问题开始" }),
  ).toBeVisible();
  await page.getByLabel("演示状态").selectOption("empty");
  await expect(
    page.getByRole("heading", { name: "这一视图暂时没有内容" }),
  ).toBeVisible();
  await page.getByLabel("演示状态").selectOption("ready");
  await page.getByRole("button", { name: "文献与证据" }).click();
  await expect(
    page.getByRole("heading", { name: "每个判断，都能找到来处。" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /候选方向/ }).click();
  await expect(
    page.getByRole("heading", { name: "值得继续，而不是仓促定论。" }),
  ).toBeVisible();
  await expect(page.getByText("已有工作", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "保存方向" }).click();
  await expect(page.getByText("当前状态：saved")).toBeVisible();
  await page.getByRole("button", { name: "排除方向" }).click();
  await expect(page.getByText("当前状态：excluded")).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: "reports/visual/directions-1440x900.png", fullPage: true });
  await page.getByRole("button", { name: "导出演示" }).click();
  const dialog = page.getByRole("dialog", { name: "带走当前的理解" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("凭证 0 项");
  await expect(page.getByLabel("图导出范围")).toHaveValue("complete");
  await page.getByLabel("图导出范围").selectOption("visible");
  await expect(page.getByLabel("图导出范围")).toHaveValue("visible");
  await page.screenshot({ path: "reports/visual/export-dialog-1440x900.png", fullPage: true });
  await expect(page.getByRole("button", { name: "关闭弹窗" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.getByRole("button", { name: "了解" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "关闭弹窗" })).toBeFocused();
  const jsonDownload = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "下载 JSON" }).click();
  expect((await jsonDownload).suggestedFilename()).toBe("ideascope-workspace.json");
  const svgDownload = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "下载 SVG" }).click();
  expect((await svgDownload).suggestedFilename()).toBe("ideascope-map.svg");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("button", { name: "导出演示" })).toBeFocused();
});

test("keeps the mobile workspace readable without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/ideascope/#/workspace/demo");
  await expect(page.getByText("怎样让研究型问答更可靠？")).toBeVisible();
  await page.getByRole("button", { name: "资料", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "每个判断，都能找到来处。" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "详情", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "“找到”不等于“足够”" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "地图", exact: true }).click();
  await expect(page.getByText("怎样让研究型问答更可靠？")).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBe(dimensions.width);
  await page.screenshot({
    path: "reports/visual/workspace-390x844.png",
    fullPage: true,
  });
});

for (const viewport of [
  { width: 1600, height: 1000 },
  { width: 1440, height: 900 },
  { width: 1280, height: 800 },
]) {
  test(`workspace shell has no horizontal overflow at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/ideascope/#/workspace/demo");
    await expect(
      page.getByRole("heading", { name: "可靠性与证据" }),
    ).toBeVisible();
    await expect(page.getByText("怎样让研究型问答更可靠？")).toBeVisible();
    const dimensions = await page.evaluate(() => ({
      width: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBe(dimensions.width);
    await page.screenshot({
      path: `reports/visual/workspace-${viewport.width}x${viewport.height}.png`,
      fullPage: true,
    });
  });
}
