import { expect, test } from '@playwright/test';

test('loads from a Pages-style subpath and keeps navigation in the hash', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/ideascope/#/');
  await expect(page.getByRole('heading', { name: /让一个想法/ })).toBeVisible();
  expect(page.url()).toContain('/ideascope/#/');
  expect(errors).toEqual([]);
});

test('does not enable paid provider probes without model and key', async ({ page }) => {
  await page.goto('/ideascope/#/settings');
  await expect(page.getByRole('button', { name: /普通完成/ })).toBeDisabled();
  await expect(page.getByRole('button', { name: /结构化输出/ })).toBeDisabled();
});

for (const viewport of [{ width: 1600, height: 1000 }, { width: 1440, height: 900 }, { width: 1280, height: 800 }]) {
  test(`workspace shell has no horizontal overflow at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/ideascope/#/workspace/demo');
    await expect(page.getByRole('heading', { name: '研究型问答的可靠性' })).toBeVisible();
    const dimensions = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
    expect(dimensions.scrollWidth).toBe(dimensions.width);
    await page.screenshot({ path: `reports/visual/workspace-${viewport.width}x${viewport.height}.png`, fullPage: true });
  });
}
