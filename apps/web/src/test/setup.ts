import '@testing-library/jest-dom/vitest';
import { createElement } from 'react';
import { vi } from 'vitest';

// jsdom lacks these browser APIs that Carbon components rely on.
if (typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

// Carbon Dropdown scrolls the highlighted item into view.
Element.prototype.scrollIntoView ??= function scrollIntoView() {};

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

// Carbon Charts render SVG with D3 and need real layout; stub them in unit tests.
// Charts are covered by Playwright instead.
vi.mock('@carbon/charts-react', () => {
  const stub = (name: string) =>
    function ChartStub({ data }: { data: unknown[] }) {
      return createElement('div', { 'data-testid': name, 'data-points': data.length });
    };
  return {
    StackedAreaChart: stub('StackedAreaChart'),
    SimpleBarChart: stub('SimpleBarChart'),
    LineChart: stub('LineChart'),
    StackedBarChart: stub('StackedBarChart'),
    GroupedBarChart: stub('GroupedBarChart'),
    HeatmapChart: stub('HeatmapChart'),
    MeterChart: stub('MeterChart'),
    ScatterChart: stub('ScatterChart'),
  };
});
