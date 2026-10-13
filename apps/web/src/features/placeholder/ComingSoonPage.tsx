import { Tile } from '@carbon/react';
import { PageLayout } from '../../components/PageLayout';
import type { NavItem } from '../../app/navigation';

/** Placeholder for pillars delivered in later milestones (CLAUDE.md §6). */
export function ComingSoonPage({ item }: { item: NavItem }) {
  return (
    <PageLayout title={item.label} description={item.description}>
      <Tile className="cc-coming-soon">
        <h2 className="cds--type-heading-03">Coming in {item.milestone}</h2>
        <p className="cds--type-body-01 cc-text-secondary">
          This page is part of milestone {item.milestone}. The scope filters above already apply and
          will carry over when it ships.
        </p>
      </Tile>
    </PageLayout>
  );
}
