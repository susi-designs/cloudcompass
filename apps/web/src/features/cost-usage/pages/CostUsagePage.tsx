import { Tab, TabList, TabPanel, TabPanels, Tabs } from '@carbon/react';
import { useSearchParams } from 'react-router-dom';
import { PageLayout } from '../../../components/PageLayout';
import { BudgetsView } from '../components/BudgetsView';
import { CostExplorer } from '../components/CostExplorer';

const VIEWS = ['explorer', 'budgets'] as const;

export function CostUsagePage() {
  const [params, setParams] = useSearchParams();
  const view = params.get('view') === 'budgets' ? 1 : 0;

  return (
    <PageLayout
      title="Cost & Usage"
      description="Explore spend by any level of the organization or service, drill down, and track budgets."
    >
      <Tabs
        selectedIndex={view}
        onChange={({ selectedIndex }) =>
          setParams(
            (prev) => {
              const next = new URLSearchParams(prev);
              next.set('view', VIEWS[selectedIndex] ?? 'explorer');
              return next;
            },
            { replace: true },
          )
        }
      >
        <TabList aria-label="Cost & Usage views">
          <Tab>Cost Explorer</Tab>
          <Tab>Budgets</Tab>
        </TabList>
        <TabPanels>
          <TabPanel className="cc-tab-panel">{view === 0 && <CostExplorer />}</TabPanel>
          <TabPanel className="cc-tab-panel">{view === 1 && <BudgetsView />}</TabPanel>
        </TabPanels>
      </Tabs>
    </PageLayout>
  );
}
