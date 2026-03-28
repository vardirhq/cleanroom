import { ShieldAlert } from "lucide-react";
import type { NavItem, NavItemId } from "../../types/app";

type SidebarProps = {
  activePage: NavItemId;
  items: NavItem[];
  onSelectPage: (page: NavItemId) => void;
};

export function Sidebar({ activePage, items, onSelectPage }: SidebarProps) {
  return (
    <aside className="app-shell__rail border-b border-line lg:h-full lg:overflow-y-auto lg:border-b-0">
      <div className="sidebar">
        <div className="sidebar__brand">
          <div className="sidebar__brand-mark">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <p className="sidebar__eyebrow">Cleanroom</p>
            <h1 className="sidebar__title">Support Workbench</h1>
            <p className="sidebar__caption">Android remediation desk</p>
          </div>
        </div>

        <nav className="sidebar__nav">
          {items.map((item) => {
            const active = item.id === activePage;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                className={`sidebar__nav-button ${
                  active ? "sidebar__nav-button--active" : ""
                }`}
                onClick={() => onSelectPage(item.id)}
                type="button"
              >
                <span className="sidebar__nav-icon">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar__footer">
          <div className="rail-card">
            <p className="rail-card__label">Workflow mode</p>
            <p className="rail-card__value">Single-device technician review</p>
            <p className="rail-card__copy">
              Cleanroom keeps device targeting explicit, risky removals
              reviewable, and session reporting local to the workstation.
            </p>
          </div>

          <div className="rail-card">
            <p className="rail-card__label">Operator rule</p>
            <p className="rail-card__copy">
              Use the scan table as the source of truth, then carry only
              reviewed packages into cleanup.
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
