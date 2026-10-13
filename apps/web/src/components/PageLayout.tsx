import type { ReactNode } from 'react';
import { PageHeader } from './PageHeader';
import { ScopeFilterBar } from './ScopeFilterBar';

interface PageLayoutProps {
  title: string;
  description?: ReactNode;
  /** Filters shown under the header; `application` keeps only date range and environment. */
  filters?: 'full' | 'application';
  /** Content between the header and the filters, e.g. an application switcher. */
  headerExtra?: ReactNode;
  children: ReactNode;
}

/** Standard page frame: header + global scope filters + content. */
export function PageLayout({
  title,
  description,
  filters = 'full',
  headerExtra,
  children,
}: PageLayoutProps) {
  return (
    <div className="cc-page">
      <PageHeader title={title} description={description} />
      {headerExtra}
      <ScopeFilterBar variant={filters} />
      {children}
    </div>
  );
}
