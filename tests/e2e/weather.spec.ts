import { expect, type Page, test } from '@playwright/test';
import { locationSearch } from './location-picker';

async function latestCity(page: Page) {
  return (await page.context().cookies()).find(
    (cookie) => cookie.name === 'latest-location',
  )?.value;
}

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
    .getByRole('region', { name: 'Daily forecasts' })
    .getByText('Thursday 12 Nov', { exact: true })
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

test('opens the latest city from / and /weather, otherwise Lisbon', async ({
  page,
  request,
}) => {
  for (const path of ['/', '/weather']) {
    const anonymous = await request.get(path, { maxRedirects: 0 });
    expect(anonymous.status()).toBe(307);
    expect(anonymous.headers().location).toMatch(/\/weather\/1110600$/);
    expect(anonymous.headers()['cache-control']).toContain('no-store');

    const remembered = await request.get(path, {
      maxRedirects: 0,
      headers: { cookie: 'latest-location=1131200' },
    });
    expect(remembered.status()).toBe(307);
    expect(remembered.headers().location).toMatch(/\/weather\/1131200$/);

    const invalid = await request.get(path, {
      maxRedirects: 0,
      headers: { cookie: 'latest-location=nope' },
    });
    expect(invalid.headers().location).toMatch(/\/weather\/1110600$/);
  }

  await page.goto('/weather');
  await expect(page).toHaveURL(/\/weather\/1110600$/);
  await expect(page.getByRole('heading', { name: 'Lisboa,' })).toBeVisible();
  await expect.poll(() => latestCity(page)).toBe('1110600');

  await (await locationSearch(page)).fill('porto');
  await page.getByRole('link', { name: 'Porto', exact: true }).click();
  await expect(page).toHaveURL('/weather/1131200');
  await expect(page.getByRole('heading', { name: 'Porto,' })).toBeVisible();
  await expect.poll(() => latestCity(page)).toBe('1131200');

  await page.getByRole('banner').getByRole('link', { name: 'tempo.' }).click();
  await expect(page).toHaveURL(/\/weather\/1131200$/);
  await expect(page.getByRole('heading', { name: 'Porto,' })).toBeVisible();

  const search = await locationSearch(page);
  await search.fill('faro');
  const faro = page.getByRole('link', { name: 'Faro', exact: true });
  await expect(faro).toBeVisible();
  await faro.hover();
  await page.waitForLoadState('networkidle');
  expect(await latestCity(page)).toBe('1131200');

  await page.goto('/');
  await expect(page).toHaveURL(/\/weather\/1131200$/);
  await expect(page.getByRole('heading', { name: 'Porto,' })).toBeVisible();
  await expect.poll(() => latestCity(page)).toBe('1131200');

  await page.goto('/weather');
  await expect(page).toHaveURL(/\/weather\/1131200$/);
  await expect(page.getByRole('heading', { name: 'Porto,' })).toBeVisible();
});

test('home link resolves the current city cookie on every click', async ({
  page,
  baseURL,
}) => {
  await page.goto('/weather/1110600');
  await expect(page.getByRole('heading', { name: 'Lisboa,' })).toBeVisible();
  await expect.poll(() => latestCity(page)).toBe('1110600');

  const homeRequests: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/')
      homeRequests.push(request.url());
  });

  const home = page.getByRole('banner').getByRole('link', { name: 'tempo.' });
  await home.hover();
  await home.focus();
  await page.waitForLoadState('networkidle');
  expect(homeRequests).toEqual([]);

  // Change the cookie after the link is visible, then repeat to catch a cached
  // redirect destination from the first home click.
  for (const [id, city] of [
    ['1131200', 'Porto'],
    ['1080500', 'Faro'],
  ]) {
    await page
      .context()
      .addCookies([{ name: 'latest-location', value: id, url: baseURL }]);
    await home.click();
    await expect(page).toHaveURL(`/weather/${id}`);
    await expect(page.getByRole('heading', { name: `${city},` })).toBeVisible();
    await expect.poll(() => latestCity(page)).toBe(id);
  }
});

test('redirects /weather without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  await context.addCookies([
    {
      name: 'latest-location',
      value: '1080500',
      url: baseURL,
    },
  ]);
  const page = await context.newPage();
  await page.goto('/weather');
  await expect(page).toHaveURL(/\/weather\/1080500$/);
  await expect(page.locator('h1').filter({ hasText: 'Faro' })).toBeAttached();
  await context.close();
});

test('handles backend failure and unknown locations', async ({
  page,
  request,
  baseURL,
}) => {
  await page.goto('/weather/1030300');
  await expect(
    page.getByRole('heading', { name: 'The forecast is taking a rain check.' }),
  ).toBeVisible();
  expect((await request.get('/api/forecasts/1030300')).status()).toBe(503);
  expect((await request.get('/api/forecasts/not-a-number')).status()).toBe(400);
  expect((await request.get('/api/forecasts/123')).status()).toBe(404);
  await page.goto('/weather/123');
  const back = page.getByRole('link', { name: 'Back to your forecast →' });
  await expect(
    page.getByRole('heading', { name: 'That place isn’t in our forecast.' }),
  ).toBeVisible();
  await expect(back).toHaveAttribute('href', '/');
  await back.click();
  await expect(page).toHaveURL(/\/weather\/1110600$/);
  await expect(page.getByRole('heading', { name: 'Lisboa,' })).toBeVisible();

  await page.context().addCookies([
    {
      name: 'latest-location',
      value: '1131200',
      url: baseURL,
    },
  ]);
  await page.goto('/weather/123');
  await page.getByRole('link', { name: 'Back to your forecast →' }).click();
  await expect(page).toHaveURL(/\/weather\/1131200$/);
  await expect(page.getByRole('heading', { name: 'Porto,' })).toBeVisible();
});

test('daily forecasts provide a single radio choice with native keyboard navigation', async ({
  page,
}) => {
  await page.goto('/');
  const group = page.getByRole('radiogroup', {
    name: 'Forecast day',
    exact: true,
  });
  const days = group.getByRole('radio');
  await expect(days).toHaveCount(5);
  await expect(group.getByRole('checkbox')).toHaveCount(0);
  await expect(days.first()).toBeChecked();
  await days.first().focus();
  await page.keyboard.press('ArrowRight');
  await expect(days.nth(1)).toBeFocused();
  await expect(days.nth(1)).toBeChecked();
  await expect(group.locator('input:checked')).toHaveCount(1);
  await expect(
    page
      .getByRole('region', { name: 'Daily weather outlook' })
      .getByText('23°C', { exact: true }),
  ).toBeVisible();
  await page.keyboard.press('Space');
  await expect(days.nth(1)).toBeChecked();
  await page.keyboard.press('ArrowLeft');
  await expect(days.first()).toBeChecked();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await expect(days.first()).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(days.first()).not.toBeFocused();
  await expect(days.nth(1)).not.toBeFocused();
  await group.getByText('Friday 13 Nov', { exact: true }).click();
  await expect(days.nth(2)).toBeChecked();
  await group.getByText('Friday 13 Nov', { exact: true }).click();
  await expect(days.nth(2)).toBeChecked();
  await expect(group.locator('input:checked')).toHaveCount(1);
});
