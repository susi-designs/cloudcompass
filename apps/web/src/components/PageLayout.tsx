import type { ReactNode } from 'react';
import { PageHeader } from './PageHeader';
import { ScopeFilterBar } from './ScopeFilterBar';

interface PageLayoutProps {
  title: string;
  description?: ReactNode;
  children: ReactNode;
}

/** Standard page frame: header + global scope filters + content. */
export function PageLayout({ title, description, children }: PageLayoutProps) {
  return (
    <div className="cc-page">
      <PageHeader title={title} description={description} />
      <ScopeFilterBar />
      {children}
    </div>
  );
}
