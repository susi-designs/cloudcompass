import { InlineNotification } from '@carbon/react';
import { PageLayout } from '../../../components/PageLayout';
import { HOURS, WEEKDAYS } from '../../../data/utilization';
import { useUtilization } from '../../../data/useUtilization';
import { formatDate } from '../../../lib/format';
import { CommitmentsSection } from '../components/CommitmentsSection';
import { CpuDistributionChart } from '../components/CpuDistributionChart';
import { ResourceTable } from '../components/ResourceTable';
import { UtilizationHeatmap } from '../components/UtilizationHeatmap';
import { UtilizationKpis } from '../components/UtilizationKpis';

export function UtilizationPage() {
  const { data, isPending, error } = useUtilization();
  const loading = isPending || !data;

  const timeSummary = data
    ? `Average CPU per ${data.timeHeatmapRowLabel.toLowerCase()} by ${data.timeHeatmapGranularity}. Select a single application in the filters to see its resources.`
    : 'Loading…';
  const hottest = data?.hourHeatmap.reduce((a, b) => (b.value > a.value ? b : a), {
    day: '',
    hour: '',
    value: -1,
  });
  const hourSummary =
    hottest && hottest.value >= 0
      ? `Typical weekly pattern over the last 30 days; busiest hour is ${hottest.day} ${hottest.hour} UTC at ${hottest.value.toFixed(0)}% CPU.`
      : 'Loading…';

  return (
    <PageLayout
      title="Utilization"
      description={
        data
          ? `How well provisioned compute and databases are used, idle resources, and commitments · as of ${formatDate(data.asOf)}`
          : 'How well provisioned resources are used'
      }
    >
      {error && (
        <InlineNotification
          kind="error"
          title="Couldn't load utilization"
          subtitle={error.message}
          hideCloseButton
        />
      )}
      <UtilizationKpis data={data} loading={loading} />
      <UtilizationHeatmap
        title={`CPU by ${data?.timeHeatmapRowLabel.toLowerCase() ?? 'application'} over time`}
        summary={timeSummary}
        loading={loading}
        data={data?.timeHeatmap ?? []}
        rowKey="row"
        rowLabel={data?.timeHeatmapRowLabel ?? 'Application'}
        columnKey="column"
        columnLabel={data?.timeHeatmapGranularity === 'week' ? 'Week starting' : 'Day'}
        columns={data?.timeHeatmapColumns ?? []}
      />
      <div className="cc-chart-grid">
        <UtilizationHeatmap
          title="CPU by hour of week"
          summary={hourSummary}
          loading={loading}
          data={data?.hourHeatmap ?? []}
          rowKey="day"
          rowLabel="Day"
          rows={[...WEEKDAYS]}
          columnKey="hour"
          columnLabel="Hour (UTC)"
          columns={HOURS}
        />
        <CpuDistributionChart data={data} loading={loading} />
      </div>
      <ResourceTable data={data} loading={loading} />
      <CommitmentsSection data={data} loading={loading} />
    </PageLayout>
  );
}
