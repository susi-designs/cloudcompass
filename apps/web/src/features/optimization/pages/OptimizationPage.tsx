import { InlineNotification, Tab, TabList, TabPanel, TabPanels, Tabs } from '@carbon/react';
import { useSearchParams } from 'react-router-dom';
import { PageLayout } from '../../../components/PageLayout';
import { useOptimization } from '../../../data/useOptimization';
import { formatDate } from '../../../lib/format';
import { OpenSavingsChart } from '../components/OpenSavingsChart';
import { OptimizationKpis } from '../components/OptimizationKpis';
import { RecommendationsInbox } from '../components/RecommendationsInbox';
import { SavingsLedger } from '../components/SavingsLedger';

const VIEWS = ['recommendations', 'ledger'] as const;

function RecommendationsView() {
  const { data, isPending, error } = useOptimization();
  const loading = isPending || !data;
  const c = data?.currency ?? 'USD';
  return (
    <div className="cc-stack">
      {error && (
        <InlineNotification
          kind="error"
          title="Couldn't load recommendations"
          subtitle={error.message}
          hideCloseButton
        />
      )}
      <OptimizationKpis data={data} loading={loading} />
      <div className="cc-chart-grid">
        <OpenSavingsChart
          title="Open savings by recommendation type"
          groupHeader="Type"
          groups={data?.openByType ?? []}
          currency={c}
          loading={loading}
        />
        <OpenSavingsChart
          title="Open savings by line of business"
          groupHeader="Line of business"
          groups={data?.openByLob ?? []}
          currency={c}
          loading={loading}
        />
      </div>
      <RecommendationsInbox data={data} loading={loading} />
    </div>
  );
}

export function OptimizationPage() {
  const [params, setParams] = useSearchParams();
  const view = params.get('view') === 'ledger' ? 1 : 0;
  const { data } = useOptimization();

  return (
    <PageLayout
      title="Optimization"
      description={
        data
          ? `Prioritized savings recommendations and the ledger of what they saved · as of ${formatDate(data.asOf)}`
          : 'Prioritized savings recommendations and the ledger of what they saved'
      }
    >
      <Tabs
        selectedIndex={view}
        onChange={({ selectedIndex }) =>
          setParams(
            (prev) => {
              const next = new URLSearchParams(prev);
              next.set('view', VIEWS[selectedIndex] ?? 'recommendations');
              return next;
            },
            { replace: true },
          )
        }
      >
        <TabList aria-label="Optimization views">
          <Tab>Recommendations</Tab>
          <Tab>Savings ledger</Tab>
        </TabList>
        <TabPanels>
          <TabPanel className="cc-tab-panel">{view === 0 && <RecommendationsView />}</TabPanel>
          <TabPanel className="cc-tab-panel">{view === 1 && <SavingsLedger />}</TabPanel>
        </TabPanels>
      </Tabs>
    </PageLayout>
  );
}
