import { expect, test } from '@playwright/test';

const runSeedSmoke = process.env.PW_RUN_SEED_SMOKE === 'true';

test.describe('Seed Account Smoke', () => {
  test.skip(
    !runSeedSmoke,
    'Set PW_RUN_SEED_SMOKE=true to run seeded-account smoke checks.'
  );

  test('seeded account shows populated dashboard and core pages', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(
      page.getByRole('heading', { name: 'Quick Actions' })
    ).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('No upcoming tasks yet')).not.toBeVisible();
    await expect(page.getByText('Activity timeline is empty')).not.toBeVisible();

    await page.goto('/spaces');
    await expect(page).toHaveURL(/\/spaces/);
    await expect(
      page.getByRole('heading', { name: 'Grow Spaces' })
    ).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('No spaces yet')).not.toBeVisible();

    await page.goto('/plants');
    await expect(page).toHaveURL(/\/plants/);
    await expect(page.getByRole('heading', { name: 'My Plants' })).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText('No plants added yet.')).not.toBeVisible();

    await page.goto('/events?type=notes');
    await expect(page).toHaveURL(/\/events\?.*type=notes/);
    await expect(page.getByRole('button', { name: 'Add Note' })).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText('No notes found')).not.toBeVisible();

    await page.goto('/events?type=tasks');
    await expect(page).toHaveURL(/\/events\?.*type=tasks/);
    await expect(page.getByRole('button', { name: 'Add Task' })).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText('No tasks match your filters.')).not.toBeVisible();
  });
});
