import { InlineNotification } from '@carbon/react';
import { PageLayout } from '../../../components/PageLayout';
import { useOptimization } from '../../../data/useOptimization';
import { formatDate } from '../../../lib/format';
import { RecommendationsInbox } from '../components/RecommendationsInbox';

export function OptimizationPage() {
  const { data, isPending, error } = useOptimization();
  const loading = isPending || !data;

  return (
    <PageLayout
      title="Optimization"
      description={
        data
          ? `Prioritized savings recommendations and the ledger of what they saved · as of ${formatDate(data.asOf)}`
          : 'Prioritized savings recommendations and the ledger of what they saved'
      }
      filters="none"
    >
      {error && (
        <InlineNotification
          kind="error"
          title="Couldn't load recommendations"
          subtitle={error.message}
          hideCloseButton
        />
      )}
      <RecommendationsInbox data={data} loading={loading} />
    </PageLayout>
  );
}
