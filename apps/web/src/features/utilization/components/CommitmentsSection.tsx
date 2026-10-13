import { MeterChart } from '@carbon/charts-react';
import type { ChartTabularData, MeterChartOptions } from '@carbon/charts';
import { SkeletonPlaceholder, Tag, Tile } from '@carbon/react';
import type { CommitmentRow, UtilizationData } from '../../../data/utilization';
import { formatCurrency, formatDate } from '../../../lib/format';
import { useThemePreference } from '../../../shell/themeContext';

/** Low utilization of a commitment is the risk (paying for unused capacity). */
const UTILIZATION_STATUS: MeterChartOptions['meter'] = {
  status: {
    ranges: [
      { range: [0, 70], status: 'danger' },
      { range: [70, 85], status: 'warning' },
      { range: [85, 100], status: 'success' },
    ],
  },
};

const EXPIRY_WARNING_DAYS = 90;

function CommitmentTile({ c, currency }: { c: CommitmentRow; currency: string }) {
  const { theme } = useThemePreference();
  const meter = (title: string, value: number, statuses: boolean): MeterChartOptions => ({
    meter: statuses ? UTILIZATION_STATUS : {},
    height: '2rem',
    theme,
    toolbar: { enabled: false },
    accessibility: { svgAriaLabel: `${title}: ${value.toFixed(0)}%` },
  });
  return (
    <Tile className="cc-commitment">
      <div className="cc-commitment__header">
        <div>
          <h3 className="cds--type-heading-compact-02">
            {c.provider} {c.type}
          </h3>
          <p className="cds--type-helper-text-01 cc-text-secondary">
            {formatCurrency(c.monthlyCommitment, currency)}/mo · expires{' '}
            {formatDate(c.expiresAt.slice(0, 10))}
          </p>
        </div>
        {c.daysToExpiry <= EXPIRY_WARNING_DAYS && (
          <Tag type="red" size="sm">
            {c.daysToExpiry} days left
          </Tag>
        )}
      </div>
      <MeterChart
        data={
          [{ group: 'Utilization', value: c.utilizationPercent }] as unknown as ChartTabularData
        }
        options={meter('Utilization', c.utilizationPercent, true)}
      />
      <MeterChart
        data={[{ group: 'Coverage', value: c.coveragePercent }] as unknown as ChartTabularData}
        options={meter('Coverage', c.coveragePercent, false)}
      />
    </Tile>
  );
}

export function CommitmentsSection({
  data,
  loading,
}: {
  data: UtilizationData | undefined;
  loading: boolean;
}) {
  return (
    <section className="cc-stack cc-stack--tight" aria-labelledby="commitments-heading">
      <div>
        <h2 id="commitments-heading" className="cds--type-heading-03">
          Commitments
        </h2>
        <p className="cds--type-body-01 cc-text-secondary">
          Reserved Instances, Savings Plans and CUDs are bought per cloud, so this shows every
          commitment for the clouds in scope. Utilization below 70% means paying for unused
          capacity.
        </p>
      </div>
      <div className="cc-commitment-grid">
        {loading || !data
          ? Array.from({ length: 3 }, (_, i) => (
              <SkeletonPlaceholder key={i} className="cc-commitment-skeleton" />
            ))
          : data.commitments.map((c) => (
              <CommitmentTile key={c.id} c={c} currency={data.currency} />
            ))}
      </div>
    </section>
  );
}
