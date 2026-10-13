import { Breadcrumb, BreadcrumbItem } from '@carbon/react';
import type { DrillCrumb } from '../../../data/explorer';

interface Props {
  crumbs: DrillCrumb[];
  onSelect: (crumb: DrillCrumb) => void;
}

/** Where you are in the LOB → Application → Environment → Account drill path. */
export function DrillBreadcrumb({ crumbs, onSelect }: Props) {
  return (
    <Breadcrumb noTrailingSlash aria-label="Drill-down path" className="cc-drill-breadcrumb">
      {crumbs.map((crumb, i) => {
        const current = i === crumbs.length - 1;
        return (
          <BreadcrumbItem
            key={`${i}-${crumb.label}`}
            isCurrentPage={current}
            href={current ? undefined : '#'}
            onClick={(e: React.MouseEvent) => {
              if (current) return;
              e.preventDefault();
              onSelect(crumb);
            }}
          >
            {crumb.label}
          </BreadcrumbItem>
        );
      })}
    </Breadcrumb>
  );
}
