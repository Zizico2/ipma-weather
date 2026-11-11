import { expect, test } from '@playwright/test';

for (const intent of ['hover', 'focus'] as const) {
  test(`Worker completes new city visits after ${intent}`, async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Lisboa,' })).toBeVisible();
    await page.waitForLoadState('networkidle');
    for (const city of [
      'Angra do Heroísmo',
      'Aveiro',
      'Braga',
      'Bragança',
      'Castelo Branco',
    ]) {
      const search = page.getByRole('searchbox', {
        name: 'Search locations',
      });
      await search.fill(city);
      const link = page.getByRole('link', { name: city, exact: true });
      if (intent === 'hover') await link.hover();
      else await link.focus();
      await page.waitForLoadState('networkidle');
      await link.click();
      await expect(
        page.getByRole('heading', { name: `${city},`, exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText('Loading the forecast from IPMA…'),
      ).toBeHidden();
    }
  });
}

test('overlapping navigations and runtime prefetches complete their forecast stage', async ({
  request,
}) => {
  await Promise.all(
    [3430100, 1010500, 1030300, 1040200, 1050200].map(async (id) => {
      // The router state captured from a real Next 16.4 city-picker navigation.
      // The bit fields and RSC headers are part of the pinned Next wire protocol.
      const tree = [
        '',
        {
          children: [
            'weather',
            {
              children: [
                ['locationId', String(id), 'd', null],
                { children: ['__PAGE__', {}, null, 'refetch', 16546] },
                null,
                null,
                16482,
              ],
            },
            null,
            null,
            16450,
          ],
        },
        null,
        null,
        16402,
      ];
      await Promise.all(
        [false, true].map(async (prefetch) => {
          const response = await request.get(`/weather/${id}`, {
            headers: {
              rsc: '1',
              'next-url': '/_not-found',
              ...(prefetch ? { 'next-router-prefetch': '2' } : {}),
              'next-router-state-tree': encodeURIComponent(
                JSON.stringify(tree),
              ),
            },
            timeout: 10_000,
          });
          expect(response.ok()).toBe(true);
          expect(await response.text()).toContain(`"locationId":${id}`);
        }),
      );
    }),
  );
});

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
