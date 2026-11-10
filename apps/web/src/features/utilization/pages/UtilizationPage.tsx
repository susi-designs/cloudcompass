import { InlineNotification } from '@carbon/react';
import { PageLayout } from '../../../components/PageLayout';
import { useUtilization } from '../../../data/useUtilization';
import { formatDate } from '../../../lib/format';
import { ResourceTable } from '../components/ResourceTable';

export function UtilizationPage() {
  const { data, isPending, error } = useUtilization();
  const loading = isPending || !data;

  return (
    <PageLayout
      title="Utilization"
      description={
        data
          ? `How well provisioned compute and databases are used, idle resources, and commitments · as of ${formatDate(data.asOf)}`
          : 'How well provisioned resources are used'
      }
      filters="none"
    >
      {error && (
        <InlineNotification
          kind="error"
          title="Couldn't load utilization"
          subtitle={error.message}
          hideCloseButton
        />
      )}
      <ResourceTable data={data} loading={loading} />
    </PageLayout>
  );
}
