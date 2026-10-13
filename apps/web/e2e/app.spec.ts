import { expect, test } from '@playwright/test';

test.describe('Overview', () => {
  test('shows KPIs, both charts and top movers', async ({ page }) => {
    await page.goto('/overview');
    await expect(page.getByRole('heading', { level: 1, name: 'Overview' })).toBeVisible();
    for (const label of [
      'Month-to-date spend',
      'Forecast (month end)',
      'Budget variance',
      'Realized savings',
      'Open anomalies',
    ]) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }
    await expect(page.getByRole('heading', { name: 'Daily spend by environment' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Spend by line of business' })).toBeVisible();
    await expect(page.locator('.cc-chart-card svg').first()).toBeVisible();
    await expect(page.getByRole('table', { name: 'Top movers' }).getByRole('row')).toHaveCount(11);
  });

  test('chart can be viewed as a table', async ({ page }) => {
    await page.goto('/overview');
    const card = page.locator('.cc-chart-card', { hasText: 'Spend by line of business' });
    await card.getByRole('tab', { name: 'View as table' }).click();
    await expect(card.getByRole('table')).toContainText('Payments');
  });

  test('filtering by LOB scopes the dashboard', async ({ page }) => {
    await page.goto('/overview');
    await page.getByRole('combobox', { name: /Line of business/ }).click();
    await page.getByRole('option', { name: 'Payments' }).click();
    await page.keyboard.press('Escape');
    const movers = page.getByRole('table', { name: 'Top movers' });
    await expect(movers.getByRole('row')).toHaveCount(5); // header + 4 Payments apps
    await expect(movers).not.toContainText('Retail Banking');
  });

  test('global search scopes to an account', async ({ page }) => {
    await page.goto('/overview');
    await page.getByRole('button', { name: 'Search applications and accounts' }).click();
    await page.getByRole('combobox', { name: 'Search' }).fill('fraud-detection-prod');
    await page.getByRole('option', { name: /fraud-detection-prod/ }).click();
    const movers = page.getByRole('table', { name: 'Top movers' });
    await expect(movers.getByRole('row')).toHaveCount(2);
    await expect(movers).toContainText('Fraud Detection');
  });
});

test.describe('My CloudCompass', () => {
  test('first visit: pick an application and land on its adaptive page', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'My CloudCompass' })).toBeVisible();
    await page.getByRole('combobox', { name: 'Application' }).click();
    await page.getByRole('option', { name: /Trading Platform/ }).click();
    const band = page.locator('.cc-attention');
    await expect(band).toContainText('Trading Platform needs attention: 2 critical anomalies');
    await expect(page.locator('[data-section="anomalies"]')).toHaveAttribute(
      'data-state',
      'attention',
    );
    await expect(page.locator('.cc-chart-card svg').first()).toBeVisible();
    // The default is remembered: a fresh visit to / opens the same application.
    await page.goto('/');
    await expect(page.getByText('Default application')).toBeVisible();
    await expect(band).toContainText('Trading Platform');
  });

  test('a signal opens its anomaly scoped to the application, and handled items are listed', async ({
    page,
  }) => {
    await page.goto('/?app=app-trading-platform');
    await page.getByRole('link', { name: 'Critical anomaly on Amazon EBS' }).click();
    await expect(page).toHaveURL(/\/anomalies\?anomaly=anom-/);
    const panel = page.getByRole('dialog', { name: /cost spike$/ });
    await expect(panel).toBeVisible();
    await panel.getByRole('button', { name: /^Resolve/ }).click();
    await page
      .locator('.cds--modal.is-visible')
      .getByRole('button', { name: /^Resolve/ })
      .click();
    await page.goto('/?app=app-trading-platform');
    const handled = page.locator('.cc-attention__resolved');
    await expect(handled).toContainText('Critical anomaly on Amazon EBS');
    await expect(page.locator('.cc-attention')).toContainText('1 critical anomaly');
  });

  test('switching applications keeps the date range and environment', async ({ page }) => {
    await page.goto('/?app=app-trading-platform');
    await page.getByRole('combobox', { name: /Environment/ }).click();
    await page.getByRole('option', { name: 'PROD' }).click();
    await page.keyboard.press('Escape');
    await page.getByRole('combobox', { name: 'Application' }).click();
    await page.getByRole('combobox', { name: 'Application' }).fill('Data Platform');
    await page.getByRole('option', { name: /Data Platform/ }).click();
    await expect(page).toHaveURL(/app=app-data-platform/);
    await page.getByRole('combobox', { name: /Environment/ }).click();
    await expect(page.getByRole('option', { name: 'PROD' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(page.getByRole('option', { name: 'TEST' })).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });
});

test('dark theme persists across reloads', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Theme' }).click();
  await page.getByText('Dark', { exact: true }).click();
  await expect(page.locator('.cc-app')).toHaveClass(/cds--g100/);
  await page.reload();
  await expect(page.locator('.cc-app')).toHaveClass(/cds--g100/);
});

test.describe('Cost & Usage', () => {
  test('Cost Explorer drills from LOB to account and back', async ({ page }) => {
    await page.goto('/cost-usage');
    await expect(page.getByRole('heading', { level: 1, name: 'Cost & Usage' })).toBeVisible();
    await expect(page.locator('.cc-chart-card svg').first()).toBeVisible();
    await page.getByRole('link', { name: /^Payments: drill down/ }).click();
    await page.getByRole('link', { name: /^Fraud Detection: drill down/ }).click();
    await page.getByRole('link', { name: /^PROD: drill down/ }).click();
    const accounts = page.getByRole('table', { name: 'Cost by account' });
    await expect(accounts.getByRole('row')).toHaveCount(2);
    await expect(accounts).toContainText('cc-fraud-detection-prod');
    const crumbs = page.getByRole('navigation', { name: 'Drill-down path' });
    await expect(crumbs).toContainText('Fraud Detection');
    await crumbs.getByRole('link', { name: 'All' }).click();
    await expect(
      page.getByRole('table', { name: 'Cost by line of business' }).getByRole('row'),
    ).toHaveCount(6);
  });

  test('group by, granularity and metric are kept in the URL', async ({ page }) => {
    await page.goto('/cost-usage');
    await page.getByRole('combobox', { name: 'Group by' }).click();
    await page.getByRole('option', { name: 'Service', exact: true }).click();
    await page.getByRole('tab', { name: 'Monthly' }).click();
    await expect(page).toHaveURL(/groupBy=service/);
    await expect(page).toHaveURL(/granularity=month/);
    await page.reload();
    await expect(page.getByRole('table', { name: 'Cost by service' })).toBeVisible();
  });

  test('exports the table as CSV', async ({ page }) => {
    await page.goto('/cost-usage');
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download CSV' }).click();
    expect((await download).suggestedFilename()).toMatch(/^cloudcompass-cost-by-lob-.*\.csv$/);
  });

  test('Budgets tab lists every application with a status', async ({ page }) => {
    await page.goto('/cost-usage');
    await page.getByRole('tab', { name: 'Budgets' }).click();
    const table = page.getByRole('table', { name: 'Application budgets' });
    await expect(table.getByRole('row')).toHaveCount(21);
    await expect(page.getByRole('heading', { name: 'Budget vs. actual by month' })).toBeVisible();
  });
});

test.describe('Utilization', () => {
  test('renders heatmaps, resource table and commitment meters', async ({ page }) => {
    await page.goto('/utilization');
    await expect(page.getByRole('heading', { level: 1, name: 'Utilization' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /CPU by application over time/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'CPU by hour of week' })).toBeVisible();
    await expect(page.locator('.cc-chart-card svg').first()).toBeVisible();
    const table = page.getByRole('table', { name: 'Resources' });
    await expect(table.getByRole('row').nth(1)).toBeVisible();
    await expect(page.locator('.cc-commitment').first()).toBeVisible();
  });

  test('selecting one application shows its resources in the heatmap', async ({ page }) => {
    await page.goto('/utilization');
    await page.getByRole('combobox', { name: /Application/ }).click();
    await page.getByRole('option', { name: 'Payment Gateway' }).click();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('heading', { name: /CPU by resource over time/ })).toBeVisible();
    await page.getByRole('tab', { name: /^All resources/ }).click();
    const rows = page.getByRole('table', { name: 'Resources' }).getByRole('row');
    await expect(rows.nth(1)).toContainText('Payment Gateway');
  });
});

test.describe('AI Spend', () => {
  test('renders charts, feature costs, model comparison and GPU clusters', async ({ page }) => {
    await page.goto('/ai-spend');
    await expect(page.getByRole('heading', { level: 1, name: 'AI Spend' })).toBeVisible();
    await expect(page.locator('.cc-chart-card svg').first()).toBeVisible();
    await expect(
      page.getByRole('table', { name: 'Cost per feature' }).getByRole('row').nth(1),
    ).toBeVisible();
    const comparison = page.getByRole('table', { name: 'Projected cost by model' });
    await expect(comparison.getByRole('row')).toHaveCount(8);
    await expect(comparison).toContainText('Current');
    await expect(page.getByRole('table', { name: 'GPU clusters' }).getByRole('row')).toHaveCount(5);
  });

  test('filtering to Payments shows only Fraud Detection AI usage', async ({ page }) => {
    await page.goto('/ai-spend');
    await page.getByRole('combobox', { name: /Line of business/ }).click();
    await page.getByRole('option', { name: 'Payments' }).click();
    await page.keyboard.press('Escape');
    const gpu = page.getByRole('table', { name: 'GPU clusters' });
    await expect(gpu.getByRole('row')).toHaveCount(3);
    await expect(page.getByRole('table', { name: 'Cost per feature' })).not.toContainText(
      'Mobile Banking',
    );
  });
});

test.describe('Optimization', () => {
  test('snoozes a recommendation and the change survives a reload', async ({ page }) => {
    await page.goto('/optimization');
    await expect(page.getByRole('heading', { level: 1, name: 'Optimization' })).toBeVisible();
    await expect(page.locator('.cc-chart-card svg').first()).toBeVisible();
    const openTab = page.getByRole('tab', { name: /^Open \(/ });
    const openCount = Number(/\((\d+)\)/.exec((await openTab.textContent()) ?? '')?.[1]);
    const table = page.getByRole('table', { name: 'Recommendations' });
    await table.getByRole('row').nth(1).locator('label').first().click();
    await page.getByRole('button', { name: 'Snooze' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByText('60 days').click();
    await dialog.getByRole('button', { name: 'Snooze' }).click();
    await expect(page.getByText('1 recommendation snoozed')).toBeVisible();
    await page.reload();
    await expect(page.getByRole('tab', { name: `Open (${openCount - 1})` })).toBeVisible();
    await page.getByRole('tab', { name: /^Snoozed/ }).click();
    await expect(table).toContainText('Until Dec 8, 2026');
  });

  test('expands a row and opens the savings ledger', async ({ page }) => {
    await page.goto('/optimization');
    const table = page.getByRole('table', { name: 'Recommendations' });
    await table.getByRole('button', { name: 'Expand row' }).first().click();
    await expect(table.getByText('Resource ID')).toBeVisible();
    await page.getByRole('tab', { name: 'Savings ledger' }).click();
    await expect(page).toHaveURL(/view=ledger/);
    await expect(
      page.getByRole('heading', { name: 'Projected vs. realized savings by month' }),
    ).toBeVisible();
    await expect(
      page.getByRole('table', { name: 'Implemented recommendations' }).getByRole('row').nth(1),
    ).toBeVisible();
  });
});

test.describe('Anomalies', () => {
  test('renders KPIs, timeline, feed and the detail panel', async ({ page }) => {
    await page.goto('/anomalies');
    await expect(page.getByRole('heading', { level: 1, name: 'Anomalies' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Anomaly timeline' })).toBeVisible();
    await expect(page.locator('.cc-chart-card svg').first()).toBeVisible();
    const feed = page.getByRole('table', { name: 'Anomaly feed' });
    await expect(feed.getByRole('row').nth(1)).toBeVisible();
    await feed.getByRole('link').first().click();
    const panel = page.getByRole('dialog', { name: /cost spike$/ });
    await expect(panel.getByText('Likely cause:')).toBeVisible();
    await expect(panel.locator('.cc-chart-card svg').first()).toBeVisible();
    await expect(page).toHaveURL(/anomaly=anom-/);
    await panel.getByRole('button', { name: 'Close' }).click();
    await expect(panel).toBeHidden();
  });

  test('resolves an anomaly and the change survives a reload', async ({ page }) => {
    await page.goto('/anomalies');
    const triageTab = page.getByRole('tab', { name: /^Needs triage \(/ });
    const triage = Number(/\((\d+)\)/.exec((await triageTab.textContent()) ?? '')?.[1]);
    const feed = page.getByRole('table', { name: 'Anomaly feed' });
    await feed.getByRole('row').nth(1).locator('label').first().click();
    await page.getByRole('button', { name: 'Resolve' }).click();
    const dialog = page.locator('.cds--modal.is-visible');
    await dialog.getByLabel(/Resolution note/).fill('Scaled the cluster back down');
    await dialog.getByRole('button', { name: 'Resolve' }).click();
    await expect(page.getByText('1 anomaly resolved')).toBeVisible();
    await page.reload();
    await expect(page.getByRole('tab', { name: `Needs triage (${triage - 1})` })).toBeVisible();
    await page.getByRole('tab', { name: /^Resolved/ }).click();
    await expect(feed).toContainText('Oct 9, 2026');
  });
});
