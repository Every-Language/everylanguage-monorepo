import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SidebarState {
  isCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    set => ({
      isCollapsed: false,
      toggleSidebar: () => set(state => ({ isCollapsed: !state.isCollapsed })),
      setSidebarCollapsed: (collapsed: boolean) =>
        set({ isCollapsed: collapsed }),
    }),
    {
      name: 'sidebar-state',
    }
  )
);

// Convenience hooks
export const useSidebarCollapsed = () =>
  useSidebarStore(state => state.isCollapsed);
export const useToggleSidebar = () =>
  useSidebarStore(state => state.toggleSidebar);
