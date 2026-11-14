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
  const strip = hourly.getByRole('region', {
    name: 'Hourly forecasts',
    exact: true,
  });
  await expect(strip).toBeVisible();
  const hero = page.getByRole('region', { name: 'Daily weather outlook' });
  expect(
    await hero.evaluate((element) => {
      const hourly = document.querySelector('[aria-label="Hourly forecast"]');
      return Boolean(
        hourly &&
          element.compareDocumentPosition(hourly) &
            Node.DOCUMENT_POSITION_FOLLOWING,
      );
    }),
  ).toBe(true);
  await expect(strip.locator('button[aria-pressed]')).toHaveCount(10);
  await expect(strip.getByText('0°', { exact: true })).toBeVisible();
  await expect(strip.getByText('0%', { exact: true })).toBeVisible();
  await page.getByRole('radio', { name: '°F', exact: true }).click();
  await expect(strip.getByRole('button', { name: /32°F$/ })).toBeVisible();
  await expect(strip.getByText('32°', { exact: true })).toBeVisible();
  await hourly.getByRole('radio', { name: 'Today', exact: true }).click();
  await expect(
    hourly.getByRole('radio', { name: 'Today', exact: true }),
  ).toBeChecked();
  await hourly
    .getByRole('radio', { name: 'Next 10 hours', exact: true })
    .click();
  await expect(strip.locator('button[aria-pressed]')).toHaveCount(10);
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
    noJs.getByRole('region', {
      name: 'Hourly forecasts',
      exact: true,
      includeHidden: true,
    }),
  ).toBeAttached();
  await context.close();
});

test('hourly refresh errors retain the last data while daily forecasts stay usable', async ({
  page,
}) => {
  await page.goto('/weather/1110600');
  const strip = page.getByRole('region', {
    name: 'Hourly forecasts',
    exact: true,
  });
  await expect(strip).toBeVisible();
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
  await expect(strip.locator('button[aria-pressed]')).toHaveCount(10);
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
    page.getByRole('region', { name: 'Hourly forecasts', exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole('region', { name: 'Weather forecast', exact: true })
      .getByText('22°C', { exact: true }),
  ).toBeVisible();
});

test('compact hourly strip pans, selects an hour and exposes details on narrow screens', async ({
  page,
  isMobile,
}) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('/weather/1110600');
  const hourly = page.getByRole('region', {
    name: 'Hourly forecast',
    exact: true,
  });
  const strip = hourly.getByRole('region', {
    name: 'Hourly forecasts',
    exact: true,
  });
  const scroller = strip.getByRole('group', {
    name: 'Hourly forecasts',
    exact: true,
  });
  await expect(strip.locator('button[aria-pressed]')).toHaveCount(10);
  await expect(strip.locator('button[aria-pressed]').first()).toBeEnabled();
  await page.waitForLoadState('networkidle');
  await scroller.scrollIntoViewIfNeeded();
  expect(
    await scroller.evaluate(
      (element) => element.scrollWidth > element.clientWidth,
    ),
  ).toBe(true);
  if (isMobile) {
    const box = await scroller.boundingBox();
    if (!box) throw new Error('Hourly scroller has no bounds');
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.synthesizeScrollGesture', {
      x: box.x + box.width - 35,
      y: box.y + box.height / 2,
      xDistance: -150,
      yDistance: 0,
      gestureSourceType: 'touch',
      speed: 400,
    });
    await cdp.detach();
  } else {
    await scroller.focus();
    for (let step = 0; step < 6; step++)
      await page.keyboard.press('ArrowRight');
  }
  await expect
    .poll(() => scroller.evaluate((element) => element.scrollLeft))
    .toBeGreaterThan(0);
  const last = strip.locator('button[aria-pressed]').last();
  await last.click();
  await expect(last).toHaveAttribute('aria-pressed', 'true');
  await expect(
    hourly.getByLabel('Selected hour details').getByText('65% humidity'),
  ).toBeVisible();
  await hourly.getByRole('button', { name: 'Source & details' }).click();
  await expect(hourly.getByText(/Times in Europe\/Lisbon/)).toBeVisible();
  for (const width of [320, 375, 412]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});

test('rain periods span three hours and follow selection without being interactive', async ({
  page,
  request,
}) => {
  const response = await request.get('/api/hourly-forecasts/1110600');
  const rows = await response.json();
  await page.goto('/weather/1110600');
  await page.route('**/api/hourly-forecasts/1110600', (route) =>
    route.fulfill({
      status: 200,
      json: rows.map((row: object, index: number) => ({
        ...row,
        rainProbability: index === 2 ? 40 : null,
      })),
    }),
  );
  await page
    .getByRole('button', { name: 'Refresh hourly', exact: true })
    .click();
  const strip = page.getByRole('region', {
    name: 'Hourly forecasts',
    exact: true,
  });
  const period = strip.getByLabel(/^Rain probability/);
  await expect(period).toHaveCount(1);
  await expect(period.getByText('40%')).toBeVisible();
  const hours = strip.locator('button[aria-pressed]');
  const hourBox = await hours.first().boundingBox();
  const rainBox = await period.boundingBox();
  expect(Math.abs(rainBox!.width - hourBox!.width * 3)).toBeLessThan(1);
  await expect(period).toHaveCSS('cursor', 'default');
  expect(await period.getAttribute('tabindex')).toBeNull();
  for (const index of [0, 1, 2]) {
    await hours.nth(index).click();
    const green = await hours
      .nth(index)
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    await expect(period).toHaveCSS('background-color', green);
  }
  const green = await period.evaluate(
    (el) => getComputedStyle(el).backgroundColor,
  );
  await hours.nth(3).click();
  await expect(period).not.toHaveCSS('background-color', green);
});
