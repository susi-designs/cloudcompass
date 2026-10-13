import {
  ChartLineData,
  Dashboard,
  Meter,
  MachineLearningModel,
  Idea,
  WarningAlt,
  type CarbonIconType,
} from '@carbon/icons-react';

export interface NavItem {
  path: string;
  label: string;
  icon: CarbonIconType;
  /** Milestone that delivers the page (CLAUDE.md §6). */
  milestone: 'M1' | 'M2' | 'M3' | 'M4' | 'M5' | 'M6';
  description: string;
}

/** Overview + the five product pillars (PRODUCT.md §4). */
export const NAV_ITEMS: readonly NavItem[] = [
  {
    path: '/',
    label: 'Overview',
    icon: Dashboard,
    milestone: 'M1',
    description: 'Executive summary of cloud and AI spend.',
  },
  {
    path: '/cost-usage',
    label: 'Cost & Usage',
    icon: ChartLineData,
    milestone: 'M2',
    description: 'Cost Explorer with group-by, drill-down and budgets.',
  },
  {
    path: '/utilization',
    label: 'Utilization',
    icon: Meter,
    milestone: 'M3',
    description: 'Resource utilization, idle resources and commitment coverage.',
  },
  {
    path: '/ai-spend',
    label: 'AI Spend',
    icon: MachineLearningModel,
    milestone: 'M4',
    description: 'LLM and GPU spend by provider, model, application and feature.',
  },
  {
    path: '/optimization',
    label: 'Optimization',
    icon: Idea,
    milestone: 'M5',
    description: 'Recommendations inbox and savings ledger.',
  },
  {
    path: '/anomalies',
    label: 'Anomalies',
    icon: WarningAlt,
    milestone: 'M6',
    description: 'Cost anomaly feed with severity and root-cause hints.',
  },
];
