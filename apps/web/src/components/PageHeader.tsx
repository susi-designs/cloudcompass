import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: ReactNode;
}

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <header className="cc-page-header">
      <h1 className="cds--type-heading-05">{title}</h1>
      {description && <p className="cds--type-body-01 cc-text-secondary">{description}</p>}
    </header>
  );
}
