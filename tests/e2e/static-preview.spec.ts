import { expect, test } from "@playwright/test";

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

test("does not enable paid provider probes without model and key", async ({
  page,
}) => {
  await page.goto("/ideascope/#/settings");
  await expect(page.getByRole("button", { name: /普通完成/ })).toBeDisabled();
  await expect(page.getByRole("button", { name: /结构化输出/ })).toBeDisabled();
});

test("exposes redacted diagnostics and guarded local data cleanup", async ({ page }) => {
  await page.goto("/ideascope/#/settings");
  await expect(page.getByText(/纯前端应用无法安全保管长期密钥/)).toBeVisible();
  const clear = page.getByRole("button", { name: "清除全部本地数据" });
  await expect(clear).toBeDisabled();
  await page.getByLabel(/导入 IdeaScope JSON/).setInputFiles("examples/workspace.demo.json");
  await expect(page.getByText(/已导入为新项目/)).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出脱敏诊断" }).click();
  expect((await download).suggestedFilename()).toBe("ideascope-diagnostics.json");
  await page.getByLabel(/输入“清除全部数据”确认/).fill("不清除");
  await expect(clear).toBeDisabled();
  await expect(page.getByRole("heading", { name: "真实关键词检索" })).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: "reports/visual/data-safety-1440x1000.png", fullPage: true });
});

test("runs a bounded OpenAlex keyword query without invoking a model", async ({
  page,
}) => {
  let requestedUrl = "";
  let requestCount = 0;
  await page.route("**/works**", async (route) => {
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
        meta: { count: 1, next_cursor: null, cost_usd: 0.001 },
        results: [
          {
            id: `https://openalex.org/W${requestCount}`,
            doi: null,
            title: "Reliable Research Question Answering",
            publication_year: 2025,
            authorships: [{ author: { display_name: "Example Author" } }],
            primary_location: {
              source: { display_name: "Example Journal" },
              landing_page_url: "https://example.test/paper",
            },
            best_oa_location: null,
            abstract_inverted_index: null,
          },
        ],
      }),
    });
  });
  await page.goto("/ideascope/#/settings");
  await page.getByRole("button", { name: "预览四类检索配方" }).click();
  await expect(
    page.getByText("counterevidence", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "执行真实检索" }).click();
  await expect(
    page.getByText("Reliable Research Question Answering").first(),
  ).toBeVisible();
  await expect(page.getByText("本地文献库 1 条")).toBeVisible();
  await page.getByRole("button", { name: "执行真实检索" }).click();
  await expect(page.getByText("候选重复 · 需人工审阅")).toBeVisible();
  await page.getByRole("button", { name: "保留独立" }).click();
  await expect(page.getByText("候选重复 · 需人工审阅")).toBeHidden();
  await expect(page.getByText("本地文献库 2 条")).toBeVisible();
  expect(new URL(requestedUrl).searchParams.get("search")).toBe(
    "retrieval augmented generation reliability evidence",
  );
  expect(requestedUrl).not.toContain(
    encodeURIComponent("怎样让研究型问答更可靠？"),
  );
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
