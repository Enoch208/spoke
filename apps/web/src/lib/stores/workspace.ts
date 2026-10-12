import { create } from "zustand";
import { persist } from "zustand/middleware";
import { localJsonStorage } from "./storage";

export const workspaces = ["earn", "sell"] as const;
export type Workspace = (typeof workspaces)[number];

type WorkspaceState = {
  workspace: Workspace;
  sidebarCollapsed: boolean;
  setWorkspace: (workspace: Workspace) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
};

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      workspace: "earn",
      sidebarCollapsed: false,
      setWorkspace: (workspace) => {
        set({ workspace });
      },
      setSidebarCollapsed: (sidebarCollapsed) => {
        set({ sidebarCollapsed });
      },
      toggleSidebar: () => {
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
      },
    }),
    {
      name: "spoke-workspace",
      version: 1,
      storage: localJsonStorage,
      skipHydration: true,
      partialize: ({ workspace, sidebarCollapsed }) => ({ workspace, sidebarCollapsed }),
    },
  ),
);

export const workspaceForPath = (pathname: string): Workspace | null => {
  if (pathname === "/sell" || pathname.startsWith("/sell/")) return "sell";
  if (pathname === "/earn" || pathname.startsWith("/earn/")) return "earn";
  return null;
};
