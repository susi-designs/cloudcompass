import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';

describe('App shell', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.pushState({}, '', '/overview');
  });

  it('lands on My CloudCompass at /', async () => {
    window.history.pushState({}, '', '/');
    render(<App />);
    expect(
      await screen.findByRole('heading', { level: 1, name: 'My CloudCompass' }),
    ).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Side navigation' });
    expect(within(nav).getAllByRole('link')[0]).toHaveTextContent('Cost & Usage');
  });

  it('renders the header, side navigation and the Overview dashboard', async () => {
    render(<App />);
    expect(screen.getByRole('banner', { name: 'CloudCompass' })).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Side navigation' });
    for (const label of ['Cost & Usage', 'Utilization', 'Optimization']) {
      expect(within(nav).getByRole('link', { name: label })).toBeInTheDocument();
    }
    // Temporarily hidden from the side nav.
    for (const label of ['My CloudCompass', 'Overview', 'AI Spend', 'Anomalies']) {
      expect(within(nav).queryByRole('link', { name: label })).not.toBeInTheDocument();
    }
    expect(await screen.findByRole('heading', { level: 1, name: 'Overview' })).toBeInTheDocument();
    expect(await screen.findByText('Month-to-date spend')).toBeInTheDocument();
    expect(await screen.findByRole('table', { name: 'Top movers' })).toBeInTheDocument();
    expect(await screen.findByTestId('LineChart')).toBeInTheDocument();
    expect(screen.getByTestId('SimpleBarChart')).toBeInTheDocument();
  });

  it('right-aligns dollar columns and left-aligns text columns in tables', async () => {
    render(<App />);
    const table = await screen.findByRole('table', { name: 'Top movers' });
    const headers = within(table).getAllByRole('columnheader');
    const byName = (name: string) => headers.find((h) => h.textContent?.includes(name))!;
    for (const name of ['Application', 'Line of business']) {
      expect(byName(name)).toHaveClass('cc-cell--start');
    }
    for (const name of ['Previous period', 'Selected period', 'Change']) {
      expect(byName(name)).toHaveClass('cc-cell--end');
    }
    const firstRow = within(table).getAllByRole('row')[1]!;
    const cells = within(firstRow).getAllByRole('cell');
    expect(cells.map((c) => c.className.includes('cc-cell--end'))).toEqual([
      false,
      false,
      true,
      true,
      true,
    ]);
  });

  it('navigates to the Optimization pillar', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('link', { name: 'Optimization' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Optimization' }),
    ).toBeInTheDocument();
  });

  it('switches to dark theme and remembers the choice', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('heading', { level: 1, name: 'Overview' });
    await user.click(screen.getByRole('button', { name: 'Theme' }));
    await user.click(screen.getByLabelText('Dark'));
    expect(document.querySelector('.cc-app')).toHaveClass('cds--g100');
    expect(window.localStorage.getItem('cloudcompass.theme')).toBe('dark');
  });
});
