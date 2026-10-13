import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../../app/App';
import { WORKFLOW_STORAGE_KEY } from '../../../data/RecommendationWorkflowProvider';

describe('Optimization page', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.pushState({}, '', '/optimization');
  });

  it('shows KPIs, savings charts and the open recommendations inbox', async () => {
    render(<App />);
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Optimization' }),
    ).toBeInTheDocument();
    for (const label of ['Open savings · per month', 'Quick wins · per month']) {
      expect(await screen.findByText(label, { selector: 'p' })).toBeInTheDocument();
    }
    expect(screen.getAllByTestId('SimpleBarChart')).toHaveLength(2);
    const table = screen.getByRole('table', { name: 'Recommendations' });
    expect(within(table).getByRole('columnheader', { name: /Owner/ })).toHaveClass(
      'cc-cell--start',
    );
    expect(within(table).getByRole('columnheader', { name: /Savings\/mo/ })).toHaveClass(
      'cc-cell--end',
    );
    expect(within(table).getAllByText('Open').length).toBeGreaterThan(5);
  });

  it('accepts selected recommendations with a batch action and remembers the change', async () => {
    const user = userEvent.setup();
    render(<App />);
    const table = await screen.findByRole('table', { name: 'Recommendations' });
    const openTab = screen.getByRole('tab', { name: /^Open \(/ });
    const openCount = Number(/\((\d+)\)/.exec(openTab.textContent ?? '')?.[1]);
    const boxes = within(table).getAllByRole('checkbox');
    await user.click(boxes[1]!);
    await user.click(boxes[2]!);
    expect(screen.getByText(/2 items selected/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Accept' }));
    expect(await screen.findByText('2 recommendations accepted')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: `Open (${openCount - 2})` })).toBeInTheDocument();
    expect(screen.getByText('Changes are saved in this browser only.')).toBeInTheDocument();
    expect(
      Object.keys(JSON.parse(window.localStorage.getItem(WORKFLOW_STORAGE_KEY)!)),
    ).toHaveLength(2);

    await user.click(screen.getByRole('button', { name: 'Discard changes' }));
    expect(screen.getByRole('tab', { name: `Open (${openCount})` })).toBeInTheDocument();
    expect(window.localStorage.getItem(WORKFLOW_STORAGE_KEY)).toBeNull();
  });

  it('assigns an owner through the modal', async () => {
    const user = userEvent.setup();
    render(<App />);
    const table = await screen.findByRole('table', { name: 'Recommendations' });
    await user.click(within(table).getAllByRole('checkbox')[1]!);
    await user.click(screen.getByRole('button', { name: 'Assign' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('button', { name: 'Assign' })).toBeDisabled();
    await user.click(within(dialog).getByRole('combobox', { name: /Owner/ }));
    await user.click(screen.getByRole('option', { name: 'Cloud FinOps team' }));
    await user.click(within(dialog).getByRole('button', { name: 'Assign' }));
    expect(await screen.findByText('1 recommendation assigned')).toBeInTheDocument();
  });

  it('shows the savings ledger', async () => {
    window.history.pushState({}, '', '/optimization?view=ledger');
    render(<App />);
    expect(await screen.findByText('Realization rate', { selector: 'p' })).toBeInTheDocument();
    expect(await screen.findByTestId('GroupedBarChart')).toBeInTheDocument();
    const table = await screen.findByRole('table', { name: 'Implemented recommendations' });
    expect(within(table).getAllByRole('row').length).toBeGreaterThan(1);
  });
});
