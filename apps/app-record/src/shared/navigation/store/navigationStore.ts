import { create } from 'zustand';

export type TabRoute = 'projects' | 'record' | 'publish' | 'menu';

interface NavigationState {
  activeTab: TabRoute;
  setActiveTab: (tab: TabRoute) => void;
}

export const useNavigationStore = create<NavigationState>(set => ({
  activeTab: 'projects',
  setActiveTab: (tab: TabRoute) => set({ activeTab: tab }),
}));
