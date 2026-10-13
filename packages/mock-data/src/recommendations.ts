import type {
  DismissReason,
  Environment,
  Level,
  Recommendation,
  RecommendationStatus,
  RecommendationType,
  ResourceUtilization,
} from '@cloudcompass/types';
import { CURRENCY, accountFor, applicationById } from './catalog';
import type { Workload } from './cost';
import { addDays, iso, parseDay } from './dates';
import { createRng, round2 } from './random';

const STATUSES: readonly RecommendationStatus[] = [
  'Open',
  'Open',
  'Open',
  'Accepted',
  'Snoozed',
  'Dismissed',
  'Implemented',
  'Implemented',
];

const DISMISS_REASONS: readonly DismissReason[] = [
  'Not applicable',
  'Risk too high',
  'Already planned',
  'Incorrect data',
];

/** Owner of commitment purchases, which are bought centrally. */
export const FINOPS_TEAM = 'Cloud FinOps team';

interface RecInput {
  type: RecommendationType;
  title: string;
  description: string;
  provider: Recommendation['provider'];
  resourceId: string;
  applicationId: string;
  environment: Environment;
  savings: number;
  effort: Level;
  risk: Level;
}

export function generateRecommendations(
  seed: number,
  endDate: string,
  workloads: readonly Workload[],
  utilization: readonly ResourceUtilization[],
): Recommendation[] {
  const rng = createRng(seed);
  const end = parseDay(endDate);
  const recs: Recommendation[] = [];

  const add = (input: RecInput): void => {
    const status = rng.pick(STATUSES);
    const monthly = round2(input.savings);
    const application = applicationById(input.applicationId);
    // Older recommendations exist so the savings ledger has history.
    // Implemented ones need time to have been worked on.
    const ageDays = status === 'Implemented' ? rng.int(21, 330) : rng.int(0, 330);
    const created = addDays(end, -ageDays);
    const team = input.type === 'Commitment purchase' ? FINOPS_TEAM : `${application.name} team`;
    const owner = status === 'Open' && rng.chance(0.5) ? null : team;
    const implemented =
      status === 'Implemented' ? addDays(created, Math.min(ageDays - 3, rng.int(7, 60))) : null;
    recs.push({
      id: `rec-${recs.length + 1}`,
      type: input.type,
      title: input.title,
      description: input.description,
      provider: input.provider,
      resourceId: input.resourceId,
      lobId: application.lobId,
      applicationId: input.applicationId,
      environment: input.environment,
      accountId: accountFor(input.applicationId, input.environment).id,
      estimatedMonthlySavings: monthly,
      currency: CURRENCY,
      effort: input.effort,
      risk: input.risk,
      status,
      createdAt: iso(created),
      owner,
      implementedAt: implemented ? iso(implemented) : null,
      realizedMonthlySavings:
        status === 'Implemented' ? round2(monthly * rng.range(0.7, 1.05)) : null,
      snoozedUntil: status === 'Snoozed' ? iso(addDays(end, rng.int(7, 75))) : null,
      dismissReason: status === 'Dismissed' ? rng.pick(DISMISS_REASONS) : null,
    });
  };

  for (const u of utilization) {
    const base = {
      provider: u.provider,
      resourceId: u.resourceId,
      applicationId: u.applicationId,
      environment: u.environment,
    };
    if (u.idleReason === 'Low CPU utilization' || u.idleReason === 'Stopped instance') {
      add({
        ...base,
        type: 'Idle cleanup',
        title: `Terminate idle ${u.resourceType.toLowerCase()} ${u.resourceName}`,
        description: `Average CPU ${u.avgCpuPercent}% over 30 days.`,
        savings: u.monthlyCost * 0.95,
        effort: 'Low',
        risk: u.environment === 'PROD' ? 'Medium' : 'Low',
      });
    } else if (u.idleReason) {
      add({
        ...base,
        type: 'Idle cleanup',
        title: `Remove ${u.idleReason.toLowerCase()}: ${u.resourceName}`,
        description: `${u.idleReason} detected.`,
        savings: u.monthlyCost * rng.range(0.2, 0.6),
        effort: 'Low',
        risk: 'Low',
      });
    } else if (u.avgCpuPercent > 0 && u.avgCpuPercent < 30) {
      add({
        ...base,
        type: 'Rightsize',
        title: `Rightsize ${u.resourceName} to a smaller size`,
        description: `Average CPU ${u.avgCpuPercent}%, memory ${u.avgMemoryPercent}%.`,
        savings: u.monthlyCost * rng.range(0.25, 0.5),
        effort: 'Medium',
        risk: 'Low',
      });
    }
  }

  for (const w of workloads) {
    const base = {
      provider: w.application.provider,
      resourceId: w.resourceId,
      applicationId: w.application.id,
      environment: w.environment,
    };
    if (w.service.committable && w.pricing === 'Standard' && w.environment === 'PROD') {
      add({
        ...base,
        type: 'Commitment purchase',
        title: `Cover ${w.service.name} for ${w.application.name} with a 1-year commitment`,
        description: `Steady on-demand usage in ${w.regionId}.`,
        savings: w.dailyBase * 30 * 0.28,
        effort: 'Low',
        risk: 'Medium',
      });
    }
    if (w.service.category === 'Storage' && rng.chance(0.4)) {
      add({
        ...base,
        type: 'Storage tiering',
        title: `Move cold data in ${w.resourceName} to an infrequent-access tier`,
        description: '60% of objects not accessed in 90 days.',
        savings: w.dailyBase * 30 * rng.range(0.15, 0.4),
        effort: 'Low',
        risk: 'Low',
      });
    }
    if (w.service.category === 'Compute' && w.environment !== 'PROD' && rng.chance(0.5)) {
      add({
        ...base,
        type: 'Spot adoption',
        title: `Run ${w.resourceName} on spot / preemptible capacity`,
        description: 'Non-production, interruption-tolerant workload.',
        savings: w.dailyBase * 30 * 0.6,
        effort: 'Medium',
        risk: 'Medium',
      });
    }
  }

  const ai = (
    type: RecommendationType,
    title: string,
    description: string,
    applicationId: string,
    resourceId: string,
    min: number,
    max: number,
    effort: Level,
  ): void =>
    add({
      type,
      title,
      description,
      provider: 'AI',
      resourceId,
      applicationId,
      environment: 'PROD',
      savings: rng.range(min, max),
      effort,
      risk: effort,
    });

  ai(
    'AI model downgrade',
    'Route Fraud Detection case summaries to a smaller model',
    'Quality evals show parity with the large model for this task.',
    'app-fraud-detection',
    'ai:fraud-detection:case-summaries',
    4_000,
    12_000,
    'Medium',
  );
  ai(
    'AI prompt caching',
    'Enable prompt caching for the Mobile Banking chat assistant',
    'System prompt is identical across 92% of requests.',
    'app-mobile-banking',
    'ai:mobile-banking:chat-assistant',
    2_000,
    8_000,
    'Low',
  );
  ai(
    'AI prompt caching',
    'Enable prompt caching for Data Platform SQL generation',
    'Schema context is repeated on every request.',
    'app-data-platform',
    'ai:data-platform:sql-generation',
    1_500,
    6_000,
    'Low',
  );

  return recs;
}
