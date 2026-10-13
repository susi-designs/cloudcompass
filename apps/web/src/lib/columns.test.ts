import { alignClass, isEndAligned, type ColumnKind } from './columns';

describe('column alignment rule', () => {
  it.each<[ColumnKind, boolean]>([
    ['currency', true],
    ['number', true],
    ['percent', true],
    ['text', false],
    ['id', false],
    ['date', false],
  ])('%s → end aligned: %s', (kind, expected) => {
    expect(isEndAligned(kind)).toBe(expected);
    expect(alignClass(kind)).toBe(expected ? 'cc-cell--end' : 'cc-cell--start');
  });
});
