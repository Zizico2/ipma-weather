import { expect, test } from '@playwright/test';
import { locationSearch } from './location-picker';

test('RSC includes populated weather in the streamed server HTML', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/');
  // React uses a small script to reveal late Suspense content. With JS disabled
  // it remains hidden, but the populated HTML must already be in the response.
  await expect(page.locator('h1').filter({ hasText: 'Lisboa' })).toBeAttached();
  await expect(
    page.locator('h2').filter({ hasText: 'Clear sky' }),
  ).toBeAttached();
  await expect(page.getByText('22°C', { exact: true })).toBeAttached();
  await context.close();
});

test('hydrates, changes units and days, searches and navigates cities', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  const forecast = page.getByRole('region', { name: 'Weather forecast' });
  await expect(page.getByRole('heading', { name: 'Lisboa,' })).toBeVisible();
  await page.getByRole('radio', { name: '°F', exact: true }).click();
  await expect(forecast.getByText('72°F', { exact: true })).toBeVisible();
  await page
    .getByRole('radio', { name: 'Thursday 12 Nov, Light showers/rain' })
    .click();
  await expect(forecast.getByText('73°F', { exact: true })).toBeVisible();
  await (await locationSearch(page)).fill('porto');
  await page.getByRole('link', { name: 'Porto', exact: true }).click();
  await expect(page).toHaveURL('/weather/1131200');
  await expect(page.getByRole('heading', { name: 'Porto,' })).toBeVisible();
  await expect(forecast.getByText('17°C', { exact: true })).toBeVisible();
  await locationSearch(page);
  await expect(
    page.getByRole('link', { name: 'Porto', exact: true }),
  ).toHaveAttribute('aria-current', 'page');
  expect(errors).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test('refresh failure keeps the last forecast visible', async ({ page }) => {
  await page.goto('/');
  const forecast = page.getByRole('region', { name: 'Weather forecast' });
  await expect(forecast.getByText('22°C', { exact: true })).toBeVisible();
  // Finish the initial hydrated query before intercepting the user's refresh.
  await page.waitForLoadState('networkidle');
  await page.route('**/api/forecasts/*', (route) =>
    route.fulfill({ status: 503, json: { error: 'Unavailable' } }),
  );
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(
    page.getByText(
      'We couldn’t update the forecast. Your last forecast is still here.',
    ),
  ).toBeVisible();
  await expect(forecast.getByText('22°C', { exact: true })).toBeVisible();
});

test('renders missing measurements and an empty published forecast honestly', async ({
  page,
}) => {
  await page.goto('/weather/1090700');
  const forecast = page.getByRole('region', { name: 'Weather forecast' });
  await expect(page.getByRole('heading', { name: 'Guarda,' })).toBeVisible();
  await expect(forecast.getByText('—C', { exact: true })).toBeVisible();
  await expect(forecast.getByText('-3° low', { exact: true })).toBeVisible();
  await page.goto('/weather/1060500');
  await expect(
    page.getByRole('heading', { name: 'No forecast published yet.' }),
  ).toBeVisible();
});

test('handles backend failure and unknown locations', async ({
  page,
  request,
}) => {
  await page.goto('/weather/1030300');
  await expect(
    page.getByRole('heading', { name: 'The forecast is taking a rain check.' }),
  ).toBeVisible();
  expect((await request.get('/api/forecasts/1030300')).status()).toBe(503);
  expect((await request.get('/api/forecasts/not-a-number')).status()).toBe(400);
  expect((await request.get('/api/forecasts/123')).status()).toBe(404);
  await page.goto('/weather/123');
  await expect(
    page.getByRole('heading', { name: 'That place isn’t in our forecast.' }),
  ).toBeVisible();
});
