import { InlineNotification } from '@carbon/react';
import { PageLayout } from '../../../components/PageLayout';
import { useAiSpend } from '../../../data/useAiSpend';
import { AiKpis } from '../components/AiKpis';
import { AiSpendTrendChart } from '../components/AiSpendTrendChart';
import { FeatureCostTable } from '../components/FeatureCostTable';
import { GpuClustersTable } from '../components/GpuClustersTable';
import { ModelComparison } from '../components/ModelComparison';
import { SpendByModelChart } from '../components/SpendByModelChart';
import { TokenTrendChart } from '../components/TokenTrendChart';

export function AiSpendPage() {
  const { data, isPending, error } = useAiSpend();
  const loading = isPending || !data;
  return (
    <PageLayout
      title="AI Spend"
      description="LLM API and GPU spend by provider, model, application and feature. AI usage is allocated to each application's PROD account."
    >
      {error && (
        <InlineNotification
          kind="error"
          title="Couldn't load AI spend"
          subtitle={error.message}
          hideCloseButton
        />
      )}
      <AiKpis data={data} loading={loading} />
      <div className="cc-chart-grid">
        <AiSpendTrendChart data={data} loading={loading} />
        <SpendByModelChart data={data} loading={loading} />
      </div>
      <TokenTrendChart data={data} loading={loading} />
      <FeatureCostTable data={data} loading={loading} />
      <ModelComparison data={data} />
      <GpuClustersTable data={data} loading={loading} />
    </PageLayout>
  );
}
