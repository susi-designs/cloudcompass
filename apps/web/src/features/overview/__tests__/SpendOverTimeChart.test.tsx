import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../../app/App';

describe('Daily spend by environment', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('opens on the side-by-side comparison of environments and switches to the stacked total', async () => {
    window.history.pushState({}, '', '/overview');
    const user = userEvent.setup();
    render(<App />);
    const card = (
      await screen.findByRole('heading', { name: 'Daily spend by environment' })
    ).closest('.cc-chart-card') as HTMLElement;

    expect(
      await within(card).findByText(/: PROD \$[\d.]+[KM], TEST \$[\d.]+[KM], DEV \$[\d.]+[KM]\.$/),
    ).toBeInTheDocument();
    expect(within(card).getByTestId('LineChart')).toBeInTheDocument();

    await user.click(within(card).getByRole('tab', { name: 'View as stacked area (total spend)' }));
    expect(within(card).getByTestId('StackedAreaChart')).toBeInTheDocument();
    expect(within(card).queryByTestId('LineChart')).not.toBeInTheDocument();

    await user.click(within(card).getByRole('tab', { name: 'View as table' }));
    expect(
      within(card).getByRole('table', { name: 'Daily spend by environment data' }),
    ).toBeInTheDocument();
  });
});
