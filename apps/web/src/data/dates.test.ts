import { addDays, daysBetween, daysInMonth, sameDayPreviousMonth, startOfMonth } from './dates';

describe('dates', () => {
  it('adds days across month boundaries', () => {
    expect(addDays('2026-10-01', -1)).toBe('2026-09-30');
  });
  it('counts inclusive days', () => {
    expect(daysBetween('2026-10-01', '2026-10-09')).toBe(9);
  });
  it('finds month boundaries', () => {
    expect(startOfMonth('2026-10-09')).toBe('2026-10-01');
    expect(daysInMonth('2026-02-10')).toBe(28);
  });
  it('clamps the same day last month', () => {
    expect(sameDayPreviousMonth('2026-10-09')).toBe('2026-09-09');
    expect(sameDayPreviousMonth('2026-03-31')).toBe('2026-02-28');
  });
});
