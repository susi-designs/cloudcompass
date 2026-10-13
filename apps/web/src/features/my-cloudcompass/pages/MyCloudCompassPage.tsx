import { InlineNotification, Layer, Tile } from '@carbon/react';
import { useCallback } from 'react';
import { PageHeader } from '../../../components/PageHeader';
import { PageLayout } from '../../../components/PageLayout';
import type { AppSnapshot, SectionId } from '../../../data/myCloudCompass';
import { useMyCloudCompass } from '../../../data/myCloudCompassContext';
import type { SectionLayout, Signal } from '../../../data/signals';
import { useAdaptiveLayout, useAppSnapshot } from '../../../data/useAppSnapshot';
import {
  formatCurrency,
  formatDate,
  formatPercent,
  formatPercentChange,
} from '../../../lib/format';
import { AdaptiveSection } from '../components/AdaptiveSection';
import { AiSection } from '../components/AiSection';
import { AnomaliesSection } from '../components/AnomaliesSection';
import { AppDetails } from '../components/AppDetails';
import { AppKpiStrip } from '../components/AppKpiStrip';
import { AppSwitcher } from '../components/AppSwitcher';
import { CostSection } from '../components/CostSection';
import { NeedsAttention } from '../components/NeedsAttention';
import { OptimizationSection } from '../components/OptimizationSection';
import { UtilizationSection } from '../components/UtilizationSection';
import { signalTitle } from '../components/signalCopy';
import { useOpenInPillar } from '../hooks/useOpenInPillar';
import { useSelectedApp } from '../hooks/useSelectedApp';

/** One line per section for its quiet ("All clear") state. */
function quietSummary(id: SectionId, s: AppSnapshot): string {
  const c = s.overview.currency;
  const money = (v: number) => formatCurrency(v, c, 'compact');
  switch (id) {
    case 'cost':
      return s.budget
        ? `On track: month-end forecast is ${formatPercent(s.budget.forecastPercent)} of budget, ${money(s.overview.mtd.value)} spent this month.`
        : `${money(s.overview.mtd.value)} spent this month.`;
    case 'utilization': {
      const k = s.utilization.kpis;
      return `No idle-resource or coverage alerts. Average CPU ${k.avgCpu == null ? '—' : formatPercent(k.avgCpu)}, ${k.idleCount} idle resources.`;
    }
    case 'ai': {
      const k = s.aiSpend.kpis;
      return k.total === 0
        ? 'No AI usage in the selected period.'
        : `${money(k.total)} AI spend in the selected period${k.changePercent == null ? '' : `, ${formatPercentChange(k.changePercent)} vs. the previous period`}.`;
    }
    case 'optimization':
      return `No open recommendations. ${money(s.optimization.kpis.realizedRunRate)}/mo already realized.`;
    case 'anomalies':
      return `No anomalies need triage. ${s.resolvedLast30Days} resolved in the last 30 days.`;
  }
}

const titleOf = (signal: Signal) => signalTitle(signal);

/**
 * My CloudCompass (PRODUCT.md §5.1): the landing page for one application, with an adaptive
 * "Needs attention" band and pillar sections whose emphasis follows the application's signals.
 */
export function MyCloudCompassPage() {
  const { appId, selectApp, unknownApp } = useSelectedApp();
  const { snapshot, signals, isPending, error } = useAppSnapshot(appId);
  const layout = useAdaptiveLayout(appId, signals, titleOf);
  const { togglePin, toggleMute } = useMyCloudCompass();
  const openInPillar = useOpenInPillar(appId);
  const loading = isPending || !snapshot;

  const onTogglePin = useCallback(
    (section: SectionId) => appId && togglePin(appId, section),
    [appId, togglePin],
  );

  if (!appId) {
    return (
      <div className="cc-page">
        <PageHeader
          title="My CloudCompass"
          description="Your application's cost, utilization, AI spend, savings and anomalies on one page."
        />
        {unknownApp && (
          <InlineNotification
            kind="warning"
            title="Application not found"
            subtitle="The link points to an application that doesn't exist. Pick one below."
            hideCloseButton
          />
        )}
        <Tile className="cc-empty cc-empty--start">
          <h2 className="cds--type-heading-03">Choose your application</h2>
          <p className="cds--type-body-01 cc-text-secondary">
            Pick the application you own or follow. It becomes your default, and this page will open
            on it next time. You can add more applications and switch between them at any time.
          </p>
          <Layer>
            <AppSwitcher appId={null} onSelect={selectApp} />
          </Layer>
        </Tile>
      </div>
    );
  }

  const section = (id: SectionId): SectionLayout | undefined => layout?.sections[id];
  const sectionProps = (id: SectionId) => ({
    id,
    layout: section(id),
    quietSummary: snapshot ? quietSummary(id, snapshot) : '',
    onTogglePin: () => onTogglePin(id),
    onOpen: (pathname: string) => openInPillar(pathname),
  });

  return (
    <PageLayout
      title="My CloudCompass"
      description={
        snapshot
          ? `${snapshot.application.name} · ${snapshot.lob} · ${snapshot.application.provider} · data as of ${formatDate(snapshot.overview.asOf)}`
          : 'Loading application…'
      }
      filters="application"
      headerExtra={
        <div className="cc-stack cc-stack--tight">
          <AppSwitcher appId={appId} onSelect={selectApp} />
          <AppDetails snapshot={snapshot} />
        </div>
      }
    >
      {error && (
        <InlineNotification
          kind="error"
          title="Couldn't load data"
          subtitle={error.message}
          hideCloseButton
        />
      )}
      <AppKpiStrip snapshot={snapshot} loading={loading} />
      <NeedsAttention
        snapshot={snapshot}
        layout={layout}
        onOpen={openInPillar}
        onToggleMute={(kind) => toggleMute(appId, kind)}
      />
      {snapshot && (
        <>
          <AdaptiveSection {...sectionProps('cost')}>
            <CostSection snapshot={snapshot} />
          </AdaptiveSection>
          <AdaptiveSection {...sectionProps('utilization')} attentionTone="blue">
            <UtilizationSection snapshot={snapshot} />
          </AdaptiveSection>
          <AdaptiveSection {...sectionProps('ai')}>
            <AiSection snapshot={snapshot} />
          </AdaptiveSection>
          <AdaptiveSection {...sectionProps('optimization')} attentionTone="blue">
            <OptimizationSection snapshot={snapshot} onOpen={openInPillar} />
          </AdaptiveSection>
          <AdaptiveSection {...sectionProps('anomalies')}>
            <AnomaliesSection snapshot={snapshot} onOpen={openInPillar} />
          </AdaptiveSection>
        </>
      )}
    </PageLayout>
  );
}
