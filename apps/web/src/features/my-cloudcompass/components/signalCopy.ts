import type { AnomalySeverity } from '@cloudcompass/types';
import { SECTION_LABELS, SECTION_PATHS } from '../../../data/myCloudCompass';
import type { Signal, SignalKind } from '../../../data/signals';
import { formatCurrency, formatPercent, formatPercentChange } from '../../../lib/format';

/*
 * Words for the adaptive layout. Signals carry numbers only; everything a person reads is
 * written here, at the edge (CLAUDE.md §7 "format only at the edge").
 */

export const SIGNAL_KIND_LABELS: Record<SignalKind, string> = {
  anomaly: 'Anomaly alerts',
  budget: 'Budget alerts',
  'spend-growth': 'Spend growth alerts',
  recommendation: 'Recommendations',
  idle: 'Idle resource alerts',
  commitment: 'Commitment coverage alerts',
  'ai-growth': 'AI spend growth alerts',
};

/** Signals that are savings opportunities rather than risks. */
export const OPPORTUNITY_KINDS: readonly SignalKind[] = ['recommendation', 'idle', 'commitment'];

const money = (v: number, currency: string) => formatCurrency(v, currency, 'compact');
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const ago = (days: number) =>
  days === 0 ? 'detected today' : `detected ${plural(days, 'day', 'days')} ago`;

export function signalTitle(s: Signal): string {
  switch (s.kind) {
    case 'anomaly':
      return `${s.severity} anomaly on ${s.service}`;
    case 'budget':
      return s.status === 'Over budget' ? 'Forecast is over budget' : 'Budget at risk';
    case 'spend-growth':
      return 'Month-to-date spend is rising';
    case 'recommendation':
      return s.title;
    case 'idle':
      return `${plural(s.count, 'idle resource', 'idle resources')} costing money`;
    case 'commitment':
      return 'Low commitment coverage';
    case 'ai-growth':
      return 'AI spend is rising';
  }
}

/** The key numbers, one line. */
export function signalDetail(s: Signal, currency: string): string {
  switch (s.kind) {
    case 'anomaly':
      return `${money(s.impact, currency)} above expected (${formatPercentChange(s.impactPercent)}) in ${s.environment}`;
    case 'budget':
      return `Month-end forecast ${money(s.forecast, currency)} is ${formatPercent(s.forecastPercent)} of the ${money(s.budget, currency)} budget`;
    case 'spend-growth':
      return `${formatPercentChange(s.changePercent)} (+${money(s.change, currency)}) vs. the same days last month`;
    case 'recommendation':
      return `${s.type} · saves ${money(s.savings, currency)}/mo · ${s.effort.toLowerCase()} effort, ${s.risk.toLowerCase()} risk`;
    case 'idle':
      return `${money(s.monthlyCost, currency)}/mo on idle resources, ${formatPercent(s.shareOfBudget)} of the monthly budget`;
    case 'commitment':
      return `${formatPercent(s.coveragePercent)} of commitment-eligible spend is covered by RIs, Savings Plans or CUDs`;
    case 'ai-growth':
      return `${money(s.total, currency)} in this period, ${formatPercentChange(s.changePercent)} vs. the previous period`;
  }
}

/** "Why this is here": the facts that drove the score. */
export function signalReasons(s: Signal, currency: string): string[] {
  switch (s.kind) {
    case 'anomaly':
      return [
        `${s.severity} severity`,
        `${money(s.impact, currency)} above expected`,
        ago(s.daysAgo),
        s.status === 'Acknowledged' ? 'acknowledged, not resolved' : 'not acknowledged yet',
      ];
    case 'budget':
      return [
        `forecast at ${formatPercent(s.forecastPercent)} of budget`,
        s.status === 'Over budget' ? 'over 100%' : 'at risk from 90%',
      ];
    case 'spend-growth':
      return [`month-to-date ${formatPercentChange(s.changePercent)}`, 'alert from +10%'];
    case 'recommendation':
      return [
        `${money(s.savings, currency)}/mo savings`,
        s.owner ? `owner: ${s.owner}` : 'unassigned',
        ...(s.quickWin ? ['quick win: low effort, low risk'] : []),
      ];
    case 'idle':
      return [`idle cost ${formatPercent(s.shareOfBudget)} of budget`, 'alert from 2%'];
    case 'commitment':
      return [`coverage ${formatPercent(s.coveragePercent)}`, 'alert below 50%'];
    case 'ai-growth':
      return [`AI spend ${formatPercentChange(s.changePercent)}`, 'alert from +20%'];
  }
}

/** Status indicator for a signal card: Carbon IconIndicator kind + label (never color alone). */
export type IndicatorKind =
  'failed' | 'caution-major' | 'caution-minor' | 'informative' | 'succeeded';

export function signalIndicator(
  s: Signal,
): { severity: AnomalySeverity } | { kind: IndicatorKind; label: string } {
  switch (s.kind) {
    case 'anomaly':
      return { severity: s.severity };
    case 'budget':
      return s.status === 'Over budget'
        ? { kind: 'failed', label: 'Over budget' }
        : { kind: 'caution-major', label: 'At risk' };
    case 'spend-growth':
      return { kind: 'caution-major', label: 'Rising spend' };
    case 'ai-growth':
      return { kind: 'caution-minor', label: 'Rising AI spend' };
    case 'recommendation':
    case 'idle':
    case 'commitment':
      return { kind: 'informative', label: 'Savings opportunity' };
  }
}

/** Where a signal's link goes. The page sets the global scope to the application first. */
export function signalTarget(s: Signal): { pathname: string; search: string; label: string } {
  const pillar = SECTION_LABELS[s.section];
  switch (s.kind) {
    case 'anomaly':
      return {
        pathname: SECTION_PATHS.anomalies,
        search: `?anomaly=${encodeURIComponent(s.anomalyId)}`,
        label: 'Open in Anomalies',
      };
    case 'budget':
      return { pathname: SECTION_PATHS.cost, search: '?view=budgets', label: 'Open budgets' };
    default:
      return { pathname: SECTION_PATHS[s.section], search: '', label: `Open in ${pillar}` };
  }
}

const joinPhrases = (parts: string[]) =>
  parts.length <= 1
    ? (parts[0] ?? '')
    : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;

const SEVERITY_ORDER: readonly AnomalySeverity[] = ['Critical', 'High', 'Medium', 'Low'];

/**
 * One-sentence summary of the band, built from the same signals (rule-based, not AI-written).
 * e.g. "Trading Platform needs attention: 2 critical anomalies (+$5.8K) and the budget forecast is at 100%."
 */
export function bandSummary(appName: string, band: readonly Signal[], currency: string): string {
  if (band.length === 0) return `All clear for ${appName}. Nothing needs attention right now.`;

  const groups = new Map<SignalKind, Signal[]>();
  for (const s of band) groups.set(s.kind, [...(groups.get(s.kind) ?? []), s]);
  // Groups in band order (highest score first).
  const phrases = [...groups.entries()].map(([kind, items]) => {
    const first = items[0]!;
    switch (kind) {
      case 'anomaly': {
        const anomalies = items.filter((s) => s.kind === 'anomaly');
        const impact = anomalies.reduce((sum, a) => sum + a.impact, 0);
        const top = SEVERITY_ORDER.find((sev) => anomalies.some((a) => a.severity === sev));
        const sameSeverity = anomalies.every((a) => a.severity === top);
        const label = sameSeverity
          ? `${anomalies.length} ${top?.toLowerCase()} ${anomalies.length === 1 ? 'anomaly' : 'anomalies'}`
          : `${anomalies.length} anomalies, including ${top?.toLowerCase()}`;
        return `${label} (+${money(impact, currency)})`;
      }
      case 'budget':
        return first.kind === 'budget'
          ? `the budget forecast is at ${formatPercent(first.forecastPercent)}`
          : '';
      case 'spend-growth':
        return first.kind === 'spend-growth'
          ? `month-to-date spend is up ${formatPercentChange(first.changePercent).replace('+', '')}`
          : '';
      case 'recommendation': {
        const savings = items.reduce(
          (sum, s) => sum + (s.kind === 'recommendation' ? s.savings : 0),
          0,
        );
        return `${plural(items.length, 'savings opportunity', 'savings opportunities')} worth ${money(savings, currency)}/mo`;
      }
      case 'idle':
        return first.kind === 'idle'
          ? `${money(first.monthlyCost, currency)}/mo of idle resources`
          : '';
      case 'commitment':
        return first.kind === 'commitment'
          ? `commitment coverage is only ${formatPercent(first.coveragePercent)}`
          : '';
      case 'ai-growth':
        return first.kind === 'ai-growth'
          ? `AI spend is up ${formatPercentChange(first.changePercent).replace('+', '')}`
          : '';
    }
  });
  return `${appName} needs attention: ${joinPhrases(phrases.filter(Boolean))}.`;
}
