import { expect, test } from '@playwright/test';

test('loads from a Pages-style subpath and keeps navigation in the hash', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/ideascope/#/');
  await expect(page.getByRole('heading', { name: /让一个想法/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: '浏览器连接探针' })).toBeVisible();
  expect(page.url()).toContain('/ideascope/#/');
  expect(errors).toEqual([]);
});

test('does not enable paid provider probes without model and key', async ({ page }) => {
  await page.goto('/ideascope/#/');
  await expect(page.getByRole('button', { name: /普通完成/ })).toBeDisabled();
  await expect(page.getByRole('button', { name: /结构化输出/ })).toBeDisabled();
});
