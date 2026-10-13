import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../../app/App';
import { MY_CLOUDCOMPASS_STORAGE_KEY } from '../../../data/myCloudCompassStore';

const stored = () => JSON.parse(window.localStorage.getItem(MY_CLOUDCOMPASS_STORAGE_KEY) ?? '{}');
const section = (id: string) => document.querySelector(`[data-section="${id}"]`)!;

describe('My CloudCompass page', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('asks a first-time user to choose an application, then makes it the default', async () => {
    window.history.pushState({}, '', '/');
    const user = userEvent.setup();
    render(<App />);
    expect(
      await screen.findByRole('heading', { level: 1, name: 'My CloudCompass' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Choose your application' })).toBeInTheDocument();
    await user.click(await screen.findByRole('combobox', { name: 'Application' }));
    await user.click(await screen.findByRole('option', { name: /Trading Platform/ }));
    expect(await screen.findByRole('heading', { name: 'Needs attention' })).toBeInTheDocument();
    expect(window.location.search).toBe('?app=app-trading-platform');
    expect(stored()).toMatchObject({
      apps: ['app-trading-platform'],
      defaultApp: 'app-trading-platform',
    });
    expect(screen.getByText('Default application')).toBeInTheDocument();
  });

  it('opens on the default application and brings the critical anomalies forward', async () => {
    window.localStorage.setItem(
      MY_CLOUDCOMPASS_STORAGE_KEY,
      JSON.stringify({ apps: ['app-trading-platform'], defaultApp: 'app-trading-platform' }),
    );
    window.history.pushState({}, '', '/');
    render(<App />);
    const band = (await screen.findByRole('heading', { name: 'Needs attention' })).closest(
      '.cc-attention',
    ) as HTMLElement;
    expect(
      within(band).getByText(/^Trading Platform needs attention: 2 critical anomalies/),
    ).toBeInTheDocument();
    const cards = within(band).getAllByRole('listitem');
    expect(cards.length).toBeLessThanOrEqual(5);
    expect(within(cards[0]!).getByRole('link', { name: /^Critical anomaly on/ })).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/anomalies\?anomaly=anom-/),
    );
    expect(within(cards[0]!).getByText(/^Why:/).parentElement).toHaveTextContent(
      /Critical severity/,
    );
    // Fixed order; emphasis follows the signals. Trading Platform has no AI usage.
    const ids = [...document.querySelectorAll('[data-section]')].map((el) =>
      el.getAttribute('data-section'),
    );
    expect(ids).toEqual(['cost', 'utilization', 'ai', 'optimization', 'anomalies']);
    expect(section('anomalies')).toHaveAttribute('data-state', 'attention');
    expect(section('ai')).toHaveAttribute('data-state', 'quiet');
    expect(within(section('ai') as HTMLElement).getByText(/No AI usage/)).toBeInTheDocument();
  });

  it('mutes an alert type and pins a quiet section open, per application', async () => {
    window.history.pushState({}, '', '/?app=app-trading-platform');
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('heading', { name: 'Needs attention' });
    await user.click(
      screen.getByRole('button', { name: 'Mute budget alerts for this application' }),
    );
    expect(screen.getByText('Muted for this application:')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Budget at risk' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Pin AI Spend open' }));
    expect(section('ai')).toHaveAttribute('data-state', 'steady');
    expect(stored().prefs['app-trading-platform']).toEqual({ pinned: ['ai'], muted: ['budget'] });
    // Opening a deep link doesn't change My applications or the default.
    expect(stored().apps).toEqual([]);
  });

  it('shows the KPI strip and aligns the services table by column kind', async () => {
    window.history.pushState({}, '', '/?app=app-data-platform');
    render(<App />);
    for (const label of [
      'Month-to-date spend',
      'Forecast (month end)',
      'Budget status',
      'AI spend',
      'Open savings / mo',
      'Open anomalies',
    ]) {
      expect(await screen.findByText(label, { selector: 'p' })).toBeInTheDocument();
    }
    // Data Platform's cost section is quiet: expand it to see the details.
    const user = userEvent.setup();
    const cost = section('cost') as HTMLElement;
    if (cost.getAttribute('data-state') === 'quiet')
      await user.click(within(cost).getByRole('button', { name: 'Show details' }));
    const table = within(cost).getByRole('table', { name: 'Top 5 services' });
    const header = (name: RegExp) => within(table).getByRole('columnheader', { name });
    expect(header(/Service/)).toHaveClass('cc-cell--start');
    for (const name of [/Spend/, /Previous period/, /Change/])
      expect(header(name)).toHaveClass('cc-cell--end');
    // Header + up to 5 services.
    const rows = within(table).getAllByRole('row');
    expect(rows.length).toBeGreaterThan(1);
    expect(rows.length).toBeLessThanOrEqual(6);
  });

  it('warns about an unknown application in the link', async () => {
    window.history.pushState({}, '', '/?app=app-nope');
    render(<App />);
    expect(await screen.findByText('Application not found')).toBeInTheDocument();
  });
});
