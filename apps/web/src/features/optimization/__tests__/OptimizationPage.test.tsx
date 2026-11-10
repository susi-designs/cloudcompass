import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../../app/App';
import { WORKFLOW_STORAGE_KEY } from '../../../data/RecommendationWorkflowProvider';

describe('Optimization page', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.pushState({}, '', '/optimization');
  });

  it('shows only the recommendations table', async () => {
    render(<App />);
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Optimization' }),
    ).toBeInTheDocument();
    const table = await screen.findByRole('table', { name: 'Recommendations' });
    expect(screen.queryByRole('region', { name: 'Scope filters' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Open savings · per month', { selector: 'p' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('SimpleBarChart')).not.toBeInTheDocument();
    expect(screen.queryByTestId('GroupedBarChart')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('table', { name: 'Implemented recommendations' }),
    ).not.toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: /Owner/ })).toHaveClass(
      'cc-cell--start',
    );
    expect(within(table).getByRole('columnheader', { name: /Savings\/mo/ })).toHaveClass(
      'cc-cell--end',
    );
    expect(within(table).getAllByRole('row')).toHaveLength(11); // header + 10 per page
  });

  it('accepts selected recommendations with a batch action and remembers the change', async () => {
    const user = userEvent.setup();
    render(<App />);
    const table = await screen.findByRole('table', { name: 'Recommendations' });
    const boxes = within(table).getAllByRole('checkbox');
    await user.click(boxes[1]!);
    await user.click(boxes[2]!);
    expect(screen.getByText(/2 items selected/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Accept' }));
    expect(await screen.findByText('2 recommendations accepted')).toBeInTheDocument();
    expect(screen.getByText('Changes are saved in this browser only.')).toBeInTheDocument();
    expect(
      Object.keys(JSON.parse(window.localStorage.getItem(WORKFLOW_STORAGE_KEY)!)),
    ).toHaveLength(2);

    await user.click(screen.getByRole('button', { name: 'Discard changes' }));
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
});
