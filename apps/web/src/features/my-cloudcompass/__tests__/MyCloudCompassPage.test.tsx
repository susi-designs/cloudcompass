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
    // Fixed tab order; a pillar tab is flagged when it has signals in the band.
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual([
      'Overview',
      expect.stringMatching(/^Cost & Usage/),
      expect.stringMatching(/^Utilization/),
      expect.stringMatching(/^Optimization/),
      'AI Spend',
      'Anomalies' + 'Needs attention (2)',
    ]);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('opens a pillar tab from a signal card and keeps it in the URL', async () => {
    window.history.pushState({}, '', '/?app=app-trading-platform');
    const user = userEvent.setup();
    render(<App />);
    const band = (await screen.findByRole('heading', { name: 'Needs attention' })).closest(
      '.cc-attention',
    ) as HTMLElement;
    const [first] = within(band).getAllByRole('listitem');
    await user.click(within(first!).getByRole('button', { name: 'Go to Anomalies tab' }));
    expect(window.location.search).toBe('?app=app-trading-platform&tab=anomalies');
    const anomaliesTab = screen.getByRole('tab', { name: /^Anomalies/ });
    expect(anomaliesTab).toHaveAttribute('aria-selected', 'true');
    expect(anomaliesTab).toHaveFocus();
    expect(section('anomalies')).toHaveAttribute('data-state', 'attention');
    expect(screen.queryByRole('heading', { name: 'Needs attention' })).not.toBeInTheDocument();
    // A banner under the header lists what needs attention in this tab.
    const banner = within(section('anomalies') as HTMLElement).getByRole('list', {
      name: 'Anomalies: needs attention',
    });
    const items = within(banner).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent(/^CriticalCritical anomaly on/); // icon label + title
    expect(within(items[0]!).getByRole('button', { name: 'Open in Anomalies' })).toBeVisible();
    expect(anomaliesTab).toHaveFocus(); // the banner doesn't take focus
    // Trading Platform has no AI usage: the tab is quiet and says so.
    await user.click(screen.getByRole('tab', { name: 'AI Spend' }));
    expect(window.location.search).toBe('?app=app-trading-platform&tab=ai');
    expect(section('ai')).toHaveAttribute('data-state', 'quiet');
    expect(within(section('ai') as HTMLElement).getByText('All clear')).toBeInTheDocument();
    expect(
      within(section('ai') as HTMLElement).getByText('No AI usage for this application'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Overview' }));
    expect(window.location.search).toBe('?app=app-trading-platform');
  });

  it('opens on the tab in the link and falls back to Overview for an unknown one', async () => {
    window.history.pushState({}, '', '/?app=app-trading-platform&tab=optimization');
    const { unmount } = render(<App />);
    expect(await screen.findByRole('heading', { name: 'Optimization' })).toBeInTheDocument();
    expect(section('optimization')).toBeInTheDocument();
    unmount();
    window.history.pushState({}, '', '/?app=app-trading-platform&tab=nope');
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Needs attention' })).toBeInTheDocument();
  });

  it('mutes an alert type per application', async () => {
    window.history.pushState({}, '', '/?app=app-trading-platform');
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('heading', { name: 'Needs attention' });
    await user.click(
      screen.getByRole('button', { name: 'Mute budget alerts for this application' }),
    );
    expect(screen.getByText('Muted for this application:')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Budget at risk' })).not.toBeInTheDocument();
    expect(stored().prefs['app-trading-platform']).toEqual({ muted: ['budget'] });
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
    const user = userEvent.setup();
    await user.click(screen.getByRole('tab', { name: /^Cost & Usage/ }));
    const cost = section('cost') as HTMLElement;
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

  it('lists Data Platform anomalies that need triage', async () => {
    window.history.pushState({}, '', '/?app=app-data-platform&tab=anomalies');
    render(<App />);
    const table = await screen.findByRole('table', { name: 'Anomalies that need triage' });
    // Header + 2 open and 1 acknowledged anomaly (mock data).
    expect(within(table).getAllByRole('row')).toHaveLength(4);
    expect(screen.getByRole('tab', { name: /^Anomalies/ })).toHaveTextContent('Needs attention');
  });

  it('warns about an unknown application in the link', async () => {
    window.history.pushState({}, '', '/?app=app-nope');
    render(<App />);
    expect(await screen.findByText('Application not found')).toBeInTheDocument();
  });
});
