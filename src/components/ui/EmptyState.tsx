import type { ReactNode } from "react";

type EmptyStateProps = {
  action?: ReactNode;
  description: string;
  title: string;
};

export function EmptyState({ action, description, title }: EmptyStateProps) {
  return (
    <div className="glass-panel rounded-[24px] p-6 text-center">
      <h3 className="text-lg font-semibold text-text">{title}</h3>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-text-muted">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
