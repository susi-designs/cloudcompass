import { InlineNotification } from '@carbon/react';
import { useCallback } from 'react';
import { DRILL_NEXT, drillScope, type DrillCrumb, type ExplorerRow } from '../../../data/explorer';
import { useScope } from '../../../data/scopeContext';
import { useExplorer } from '../../../data/useExplorer';
import { useExplorerSettings } from '../hooks/useExplorerSettings';
import { DrillBreadcrumb } from './DrillBreadcrumb';
import { ExplorerChart } from './ExplorerChart';
import { ExplorerControls } from './ExplorerControls';
import { ExplorerSummary } from './ExplorerSummary';
import { ExplorerTable } from './ExplorerTable';

/** Cost Explorer (PRODUCT.md §4.1, CLAUDE.md §6 M2): group-by, drill-down, chart + table. */
export function CostExplorer() {
  const [settings, updateSettings] = useExplorerSettings();
  const { data, crumbs, isPending, error } = useExplorer(settings);
  const { setScope } = useScope();
  const loading = isPending || !data;

  const onDrill = useCallback(
    (row: ExplorerRow) => {
      const next = DRILL_NEXT[settings.groupBy];
      if (!next) return;
      setScope(drillScope(settings.groupBy, row.id));
      updateSettings({ groupBy: next });
    },
    [settings.groupBy, setScope, updateSettings],
  );

  const onCrumb = useCallback(
    (crumb: DrillCrumb) => {
      setScope(crumb.scope);
      updateSettings({ groupBy: crumb.groupBy });
    },
    [setScope, updateSettings],
  );

  return (
    <div className="cc-stack">
      {error && (
        <InlineNotification
          kind="error"
          title="Couldn't load cost data"
          subtitle={error.message}
          hideCloseButton
        />
      )}
      <div className="cc-explorer-header">
        <ExplorerControls settings={settings} onChange={updateSettings} />
        <DrillBreadcrumb crumbs={crumbs} onSelect={onCrumb} />
      </div>
      <ExplorerSummary data={data} settings={settings} loading={loading} />
      <ExplorerChart data={data} settings={settings} loading={loading} />
      <ExplorerTable data={data} settings={settings} loading={loading} onDrill={onDrill} />
    </div>
  );
}
