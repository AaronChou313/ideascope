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

test('selects a semantic node and mirrors it in details and list views', async ({ page }) => {
  await page.goto('/ideascope/#/workspace/demo');
  await page.getByText('何时检索，如何自检', { exact: true }).click();
  await expect(page.getByRole('heading', { name: '何时检索，如何自检' }).last()).toBeVisible();
  await page.getByRole('tab', { name: '结构' }).click();
  await expect(page.getByRole('button', { name: /何时检索，如何自检/ })).toBeVisible();
});

for (const viewport of [{ width: 1600, height: 1000 }, { width: 1440, height: 900 }, { width: 1280, height: 800 }]) {
  test(`workspace shell has no horizontal overflow at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/ideascope/#/workspace/demo');
    await expect(page.getByRole('heading', { name: '可靠性与证据' })).toBeVisible();
    await expect(page.getByText('怎样让研究型问答更可靠？')).toBeVisible();
    const dimensions = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
    expect(dimensions.scrollWidth).toBe(dimensions.width);
    await page.screenshot({ path: `reports/visual/workspace-${viewport.width}x${viewport.height}.png`, fullPage: true });
  });
}
