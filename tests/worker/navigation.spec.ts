import { expect, test } from '@playwright/test';

test('Worker resumes the forecast and reuses visited cities without the network', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.clock.install();
  await page.goto('/weather/1010500');
  await expect(page.getByRole('heading', { name: 'Aveiro,' })).toBeVisible();
  await page.getByRole('link', { name: 'Beja', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Beja,' })).toBeVisible();
  await page.waitForLoadState('networkidle');
  await page.clock.fastForward(61_000);

  // A visited city must render from the router cache even if the Worker is
  // unreachable. This catches bugs hidden by fast responses from next start.
  await page.route('**/weather/**', (route) => route.abort());
  await page.route('**/api/**', (route) => route.abort());
  await page.getByRole('link', { name: 'Aveiro', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Aveiro,' })).toBeVisible();
  await expect(page.getByText('Loading the forecast from IPMA…')).toBeHidden();
  await page.getByRole('link', { name: 'Beja', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Beja,' })).toBeVisible();
  expect(errors).toEqual([]);
});
