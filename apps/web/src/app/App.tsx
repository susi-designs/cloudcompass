import { Loading, Tile } from '@carbon/react';
import { lazy, Suspense } from 'react';
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { ComingSoonPage } from '../features/placeholder/ComingSoonPage';
import { AppShell } from '../shell/AppShell';
import { AppProviders } from './AppProviders';
import { NAV_ITEMS } from './navigation';

// Pages are code-split so each pillar's charts load only when visited.
const MyCloudCompassPage = lazy(() =>
  import('../features/my-cloudcompass/pages/MyCloudCompassPage').then((m) => ({
    default: m.MyCloudCompassPage,
  })),
);
const OverviewPage = lazy(() =>
  import('../features/overview/pages/OverviewPage').then((m) => ({ default: m.OverviewPage })),
);
const CostUsagePage = lazy(() =>
  import('../features/cost-usage/pages/CostUsagePage').then((m) => ({ default: m.CostUsagePage })),
);

const UtilizationPage = lazy(() =>
  import('../features/utilization/pages/UtilizationPage').then((m) => ({
    default: m.UtilizationPage,
  })),
);

const AiSpendPage = lazy(() =>
  import('../features/ai-spend/pages/AiSpendPage').then((m) => ({ default: m.AiSpendPage })),
);

const OptimizationPage = lazy(() =>
  import('../features/optimization/pages/OptimizationPage').then((m) => ({
    default: m.OptimizationPage,
  })),
);

const AnomaliesPage = lazy(() =>
  import('../features/anomalies/pages/AnomaliesPage').then((m) => ({
    default: m.AnomaliesPage,
  })),
);

const BUILT_PAGES = new Set([
  '/',
  '/overview',
  '/cost-usage',
  '/utilization',
  '/ai-spend',
  '/optimization',
  '/anomalies',
]);

function NotFound() {
  return (
    <div className="cc-page">
      <Tile className="cc-coming-soon">
        <h1 className="cds--type-heading-05">Page not found</h1>
        <p className="cds--type-body-01">
          <Link to="/" className="cds--link">
            Go to My CloudCompass
          </Link>
        </p>
      </Tile>
    </div>
  );
}

export function App() {
  return (
    <AppProviders>
      <BrowserRouter>
        <AppShell>
          <Suspense
            fallback={
              <Loading description="Loading page" withOverlay={false} className="cc-page-loading" />
            }
          >
            <Routes>
              <Route path="/" element={<MyCloudCompassPage />} />
              <Route path="/overview" element={<OverviewPage />} />
              <Route path="/cost-usage" element={<CostUsagePage />} />
              <Route path="/utilization" element={<UtilizationPage />} />
              <Route path="/ai-spend" element={<AiSpendPage />} />
              <Route path="/optimization" element={<OptimizationPage />} />
              <Route path="/anomalies" element={<AnomaliesPage />} />
              {NAV_ITEMS.filter((i) => !BUILT_PAGES.has(i.path)).map((item) => (
                <Route key={item.path} path={item.path} element={<ComingSoonPage item={item} />} />
              ))}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AppShell>
      </BrowserRouter>
    </AppProviders>
  );
}
