import {
  InlineNotification,
  Layer,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Tile,
} from '@carbon/react';
import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { PageHeader } from '../../../components/PageHeader';
import { PageLayout } from '../../../components/PageLayout';
import { SECTION_LABELS, type AppSnapshot, type SectionId } from '../../../data/myCloudCompass';
import { useMyCloudCompass } from '../../../data/myCloudCompassContext';
import type { Signal } from '../../../data/signals';
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
import { SECTION_ATTENTION_TONE, signalTitle } from '../components/signalCopy';
import { useOpenInPillar } from '../hooks/useOpenInPillar';
import { useSelectedApp } from '../hooks/useSelectedApp';
import { TAB_IDS, useSelectedTab, type TabId } from '../hooks/useSelectedTab';

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
 * My CloudCompass (PRODUCT.md §5.1): the landing page for one application. An Overview tab with
 * the KPI strip and the adaptive "Needs attention" band, then one tab per pillar; a pillar tab
 * is flagged when the application's signals put it in the band.
 */
export function MyCloudCompassPage() {
  const { appId, selectApp, unknownApp } = useSelectedApp();
  const { tab, selectTab } = useSelectedTab();
  const { snapshot, signals, isPending, error } = useAppSnapshot(appId);
  const layout = useAdaptiveLayout(appId, signals, titleOf);
  const { toggleMute } = useMyCloudCompass();
  const openInPillar = useOpenInPillar(appId);
  const loading = isPending || !snapshot;
  const tabsRef = useRef<HTMLDivElement>(null);
  const focusTab = useRef(false);

  // "Go to … tab" on a signal card removes the card, so move focus to the newly selected tab.
  useEffect(() => {
    if (!focusTab.current) return;
    focusTab.current = false;
    const selected = tabsRef.current?.querySelector<HTMLElement>(
      '[role="tab"][aria-selected="true"]',
    );
    selected?.focus();
    selected?.scrollIntoView?.({ block: 'nearest' });
  }, [tab]);

  const showTab = useCallback(
    (section: SectionId) => {
      focusTab.current = true;
      selectTab(section);
    },
    [selectTab],
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

  const sectionContent = (id: SectionId, s: AppSnapshot): ReactNode => {
    switch (id) {
      case 'cost':
        return <CostSection snapshot={s} />;
      case 'utilization':
        return <UtilizationSection snapshot={s} />;
      case 'optimization':
        return <OptimizationSection snapshot={s} onOpen={openInPillar} />;
      case 'ai':
        return <AiSection snapshot={s} />;
      case 'anomalies':
        return <AnomaliesSection snapshot={s} onOpen={openInPillar} />;
    }
  };

  /** "Needs attention (n)" under a pillar tab's label, in the section's tone. */
  const tabLabel = (id: TabId) => {
    if (id === 'overview') return { label: 'Overview' };
    const s = layout?.sections[id];
    if (s?.state !== 'attention') return { label: SECTION_LABELS[id] };
    return {
      label: SECTION_LABELS[id],
      secondaryLabel: `Needs attention (${s.bandCount})`,
      className: `cc-app-tabs__tab--${SECTION_ATTENTION_TONE[id]}`,
    };
  };

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
      <div className="cc-app-tabs" ref={tabsRef}>
        <Tabs
          selectedIndex={TAB_IDS.indexOf(tab)}
          onChange={({ selectedIndex }) => selectTab(TAB_IDS[selectedIndex] ?? 'overview')}
        >
          <TabList contained fullWidth aria-label="My CloudCompass sections">
            {TAB_IDS.map((id) => {
              const { label, ...rest } = tabLabel(id);
              return (
                <Tab key={id} {...rest}>
                  {label}
                </Tab>
              );
            })}
          </TabList>
          <TabPanels>
            {TAB_IDS.map((id) => (
              <TabPanel key={id} className="cc-app-tabs__panel">
                {/* Only the selected tab renders, so hidden charts don't lay out at zero size. */}
                {id === tab && (
                  <Layer className="cc-stack">
                    {id === 'overview' ? (
                      <>
                        <AppKpiStrip snapshot={snapshot} loading={loading} />
                        <NeedsAttention
                          snapshot={snapshot}
                          layout={layout}
                          onOpen={openInPillar}
                          onToggleMute={(kind) => toggleMute(appId, kind)}
                          onShowTab={showTab}
                        />
                      </>
                    ) : (
                      snapshot && (
                        <AdaptiveSection
                          id={id}
                          layout={layout?.sections[id]}
                          attention={
                            layout?.band
                              .filter((b) => b.signal.section === id)
                              .map((b) => b.signal) ?? []
                          }
                          currency={snapshot.overview.currency}
                          quietSummary={quietSummary(id, snapshot)}
                          onOpen={openInPillar}
                        >
                          {sectionContent(id, snapshot)}
                        </AdaptiveSection>
                      )
                    )}
                  </Layer>
                )}
              </TabPanel>
            ))}
          </TabPanels>
        </Tabs>
      </div>
    </PageLayout>
  );
}
