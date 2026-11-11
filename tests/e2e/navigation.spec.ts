import { instant } from '@next/playwright';
import { expect, test } from '@playwright/test';
import { closeLocationSearch, locationSearch } from './location-picker';

test('city picker is interactive in the prerendered shell', async ({
  page,
  baseURL,
}) => {
  await instant(
    page,
    async () => {
      await page.goto('/weather/1131200');
      const search = await locationSearch(page);
      await expect(search).toBeVisible();
      await search.fill('faro');
      await expect(
        page.getByRole('link', { name: 'Faro', exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole('link', { name: 'Lisboa', exact: true }),
      ).toHaveCount(0);
      await expect(
        page.getByText('Loading the forecast from IPMA…'),
      ).toBeVisible();
      await closeLocationSearch(page);
    },
    { baseURL },
  );
  await expect(page.getByRole('heading', { name: 'Porto,' })).toBeVisible();
});

test('keeps the city search while navigating with forecast content paused', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Lisboa,' })).toBeVisible();
  const search = await locationSearch(page);
  await search.fill('por');
  await instant(page, async () => {
    await page.getByRole('link', { name: 'Porto', exact: true }).click();
    await page.waitForURL('**/weather/1131200');
    await expect(page.getByRole('dialog', { name: 'Navigation' })).toBeHidden();
    await locationSearch(page);
    await expect(search).toHaveValue('por');
    await expect(
      page.getByRole('link', { name: 'Porto', exact: true }),
    ).toHaveAttribute('aria-current', 'page');
    await search.fill('far');
    await expect(
      page.getByRole('link', { name: 'Faro', exact: true }),
    ).toBeVisible();
    await closeLocationSearch(page);
  });
  await expect(page.getByRole('heading', { name: 'Porto,' })).toBeVisible();
  await locationSearch(page);
  await expect(search).toHaveValue('far');
  await closeLocationSearch(page);
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Lisboa,' })).toBeVisible();
  await expect(
    page
      .getByRole('region', { name: 'Weather forecast' })
      .getByText('22°C', { exact: true }),
  ).toBeVisible();
  await locationSearch(page);
  await expect(search).toHaveValue('far');
});

for (const intent of ['hover', 'focus'] as const) {
  test(`${intent} prefetches the city forecast before instant navigation`, async ({
    page,
  }) => {
    test.skip(
      process.env.E2E_PRODUCTION !== '1',
      'Next.js prefetching runs in production.',
    );
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Lisboa,' })).toBeVisible();
    const search = await locationSearch(page);
    await search.fill('far');
    const link = page.getByRole('link', { name: 'Faro', exact: true });
    const forecastPrefetch = page.waitForResponse(
      async (response) =>
        new URL(response.url()).pathname === '/weather/1080500' &&
        response.request().headers().rsc === '1' &&
        (await response.text()).includes('1080500:2026-11-11'),
    );
    if (intent === 'hover') await link.hover();
    else await link.focus();
    await forecastPrefetch;
    // Receiving the forecast while still on Lisbon proves it was prefetched.
    await expect(page.getByRole('heading', { name: 'Lisboa,' })).toBeVisible();
    await instant(page, async () => {
      await link.click();
      await page.waitForURL('**/weather/1080500');
      await expect(page.getByRole('heading', { name: 'Faro,' })).toBeVisible();
      await expect(
        page
          .getByRole('region', { name: 'Weather forecast' })
          .getByText('22°C', { exact: true }),
      ).toBeVisible();
      await locationSearch(page);
      await expect(search).toHaveValue('far');
    });
  });
}
