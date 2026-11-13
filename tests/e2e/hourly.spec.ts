import { expect, test } from '@playwright/test';

test('streams hourly HTML, changes window and shares the temperature unit', async ({
  page,
  browser,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/weather/1110600');
  const hourly = page.getByRole('region', {
    name: 'Hourly forecast',
    exact: true,
  });
  const table = hourly.getByRole('table', { name: 'Hourly forecasts' });
  await expect(table).toBeVisible();
  await expect(table.getByRole('row')).toHaveCount(11);
  await expect(
    table.getByRole('cell', { name: '0°', exact: true }),
  ).toBeVisible();
  await expect(
    table.getByRole('cell', { name: '0%', exact: true }),
  ).toBeVisible();
  await page.getByRole('radio', { name: '°F', exact: true }).click();
  await expect(
    table.getByRole('columnheader', { name: 'Temp °F' }),
  ).toBeVisible();
  await expect(
    table.getByRole('cell', { name: '32°', exact: true }),
  ).toBeVisible();
  await hourly.getByRole('radio', { name: 'Today', exact: true }).click();
  await expect(
    hourly.getByRole('radio', { name: 'Today', exact: true }),
  ).toBeChecked();
  await hourly
    .getByRole('radio', { name: 'Next 10 hours', exact: true })
    .click();
  await expect(table.getByRole('row')).toHaveCount(11);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);

  const context = await browser.newContext({ javaScriptEnabled: false });
  const noJs = await context.newPage();
  await noJs.goto('/weather/1110600');
  await expect(
    noJs.getByRole('table', { name: 'Hourly forecasts', includeHidden: true }),
  ).toBeAttached();
  await context.close();
});

test('hourly refresh errors retain the last data while daily forecasts stay usable', async ({
  page,
}) => {
  await page.goto('/weather/1110600');
  const table = page.getByRole('table', { name: 'Hourly forecasts' });
  await expect(table).toBeVisible();
  await page.waitForLoadState('networkidle');
  await page.route('**/api/hourly-forecasts/*', (route) =>
    route.fulfill({ status: 503, json: { error: 'Unavailable' } }),
  );
  await page
    .getByRole('button', { name: 'Refresh hourly', exact: true })
    .click();
  await expect(
    page.getByText(
      'We couldn’t update the hourly forecast. Your last forecast is still here.',
    ),
  ).toBeVisible();
  await expect(table.getByRole('row')).toHaveCount(11);
  await expect(
    page
      .getByRole('region', { name: 'Weather forecast', exact: true })
      .getByText('22°C', { exact: true }),
  ).toBeVisible();
});

test('hourly backend failure and empty coverage leave daily weather available', async ({
  page,
  request,
}) => {
  await page.goto('/weather/1080500');
  await expect(
    page.getByRole('heading', {
      name: 'Hourly forecast is temporarily unavailable.',
    }),
  ).toBeVisible();
  await expect(
    page
      .getByRole('region', { name: 'Weather forecast', exact: true })
      .getByText('22°C', { exact: true }),
  ).toBeVisible();
  expect((await request.get('/api/hourly-forecasts/1080500')).status()).toBe(
    503,
  );
  expect((await request.get('/api/hourly-forecasts/nope')).status()).toBe(400);
  expect((await request.get('/api/hourly-forecasts/123')).status()).toBe(404);
  await page.goto('/weather/1060500');
  await expect(
    page.getByRole('heading', {
      name: 'No hourly forecast published for this window.',
    }),
  ).toBeVisible();
});

// A failed initial collection must recover without reloading the daily section.
test('retries an initially unavailable hourly feed', async ({
  page,
  request,
}) => {
  const response = await request.get('/api/hourly-forecasts/1110600');
  const rows = await response.json();
  await page.goto('/weather/1080500');
  await expect(
    page.getByRole('heading', {
      name: 'Hourly forecast is temporarily unavailable.',
    }),
  ).toBeVisible();
  await page.waitForLoadState('networkidle');
  await page.route('**/api/hourly-forecasts/1080500', (route) =>
    route.fulfill({
      status: 200,
      json: rows.map((row: { id: string; locationId: number }) => ({
        ...row,
        id: row.id.replace('1110600', '1080500'),
        locationId: 1080500,
      })),
    }),
  );
  await page
    .getByRole('button', { name: 'Refresh hourly', exact: true })
    .click();
  await expect(
    page.getByRole('table', { name: 'Hourly forecasts' }),
  ).toBeVisible();
  await expect(
    page
      .getByRole('region', { name: 'Weather forecast', exact: true })
      .getByText('22°C', { exact: true }),
  ).toBeVisible();
});
