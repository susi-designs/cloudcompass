import {
  costDirection,
  formatCompactNumber,
  formatCurrency,
  formatNumber,
  formatPercent,
  formatPercentChange,
} from './format';

describe('format', () => {
  it('formats full-precision currency for tables', () => {
    expect(formatCurrency(1234567.891)).toBe('$1,234,567.89');
  });

  it('formats compact currency for KPIs and axes', () => {
    expect(formatCurrency(1_234_567, 'USD', 'compact')).toBe('$1.2M');
  });

  it('formats numbers and percentages', () => {
    expect(formatNumber(23360)).toBe('23,360');
    expect(formatPercent(73.4)).toBe('73%');
  });

  it('formats signed percentage change with one decimal', () => {
    expect(formatPercentChange(12.44)).toBe('+12.4%');
    expect(formatPercentChange(-3)).toBe('-3.0%');
    expect(formatPercentChange(0)).toBe('0.0%');
  });

  it('maps cost deltas to direction', () => {
    expect(costDirection(10)).toBe('increase');
    expect(costDirection(-1)).toBe('decrease');
    expect(costDirection(0)).toBe('flat');
  });

  it('formats large counts compactly', () => {
    expect(formatCompactNumber(1_234_567_890)).toBe('1.2B');
    expect(formatCompactNumber(12_300)).toBe('12.3K');
  });
});
