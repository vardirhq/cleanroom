import type { PropsWithChildren } from "react";
import { Sidebar } from "../components/layout/Sidebar";
import { Titlebar } from "../components/layout/Titlebar";
import type { NavItem, NavItemId } from "../types/app";

type AppShellProps = PropsWithChildren<{
  activePage: NavItemId;
  bootstrapStatus: "idle" | "loading" | "ready" | "error";
  bootstrapError: string | null;
  deviceSelectionRequired: boolean;
  deviceStatus: "disconnected" | "unauthorized" | "ready" | null;
  metadataProgress: {
    completed: number;
    inFlight: boolean;
    total: number;
  };
  navItems: NavItem[];
  onRefresh: () => void;
  onSelectPage: (page: NavItemId) => void;
}>;

export function AppShell({
  activePage,
  bootstrapError,
  bootstrapStatus,
  children,
  deviceSelectionRequired,
  deviceStatus,
  metadataProgress,
  navItems,
  onRefresh,
  onSelectPage,
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-background text-text">
      <div className="app-shell flex min-h-screen flex-col overflow-hidden lg:flex-row">
        <Sidebar
          activePage={activePage}
          items={navItems}
          onSelectPage={onSelectPage}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <Titlebar
            bootstrapError={bootstrapError}
            bootstrapStatus={bootstrapStatus}
            deviceSelectionRequired={deviceSelectionRequired}
            deviceStatus={deviceStatus}
            metadataProgress={metadataProgress}
            onRefresh={onRefresh}
          />
          <main className="flex-1 overflow-y-auto px-4 pb-5 pt-4 lg:px-7 lg:pb-7 lg:pt-5 xl:px-9">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
