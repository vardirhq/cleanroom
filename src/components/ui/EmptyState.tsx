import type { ReactNode } from "react";

type EmptyStateProps = {
  action?: ReactNode;
  description: string;
  title: string;
};

export function EmptyState({ action, description, title }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <p className="section-kicker">Workstation state</p>
      <h3 className="empty-state__title">{title}</h3>
      <p className="empty-state__copy">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
