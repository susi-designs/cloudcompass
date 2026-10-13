import { Tile } from '@carbon/react';
import type { AppSnapshot } from '../../../data/myCloudCompass';
import { AiSpendTrendChart } from '../../ai-spend/components/AiSpendTrendChart';
import { FeatureCostTable } from '../../ai-spend/components/FeatureCostTable';
import { SpendByModelChart } from '../../ai-spend/components/SpendByModelChart';

/** AI Spend snapshot. AI usage is allocated to the application's accounts (PRODUCT.md §4.3). */
export function AiSection({ snapshot }: { snapshot: AppSnapshot }) {
  const data = snapshot.aiSpend;
  if (data.kpis.total === 0 && data.features.length === 0) {
    return (
      <Tile className="cc-empty">
        <h3 className="cds--type-heading-compact-01">No AI usage for this application</h3>
        <p className="cds--type-body-compact-01 cc-text-secondary">
          No LLM API or GPU spend was allocated to {snapshot.application.name} in the selected
          period and environments.
        </p>
      </Tile>
    );
  }
  return (
    <div className="cc-stack cc-stack--tight">
      <div className="cc-chart-grid">
        <AiSpendTrendChart data={data} loading={false} />
        <SpendByModelChart data={data} loading={false} />
      </div>
      <FeatureCostTable data={data} loading={false} />
    </div>
  );
}
