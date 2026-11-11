import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

async function holdMutation(page: Page, method: string, fail = false) {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let received = false;
  await page.route('**/api/saved-places/1110600', async (route) => {
    if (route.request().method() !== method) return route.continue();
    received = true;
    await gate;
    if (fail)
      return route.fulfill({ status: 503, json: { error: 'Unavailable' } });
    return route.continue();
  });
  return { release, received: () => received };
}

test('saves and removes optimistically before acknowledgement, then survives reload', async ({
  page,
}) => {
  await page.goto('/');
  const save = page.getByRole('button', { name: 'Save this place' });
  await expect(save).toBeEnabled();
  const saving = await holdMutation(page, 'POST');
  try {
    await save.click();
    await expect.poll(saving.received).toBe(true);
    await expect(
      page.getByRole('link', { name: 'Saved place: Lisboa' }),
    ).toBeVisible();
    await expect(page.getByText('Saving…', { exact: true })).toBeVisible();
  } finally {
    saving.release();
  }
  await expect(
    page.getByRole('button', { name: 'Remove saved place' }),
  ).toBeEnabled();
  await page.reload();
  await expect(
    page.getByRole('link', { name: 'Saved place: Lisboa' }),
  ).toBeVisible();
  await page.unroute('**/api/saved-places/1110600');
  const removing = await holdMutation(page, 'DELETE');
  try {
    await page.getByRole('button', { name: 'Remove saved place' }).click();
    await expect.poll(removing.received).toBe(true);
    await expect(
      page.getByRole('link', { name: 'Saved place: Lisboa' }),
    ).toHaveCount(0);
    await expect(page.getByText('Saving…', { exact: true })).toBeVisible();
  } finally {
    removing.release();
  }
  await expect(
    page.getByRole('button', { name: 'Save this place' }),
  ).toBeEnabled();
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Save this place' }),
  ).toBeEnabled();
  await expect(
    page.getByRole('link', { name: 'Saved place: Lisboa' }),
  ).toHaveCount(0);
});

test('rolls back failed optimistic inserts and deletes', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: 'Save this place' }),
  ).toBeEnabled();
  const saving = await holdMutation(page, 'POST', true);
  try {
    await page.getByRole('button', { name: 'Save this place' }).click();
    await expect.poll(saving.received).toBe(true);
    await expect(
      page.getByRole('link', { name: 'Saved place: Lisboa' }),
    ).toBeVisible();
  } finally {
    saving.release();
  }
  await expect(
    page.getByText('Couldn’t save your places. The change was rolled back.'),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Saved place: Lisboa' }),
  ).toHaveCount(0);
  await page.unroute('**/api/saved-places/1110600');
  await page.getByRole('button', { name: 'Save this place' }).click();
  await expect(
    page.getByRole('button', { name: 'Remove saved place' }),
  ).toBeEnabled();
  const removing = await holdMutation(page, 'DELETE', true);
  try {
    await page.getByRole('button', { name: 'Remove saved place' }).click();
    await expect.poll(removing.received).toBe(true);
    await expect(
      page.getByRole('link', { name: 'Saved place: Lisboa' }),
    ).toHaveCount(0);
  } finally {
    removing.release();
  }
  await expect(
    page.getByText('Couldn’t save your places. The change was rolled back.'),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Saved place: Lisboa' }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('link', { name: 'Saved place: Lisboa' }),
  ).toBeVisible();
});
