import { expect, type Page } from '@playwright/test';

export async function locationSearch(page: Page) {
  const search = page.getByRole('searchbox', { name: 'Search locations' });
  // Wait for the responsive shell to hydrate rather than finding the desktop
  // sidebar in the brief server-rendered frame on a phone.
  if ((page.viewportSize()?.width ?? 1280) < 768) {
    const toggle = page.getByRole('button', {
      name: 'Open navigation',
      exact: true,
    });
    const drawer = page.getByRole('dialog', { name: 'Navigation' });
    if (!(await drawer.isVisible())) {
      await expect(toggle).toBeVisible();
      await toggle.click();
    }
  }
  await expect(search).toBeVisible();
  return search;
}

export async function closeLocationSearch(page: Page) {
  const close = page.getByRole('button', {
    name: 'Close navigation',
    exact: true,
  });
  if (await close.isVisible()) await close.click();
  await expect(page.getByRole('dialog', { name: 'Navigation' })).toBeHidden();
}
