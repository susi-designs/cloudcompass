import { render, screen, within } from '@testing-library/react';
import { App } from '../../../app/App';

describe('Utilization page', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.pushState({}, '', '/utilization');
  });

  it('shows only the resource table, without filters, KPIs or charts', async () => {
    render(<App />);
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Utilization' }),
    ).toBeInTheDocument();
    expect(await screen.findByRole('table', { name: 'Resources' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Scope filters' })).not.toBeInTheDocument();
    expect(screen.queryByText('Average CPU', { selector: 'p' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('HeatmapChart')).not.toBeInTheDocument();
    expect(screen.queryByTestId('MeterChart')).not.toBeInTheDocument();
  });

  it('lists every resource without status filters', async () => {
    render(<App />);
    const table = await screen.findByRole('table', { name: 'Resources' });
    expect(screen.queryByRole('tablist', { name: 'Resource filter' })).not.toBeInTheDocument();
    expect(within(table).getAllByRole('row').length).toBeGreaterThan(1);
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
