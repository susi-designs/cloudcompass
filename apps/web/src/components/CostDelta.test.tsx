import { render, screen } from '@testing-library/react';
import { CostDelta } from './CostDelta';

describe('CostDelta', () => {
  it('shows an increase with sign, arrow class and screen-reader text', () => {
    const { container } = render(<CostDelta change={1200} changePercent={12.44} showAmount />);
    expect(screen.getByText('+$1,200.00 · +12.4%')).toBeInTheDocument();
    expect(screen.getByText('Up')).toHaveClass('cds--visually-hidden');
    expect(container.firstChild).toHaveClass('cc-delta--increase');
  });

  it('shows a decrease as good news', () => {
    const { container } = render(<CostDelta change={-50} changePercent={-5} />);
    expect(screen.getByText('-5.0%')).toBeInTheDocument();
    expect(container.firstChild).toHaveClass('cc-delta--decrease');
  });
});
