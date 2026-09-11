import { expect, test, type Page } from "@playwright/test";

const idea = "我想研究四足机器人足端传感器对于定位导航的作用";
const plan = {
  title: "四足机器人足端传感与定位",
  understanding: "研究足端接触感知对定位与状态估计的作用",
  queries: [
    "quadruped robot foot contact state estimation",
    "legged robot foot sensing localization",
  ],
  profilePatch: {
    patchVersion: 1,
    targetProfileId: "SESSION",
    operations: [
      { op: "addDomainSignal", value: "Robotics" },
      { op: "addSubfield", value: "Legged Robot State Estimation" },
    ],
  },
};
const nodes = [
  {
    tempId: "route-estimation", parentRef: "ROOT",
    kind: "approach",
    title: "接触辅助状态估计",
    summary: "利用稳定接触构造运动约束",
    evidenceIds: ["evidence:openalex:W1"],
  },
  {
    tempId: "contact-state", parentRef: "route-estimation",
    kind: "concept",
    title: "接触状态识别",
    summary: "判断足端接触是否可信",
    evidenceIds: ["evidence:openalex:W1"],
  },
  {
    tempId: "drift", parentRef: "route-estimation",
    kind: "finding",
    title: "接触约束抑制漂移",
    summary: "可靠接触可以约束累积误差",
    evidenceIds: ["evidence:openalex:W1"],
  },
  {
    tempId: "slip", parentRef: "route-estimation",
    kind: "gap",
    title: "打滑导致约束失效",
    summary: "打滑会让错误约束污染估计",
    evidenceIds: [],
  },
  {
    tempId: "fusion", parentRef: "route-estimation",
    kind: "direction",
    title: "足端触觉与惯性融合",
    summary: "联合多模态感知提升鲁棒性",
    evidenceIds: [],
  },
];
const synthesis = {
  answer: "当前文献可从接触识别、状态估计和打滑鲁棒性三个层面组织。",
  nodes,
  crossLinks: [{ sourceRef: "drift", targetRef: "fusion", relation: "related_to" }],
  nextQuestions: ["接触信息如何进入状态估计？"],
  summary: ["足端接触是状态估计的重要约束"],
};
async function configure(page: Page) {
  await page.goto("/ideascope/#/settings/provider");
  await page.getByLabel("Base URL").fill("https://provider.test/v1");
  await page.getByLabel("Model ID").fill("mock-model");
  await page.getByLabel("API Key").fill("browser-test-key");
  await page.getByRole("button", { name: "保存配置" }).click();
}
async function mockResearch(page: Page) {
  let calls = 0;
  await page.route(
    "https://provider.test/v1/chat/completions",
    async (route) => {
      const value =
        calls++ % 2 === 0
          ? plan
          : calls === 2
            ? synthesis
            : {
                ...synthesis,
                answer: "围绕接触辅助状态估计完成了局部深入。",
                nodes: [
                  {
                    tempId: "factor-graph", parentRef: null,
                    kind: "approach",
                    title: "因子图接触约束",
                    summary: "把足端接触加入因子图",
                    evidenceIds: ["evidence:openalex:W1"],
                  },
                ],
                crossLinks: [],
                summary: ["接触约束可进入因子图"],
              };
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          choices: [{ message: { content: JSON.stringify(value) } }],
        }),
      });
    },
  );
  await page.route("https://api.openalex.org/works**", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 180));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        meta: { count: 1, next_cursor: null },
        results: [
          {
            id: "https://openalex.org/W1",
            doi: "https://doi.org/10.1000/test",
            title: "Contact-Aided State Estimation for Legged Robots",
            publication_year: 2024,
            authorships: [{ author: { display_name: "A. Researcher" } }],
            primary_location: {
              source: { display_name: "Robotics Journal" },
              landing_page_url: "https://example.test/paper",
            },
            best_oa_location: null,
            abstract_inverted_index: {
              Contact: [0],
              aided: [1],
              state: [2],
              estimation: [3],
            },
          },
        ],
      }),
    });
  });
}

test("root is the direct empty research workspace at desktop widths", async ({
  page,
}) => {
  for (const [width, name] of [
    [1440, "01-empty-workspace"],
    [1920, "01-empty-workspace-1920"],
    [1100, "01-empty-workspace-1100"],
  ] as const) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/ideascope/#/");
    await expect(
      page.getByRole("heading", { name: "从一个模糊的研究想法开始" }),
    ).toBeVisible();
    await page.screenshot({
      path: `reports/visual/v0.6.6/${name}.png`,
      fullPage: true,
    });
  }
});

test("provider guard preserves draft and protocol switching preserves common fields", async ({
  page,
}) => {
  await page.goto("/ideascope/#/");
  await page.getByRole("button", { name: /新建探索/ }).click();
  await page.getByLabel("探索对话输入").fill(idea);
  await page.getByRole("button", { name: "发送" }).click();
  await expect(
    page.getByRole("dialog", { name: "需要配置模型" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "前往模型设置" }).click();
  await page.getByLabel("Base URL").fill("https://provider.test/v1");
  await page.getByLabel("Model ID").fill("model-x");
  await page.getByLabel("API Key").fill("session-only-key");
  await page.getByLabel("Provider Format").selectOption("openai-responses");
  await page.getByLabel("Provider Format").selectOption("openai-chat");
  await expect(page.getByLabel("Base URL")).toHaveValue(
    "https://provider.test/v1",
  );
  await expect(page.getByLabel("Model ID")).toHaveValue("model-x");
  await page.screenshot({
    path: "reports/visual/v0.6.6/06-settings-provider.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "保存配置" }).click();
  await page.reload();
  await expect(page.getByLabel("API Key")).toHaveAttribute(
    "placeholder",
    "已在当前会话保存",
  );
  await page.getByRole("link", { name: "返回研究工作区" }).click();
  await expect(page.getByLabel("探索对话输入")).toHaveValue(idea);
});

test("initial exploration creates evidence graph and node continuation updates it incrementally", async ({
  page,
}) => {
  await mockResearch(page);
  await configure(page);
  await page.goto("/ideascope/#/");
  await page.getByRole("button", { name: /新建探索/ }).click();
  await page.getByLabel("探索对话输入").fill(idea);
  await page.getByRole("button", { name: "发送" }).click();
  await expect(page.getByRole("status")).toHaveAttribute("open", "");
  await expect(page.getByText(/正在检索|正在整理/).first()).toBeVisible();
  await page.screenshot({
    path: "reports/visual/v0.6.6/02-initial-exploration-running.png",
    fullPage: true,
  });
  await expect(
    page.getByText("接触辅助状态估计", { exact: true }).first(),
  ).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/6 个节点 · 1 条 Evidence/)).toBeVisible();
  await expect(page.getByRole("status")).not.toHaveAttribute("open", "");
  await page.getByRole("status").locator("summary").click();
  await expect(page.getByText("正在理解问题")).toBeVisible();
  await page.screenshot({
    path: "reports/visual/v0.6.6/01-initial-hierarchy.png",
    fullPage: true,
  });
  await page.getByText("接触辅助状态估计", { exact: true }).first().click();
  await expect(
    page.getByRole("heading", { name: "接触辅助状态估计" }),
  ).toBeVisible();
  await expect(
    page.getByText("Contact-Aided State Estimation for Legged Robots"),
  ).toBeVisible();
  await page.screenshot({
    path: "reports/visual/v0.6.6/02-node-selected.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "基于此节点继续探索" }).click();
  await expect(page.getByText("基于：接触辅助状态估计")).toBeVisible();
  await page.screenshot({ path: "reports/visual/v0.6.6/03-context-chip.png", fullPage: true });
  await page.getByText("接触状态识别", { exact: true }).first().click();
  await page.getByRole("button", { name: "探索对话" }).click();
  await expect(page.getByText("基于：接触辅助状态估计")).toBeVisible();
  await page.getByLabel("探索对话输入").fill("足端接触约束通常怎样进入 EKF 或优化框架？");
  await page.getByRole("button", { name: "发送" }).click();
  await expect(page.getByText(/7 个节点 · 1 条 Evidence/)).toBeVisible({ timeout: 15000 });
  await page.getByRole("button", { name: "Fit View" }).click();
  await expect(
    page.getByText("因子图接触约束", { exact: true }).first(),
  ).toBeVisible({ timeout: 15000 });
  await page.screenshot({
    path: "reports/visual/v0.6.6/04-focused-expansion.png",
    fullPage: true,
  });
  await page.reload();
  await expect(page.getByText(/7 个节点 · 1 条 Evidence/)).toBeVisible();
  await page.getByRole("button", { name: "Fit View" }).click();
  await expect(
    page.getByText("因子图接触约束", { exact: true }).first(),
  ).toBeVisible();
  await page.screenshot({
    path: "reports/visual/v0.6.6/06-restored-workspace.png",
    fullPage: true,
  });
});

test("settings return to the same session and invalid settings return falls back to root", async ({
  page,
}) => {
  await configure(page);
  await page.goto("/ideascope/#/");
  await page.getByRole("button", { name: /新建探索/ }).click();
  await expect(page).toHaveURL(/#\/workspace\//);
  const url = page.url();
  await page.getByLabel("设置").click();
  await page.getByRole("link", { name: "返回研究工作区" }).click();
  await expect(page).toHaveURL(url);
  await page.goto("/ideascope/#/settings/about");
  await page.getByRole("link", { name: "返回首页" }).click();
  await expect(page).toHaveURL(/#\/$/);
});

test("session delete requires exact confirmation", async ({ page }) => {
  await page.goto("/ideascope/#/");
  await page.getByRole("button", { name: /新建探索/ }).click();
  await page.getByLabel(/未命名探索 的更多操作/).click();
  await page.getByRole("button", { name: "删除" }).click();
  await expect(page.getByRole("button", { name: "确认删除" })).toBeDisabled();
  await page.getByLabel("输入会话名称确认删除").fill("未命名探索");
  await page.getByRole("button", { name: "确认删除" }).click();
  await expect(page.getByText("还没有探索会话")).toBeVisible();
});

test("session and data menus expose the supported export and archive actions", async ({ page }) => {
  await page.goto("/ideascope/#/");
  await page.getByRole("button", { name: /新建探索/ }).click();
  await page.getByLabel(/未命名探索 的更多操作/).click();
  await expect(page.getByRole("button", { name: "导出完整档案" })).toBeVisible();
  await expect(page.getByRole("button", { name: "导出 Markdown" })).toBeVisible();
  await expect(page.getByRole("button", { name: "导出研究图" })).toBeVisible();
  await page.screenshot({ path: "reports/visual/v0.6.11/session-export-menu.png", fullPage: true });
  await page.goto("/ideascope/#/settings/data");
  await expect(page.getByRole("heading", { name: "批量导出探索" })).toBeVisible();
  await expect(page.getByRole("button", { name: "导出所选" })).toBeDisabled();
  await expect(page.getByText("导入档案 / Bundle")).toBeVisible();
  await page.screenshot({ path: "reports/visual/v0.6.11/data-archive.png", fullPage: true });
});

test("multiple research sessions remain independently addressable after refresh", async ({ page }) => {
  await page.goto("/ideascope/#/");
  await page.getByRole("button", { name: /新建探索/ }).click();
  await expect(page).toHaveURL(/#\/workspace\//);
  const firstUrl = page.url();
  page.once("dialog", (dialog) => dialog.accept("机器人定位"));
  await page.getByLabel(/未命名探索 的更多操作/).click();
  await page.getByRole("button", { name: "重命名" }).click();
  await expect(page.getByText("机器人定位", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /新建探索/ }).click();
  await page.waitForURL((url) => url.toString() !== firstUrl);
  const secondUrl = page.url();
  expect(secondUrl).not.toBe(firstUrl);
  await page.reload();
  await page.getByText("机器人定位", { exact: true }).click();
  await expect(page).toHaveURL(firstUrl);
  await page.getByRole("button", { name: /未命名探索/ }).click();
  await expect(page).toHaveURL(secondUrl);
});

test("literature source settings persist enabled state and expose honest source status", async ({ page }) => {
  await page.route("https://api.openalex.org/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ meta: { count: 0 }, results: [] }) }),
  );
  await page.goto("/ideascope/#/settings/literature");
  await expect(page.getByRole("heading", { name: "文献来源" })).toBeVisible();
  await expect(page.getByText("Google Scholar", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "打开外部搜索" })).toHaveAttribute("href", /scholar\.google\.com/);
  const toggle = page.getByRole("checkbox", { name: "Crossref 启用" });
  await expect(toggle).toBeChecked();
  await toggle.uncheck();
  await expect(page.getByText("Crossref 已停用。")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Crossref", { exact: true })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "Crossref 启用" })).not.toBeChecked();
  await page.getByRole("button", { name: "让 AI 帮我配置来源" }).click();
  await expect(page.getByRole("region", { name: "AI 来源配置助手" })).toBeVisible();
  await expect(page.getByText("不会凭记忆创建 API 地址")).toBeVisible();
  await page.getByRole("button", { name: "导入 Source / Pack" }).click();
  await page.getByLabel("配置 JSON").fill(JSON.stringify({ documentType: "ideascope.pack", packVersion: 1, id: "test-pack", name: "Test Pack", description: "", sources: [], profiles: [] }));
  await page.getByRole("button", { name: "校验并预览" }).click();
  await expect(page.getByText("Test Pack", { exact: true })).toBeVisible();
  await expect(page.getByText("配置已通过结构校验")).toBeVisible();
  const customSource = {
    documentType: "ideascope.literature-source", manifestVersion: 1, id: "external-library", name: "External Library", description: "Manual search",
    adapter: { kind: "external-search", urlTemplate: "https://library.example.test/search?q={query}" }, auth: { kind: "none" },
    capabilities: { search: "unsupported", abstract: "unknown", citations: "unknown", references: "unknown", venueFilter: "unknown", yearFilter: "unknown", authorFilter: "unknown", fullText: "unsupported", directLookup: "unsupported" },
  };
  await page.getByLabel("配置 JSON").fill(JSON.stringify(customSource));
  await page.getByRole("button", { name: "校验并预览" }).click();
  await page.getByRole("button", { name: "确认导入" }).click();
  await expect(page.getByText("External Library", { exact: true })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "External Library 启用" })).not.toBeChecked();
  await page.screenshot({ path: "reports/visual/v0.6.7/source-settings.png", fullPage: true });
});

test("research profile stays Auto by default and saves an explicit template", async ({ page }) => {
  await page.goto("/ideascope/#/settings/profile");
  await expect(page.getByRole("heading", { name: "我的研究领域" })).toBeVisible();
  await expect(page.getByText(/自动适配/).first()).toBeVisible();
  await page.getByLabel("领域模式").selectOption("builtin.robotics");
  await expect(page.getByLabel("重点会议与期刊")).toHaveValue(/ICRA/);
  await page.getByRole("button", { name: "保存研究领域" }).click();
  await expect(page.getByText(/研究领域已保存/)).toBeVisible();
  await page.reload();
  await expect(page.getByText(/Robotics · 已保存/)).toBeVisible();
  await page.screenshot({ path: "reports/visual/v0.6.8/research-profile-settings.png", fullPage: true });
});
