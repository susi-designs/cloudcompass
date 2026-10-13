import { render, screen } from '@testing-library/react';
import { SeverityCounts } from './SeverityCounts';

describe('SeverityCounts', () => {
  it('lists non-zero severities in order, each with a text label', () => {
    const { container } = render(
      <SeverityCounts counts={{ Critical: 2, High: 0, Medium: 1, Low: 3 }} />,
    );
    expect(screen.getByText('Critical')).toBeInTheDocument();
    expect(screen.queryByText('High')).not.toBeInTheDocument();
    const counts = [...container.querySelectorAll('.cc-severity-count__value')].map(
      (el) => el.textContent,
    );
    expect(counts).toEqual(['2', '1', '3']);
  });
});
