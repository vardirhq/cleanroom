import { ShieldAlert } from "lucide-react";
import type { NavItem, NavItemId } from "../../types/app";

type SidebarProps = {
  activePage: NavItemId;
  items: NavItem[];
  onSelectPage: (page: NavItemId) => void;
};

export function Sidebar({ activePage, items, onSelectPage }: SidebarProps) {
  return (
    <aside className="border-b border-line bg-sidebar px-4 py-4 lg:w-[272px] lg:border-b-0 lg:border-r lg:px-5 lg:py-5">
      <div className="flex items-center gap-3 px-2 py-1">
        <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-primary-strong/14 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
          <ShieldAlert className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-text-muted">
            Cleanroom
          </p>
          <h1 className="text-[1.05rem] font-semibold text-text">
            Support Workbench
          </h1>
        </div>
      </div>

      <nav className="mt-6 grid gap-2">
        {items.map((item) => {
          const active = item.id === activePage;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              className={`flex items-center gap-3 rounded-[18px] px-3.5 py-3 text-left transition ${
                active
                  ? "border border-primary/24 bg-primary/12 text-text shadow-[0_10px_24px_rgba(59,130,246,0.12)]"
                  : "border border-transparent text-text-muted hover:border-line hover:bg-surface-soft hover:text-text"
              }`}
              onClick={() => onSelectPage(item.id)}
              type="button"
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] ${
                  active
                    ? "bg-primary-strong/16 text-primary"
                    : "bg-surface-soft text-text-muted"
                }`}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="mt-6 rounded-[24px] border border-line bg-sidebar-panel px-4 py-4">
        <p className="text-[11px] uppercase tracking-[0.22em] text-text-muted">
          Operator posture
        </p>
        <div className="mt-3 grid gap-2 text-sm text-text-muted">
          <p>Single-device review with visible risk explanations.</p>
          <p>Cleanup remains human-approved even when evidence is strong.</p>
        </div>
      </div>
    </aside>
  );
}
