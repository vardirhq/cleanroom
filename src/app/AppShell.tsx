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
    <div className="h-screen overflow-hidden bg-background text-text">
      <div className="app-shell flex h-full flex-col overflow-hidden lg:flex-row">
        <Sidebar
          activePage={activePage}
          items={navItems}
          onSelectPage={onSelectPage}
        />
        <div className="app-shell__body flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <Titlebar
            bootstrapError={bootstrapError}
            bootstrapStatus={bootstrapStatus}
            deviceSelectionRequired={deviceSelectionRequired}
            deviceStatus={deviceStatus}
            metadataProgress={metadataProgress}
            onRefresh={onRefresh}
          />
          <main className="workspace-scroll">{children}</main>
        </div>
      </div>
    </div>
  );
}
