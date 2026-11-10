import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../../app/App';

const renderAt = (url: string) => {
  window.history.pushState({}, '', url);
  return render(<App />);
};

describe('Cost & Usage', () => {
  beforeEach(() => window.localStorage.clear());

  it('shows the Cost Explorer grouped by LOB with chart and table', async () => {
    renderAt('/cost-usage');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Cost & Usage' }),
    ).toBeInTheDocument();
    const table = await screen.findByRole('table', { name: 'Cost by line of business' });
    expect(within(table).getAllByRole('row')).toHaveLength(6); // header + 5 LOBs
    expect(screen.getByTestId('StackedBarChart')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Drill-down path' })).toHaveTextContent('All');
  });

  it('drills LOB → application → environment and back via the breadcrumb', async () => {
    const user = userEvent.setup();
    renderAt('/cost-usage');
    await user.click(await screen.findByRole('link', { name: /^Payments: drill down/ }));
    const apps = await screen.findByRole('table', { name: 'Cost by application' });
    expect(within(apps).getAllByRole('row')).toHaveLength(5); // 4 Payments apps
    await user.click(within(apps).getByRole('link', { name: /^Fraud Detection: drill down/ }));
    const envs = await screen.findByRole('table', { name: 'Cost by environment' });
    expect(within(envs).getAllByRole('row')).toHaveLength(4);
    const crumbs = screen.getByRole('navigation', { name: 'Drill-down path' });
    expect(crumbs).toHaveTextContent(/All.*Payments.*Fraud Detection/);
    await user.click(within(crumbs).getByRole('link', { name: 'All' }));
    expect(
      await screen.findByRole('table', { name: 'Cost by line of business' }),
    ).toBeInTheDocument();
  });

  it('paginates and shows account IDs left-aligned when grouped by account', async () => {
    renderAt('/cost-usage?groupBy=account');
    const table = await screen.findByRole('table', { name: 'Cost by account' });
    expect(within(table).getAllByRole('row')).toHaveLength(11); // header + 10 per page
    const idHeader = within(table).getByRole('columnheader', { name: /Account ID/ });
    expect(idHeader).toHaveClass('cc-cell--start');
    expect(within(table).getByRole('columnheader', { name: /Selected period/ })).toHaveClass(
      'cc-cell--end',
    );
  });

  it('filters the table with search', async () => {
    const user = userEvent.setup();
    renderAt('/cost-usage?groupBy=application');
    const table = await screen.findByRole('table', { name: 'Cost by application' });
    await user.type(
      screen.getByRole('searchbox', { name: /Search Cost by application/ }),
      'banking',
    );
    expect(within(table).getAllByRole('row')).toHaveLength(3); // Mobile + Online Banking
  });

  it('shows budgets for every application with a status', async () => {
    renderAt('/cost-usage?view=budgets');
    const table = await screen.findByRole('table', { name: 'Application budgets' });
    expect(within(table).getAllByRole('row')).toHaveLength(11); // header + 10 per page
    expect(within(table).getAllByText(/On track|At risk|Over budget/)).toHaveLength(10);
    expect(screen.getByText(/of 20 items/)).toBeInTheDocument();
    expect(screen.getByTestId('GroupedBarChart')).toBeInTheDocument();
  });
});
