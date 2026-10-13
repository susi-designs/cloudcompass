import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../../app/App';

describe('AI Spend page', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.pushState({}, '', '/ai-spend');
  });

  it('shows KPIs, charts, feature costs and GPU clusters', async () => {
    render(<App />);
    expect(await screen.findByRole('heading', { level: 1, name: 'AI Spend' })).toBeInTheDocument();
    for (const label of ['LLM APIs', 'GPU clusters', 'Tokens processed', 'Prompt cache hit rate']) {
      expect(await screen.findByText(label, { selector: 'p' })).toBeInTheDocument();
    }
    expect(screen.getByTestId('StackedBarChart')).toBeInTheDocument();
    expect(screen.getByTestId('SimpleBarChart')).toBeInTheDocument();
    expect(screen.getByTestId('LineChart')).toBeInTheDocument();
    const features = screen.getByRole('table', { name: 'Cost per feature' });
    expect(within(features).getAllByRole('row').length).toBeGreaterThan(5);
    const gpu = screen.getByRole('table', { name: 'GPU clusters' });
    expect(within(gpu).getAllByRole('row')).toHaveLength(5);
    expect(within(gpu).getByRole('columnheader', { name: /Cluster/ })).toHaveClass(
      'cc-cell--start',
    );
    expect(within(gpu).getByRole('columnheader', { name: /Unused GPU cost/ })).toHaveClass(
      'cc-cell--end',
    );
  });

  it('compares a feature across models and marks the current one', async () => {
    const user = userEvent.setup();
    render(<App />);
    const table = await screen.findByRole('table', { name: 'Projected cost by model' });
    expect(within(table).getAllByRole('row')).toHaveLength(8); // header + 7 models
    expect(within(table).getAllByText('Current').length).toBeGreaterThanOrEqual(1);
    await user.click(screen.getByRole('combobox', { name: /Feature/ }));
    const options = screen.getAllByRole('option');
    await user.click(options[options.length - 1]!);
    expect(
      within(await screen.findByRole('table', { name: 'Projected cost by model' })).getAllByRole(
        'row',
      ),
    ).toHaveLength(8);
  });
});
