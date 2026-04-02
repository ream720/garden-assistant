import { expect, type Page } from '@playwright/test';

const clickWithRetry = async (
  action: () => Promise<void>,
  attempts = 3
): Promise<boolean> => {
  for (let i = 0; i < attempts; i += 1) {
    try {
      await action();
      return true;
    } catch {
      if (i < attempts - 1) {
        // Give transient re-renders time to settle before retrying.
        await new Promise((resolve) => setTimeout(resolve, 150));
      }
    }
  }

  return false;
};

export async function dismissOnboardingIfVisible(page: Page): Promise<void> {
  const onboardingDialogByTestId = page.getByTestId(
    'e2e-dashboard-onboarding-dialog'
  );
  const onboardingDialogByRole = page.getByRole('dialog', {
    name: 'Welcome to Grospace',
  });

  let dialogVisible = false;
  const maxWaitMs = 10000;
  const startedAt = Date.now();

  while (Date.now() - startedAt < maxWaitMs) {
    const byTestIdVisible = await onboardingDialogByTestId
      .isVisible()
      .catch(() => false);
    const byRoleVisible = await onboardingDialogByRole
      .isVisible()
      .catch(() => false);

    if (byTestIdVisible || byRoleVisible) {
      dialogVisible = true;
      break;
    }

    await page.waitForTimeout(250);
  }

  if (!dialogVisible) {
    return;
  }

  const completeButton = page
    .getByTestId('e2e-dashboard-onboarding-complete')
    .or(page.getByRole('button', { name: 'Complete setup' }));
  const closeButton = page
    .getByTestId('e2e-dashboard-onboarding-close')
    .or(page.getByRole('button', { name: 'Close For Now' }));

  const closeButtonVisible = await closeButton.first().isVisible().catch(() => false);
  const completeButtonVisible = await completeButton.first().isVisible().catch(() => false);

  if (closeButtonVisible) {
    await clickWithRetry(() =>
      closeButton.first().click({ force: true, timeout: 2000 })
    );
  } else if (completeButtonVisible) {
    await clickWithRetry(() =>
      completeButton.first().click({ force: true, timeout: 2000 })
    );
  }

  await expect(onboardingDialogByRole.or(onboardingDialogByTestId)).not.toBeVisible({
    timeout: 10000,
  });
}
