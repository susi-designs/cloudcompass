import { InlineNotification } from '@carbon/react';
import { PageLayout } from '../../../components/PageLayout';
import { useOverview } from '../../../data/useOverview';
import { formatDate } from '../../../lib/format';
import { KpiRow } from '../components/KpiRow';
import { SpendByLobChart } from '../components/SpendByLobChart';
import { SpendOverTimeChart } from '../components/SpendOverTimeChart';
import { TopMoversTable } from '../components/TopMoversTable';

export function OverviewPage() {
  const { data, isPending, error } = useOverview();
  const loading = isPending || !data;

  return (
    <PageLayout
      title="Overview"
      description={
        data
          ? `Cloud spend across 5 lines of business, 20 applications and 60 accounts · data as of ${formatDate(data.asOf)}`
          : 'Cloud spend across lines of business, applications and accounts'
      }
    >
      {error && (
        <InlineNotification
          kind="error"
          title="Couldn't load cost data"
          subtitle={error.message}
          hideCloseButton
        />
      )}
      <KpiRow data={data} loading={loading} />
      <div className="cc-chart-grid">
        <SpendOverTimeChart data={data} loading={loading} />
        <SpendByLobChart data={data} loading={loading} />
      </div>
      <TopMoversTable data={data} loading={loading} />
    </PageLayout>
  );
}
