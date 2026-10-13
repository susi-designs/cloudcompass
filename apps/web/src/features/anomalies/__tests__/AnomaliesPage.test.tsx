import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../../app/App';
import { TRIAGE_STORAGE_KEY } from '../../../data/AnomalyTriageProvider';

const countIn = (name: RegExp) => {
  const tab = screen.getByRole('tab', { name });
  return Number(/\((\d+)\)/.exec(tab.textContent ?? '')?.[1]);
};

describe('Anomalies page', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.pushState({}, '', '/anomalies');
  });

  it('shows KPIs, both charts and the feed of anomalies needing triage', async () => {
    render(<App />);
    expect(await screen.findByRole('heading', { level: 1, name: 'Anomalies' })).toBeInTheDocument();
    for (const label of ['Needs triage', 'Mean time to resolve']) {
      expect(await screen.findByText(label, { selector: 'p' })).toBeInTheDocument();
    }
    expect(screen.getByTestId('ScatterChart')).toBeInTheDocument();
    expect(screen.getByTestId('SimpleBarChart')).toBeInTheDocument();
    const table = screen.getByRole('table', { name: 'Anomaly feed' });
    expect(within(table).getByRole('columnheader', { name: /Severity/ })).toHaveClass(
      'cc-cell--start',
    );
    expect(within(table).getByRole('columnheader', { name: /Detected/ })).toHaveClass(
      'cc-cell--start',
    );
    expect(within(table).getByRole('columnheader', { name: /Impact/ })).toHaveClass('cc-cell--end');
    expect(within(table).getAllByText('Critical').length).toBeGreaterThan(0);
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(countIn(/^Needs triage \(/));
  });

  it('opens the detail panel with root-cause hints and closes it with Escape', async () => {
    const user = userEvent.setup();
    render(<App />);
    const table = await screen.findByRole('table', { name: 'Anomaly feed' });
    const link = within(table).getAllByRole('link')[0]!;
    await user.click(link);
    const panel = screen.getByRole('dialog', { name: /cost spike$/ });
    expect(within(panel).getByRole('heading', { name: 'Root-cause hints' })).toBeInTheDocument();
    expect(within(panel).getByText('Likely cause:')).toBeInTheDocument();
    expect(within(panel).getByRole('table', { name: 'Impact by usage type' })).toBeInTheDocument();
    expect(within(panel).getByTestId('LineChart')).toBeInTheDocument();
    expect(window.location.search).toMatch(/anomaly=anom-/);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: /cost spike$/ })).not.toBeInTheDocument();
    expect(window.location.search).not.toMatch(/anomaly=/);
  });

  it('acknowledges selected anomalies and remembers the change', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('table', { name: 'Anomaly feed' });
    await user.click(screen.getByRole('tab', { name: /^Open \(/ }));
    const open = countIn(/^Open \(/);
    const acknowledged = countIn(/^Acknowledged \(/);
    const boxes = within(screen.getByRole('table', { name: 'Anomaly feed' })).getAllByRole(
      'checkbox',
    );
    await user.click(boxes[1]!);
    await user.click(boxes[2]!);
    await user.click(screen.getByRole('button', { name: 'Acknowledge' }));
    expect(await screen.findByText('2 anomalies acknowledged')).toBeInTheDocument();
    expect(countIn(/^Open \(/)).toBe(open - 2);
    expect(countIn(/^Acknowledged \(/)).toBe(acknowledged + 2);
    expect(screen.getByText('Triage changes are saved in this browser only.')).toBeInTheDocument();
    expect(Object.keys(JSON.parse(window.localStorage.getItem(TRIAGE_STORAGE_KEY)!))).toHaveLength(
      2,
    );

    await user.click(screen.getByRole('button', { name: 'Discard changes' }));
    expect(countIn(/^Open \(/)).toBe(open);
    expect(window.localStorage.getItem(TRIAGE_STORAGE_KEY)).toBeNull();
  });

  it('marks an anomaly expected from the panel with a reason', async () => {
    const user = userEvent.setup();
    render(<App />);
    const table = await screen.findByRole('table', { name: 'Anomaly feed' });
    const triage = countIn(/^Needs triage \(/);
    await user.click(within(table).getAllByRole('link')[0]!);
    const panel = screen.getByRole('dialog', { name: /cost spike$/ });
    await user.click(within(panel).getByRole('button', { name: 'Mark expected' }));
    const modal = screen
      .getByRole('heading', { name: 'Mark 1 anomaly as expected' })
      .closest<HTMLElement>('.cds--modal-container')!;
    expect(within(modal).getByRole('button', { name: 'Mark expected' })).toBeDisabled();
    await user.click(within(modal).getByRole('combobox', { name: /Reason/ }));
    await user.click(screen.getByRole('option', { name: 'Load or performance test' }));
    await user.click(within(modal).getByRole('button', { name: 'Mark expected' }));
    expect(await screen.findByText('1 anomaly marked expected')).toBeInTheDocument();
    expect(countIn(/^Needs triage \(/)).toBe(triage - 1);
    expect(within(panel).getByText('Load or performance test')).toBeInTheDocument();
    expect(within(panel).getByRole('button', { name: 'Reopen' })).toBeInTheDocument();
  });
});
