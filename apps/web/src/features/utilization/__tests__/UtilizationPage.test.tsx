import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../../app/App';

describe('Utilization page', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.pushState({}, '', '/utilization');
  });

  it('shows KPIs, heatmaps, distribution and commitments', async () => {
    render(<App />);
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Utilization' }),
    ).toBeInTheDocument();
    for (const label of [
      'Average CPU',
      'Average memory',
      'Idle resources',
      'Under-utilized',
      'Commitment coverage',
    ]) {
      expect(await screen.findByText(label, { selector: 'p' })).toBeInTheDocument();
    }
    expect(screen.getAllByTestId('HeatmapChart')).toHaveLength(2);
    expect(screen.getByTestId('SimpleBarChart')).toBeInTheDocument();
    expect(screen.getAllByTestId('MeterChart').length).toBeGreaterThanOrEqual(2);
  });

  it('filters the resource table between idle, under-utilized and all', async () => {
    const user = userEvent.setup();
    render(<App />);
    const table = await screen.findByRole('table', { name: 'Resources' });
    const switcher = screen.getByRole('tablist', { name: 'Resource filter' });
    await user.click(within(switcher).getByRole('tab', { name: /^Idle \(/ }));
    const idleRows = within(await screen.findByRole('table', { name: 'Resources' })).getAllByRole(
      'row',
    );
    expect(idleRows.length).toBeGreaterThan(1);
    for (const row of idleRows.slice(1)) expect(row).toHaveTextContent('Idle');
    expect(table).toBeDefined();
  });

  it('aligns percentages and amounts right, IDs and text left', async () => {
    render(<App />);
    const table = await screen.findByRole('table', { name: 'Resources' });
    const header = (name: RegExp) => within(table).getByRole('columnheader', { name });
    expect(header(/Account ID/)).toHaveClass('cc-cell--start');
    expect(header(/Avg CPU/)).toHaveClass('cc-cell--end');
    expect(header(/Monthly cost/)).toHaveClass('cc-cell--end');
  });
});
