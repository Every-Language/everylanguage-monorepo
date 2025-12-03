import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export type MapSelection =
  | { kind: 'language_entity'; id: string; coordinates?: [number, number] }
  | { kind: 'region'; id: string }
  | { kind: 'project'; id: string }
  | { kind: 'people_group'; id: string; coordinates?: [number, number] };

export type SelectionMode = 'language' | 'region' | 'people_group';

type InspectorState = {
  selection: MapSelection | null;
  selectionMode: SelectionMode;
  setSelection: (
    sel: MapSelection,
    opts?: { pushRoute?: boolean; focusMap?: boolean }
  ) => void;
  setSelectionMode: (mode: SelectionMode) => void;
  clear: () => void;
};

type InspectorInternal = {
  // Used by RouteSync to avoid navigation loops
  lastUpdateFromRoute: boolean;
  setLastUpdateFromRoute: (v: boolean) => void;
};

export const useInspectorStore = create<InspectorState & InspectorInternal>()(
  devtools(
    set => ({
      selection: null,
      selectionMode: 'language',
      lastUpdateFromRoute: false,
      setLastUpdateFromRoute: (v: boolean) => set({ lastUpdateFromRoute: v }),
      setSelection: sel => set({ selection: sel }),
      setSelectionMode: (mode: SelectionMode) =>
        set({ selectionMode: mode, selection: null }),
      clear: () => set({ selection: null }),
    }),
    { name: 'map-inspector-store' }
  )
);

export const useSelection = () => useInspectorStore(s => s.selection);
export const useSetSelection = () => useInspectorStore(s => s.setSelection);
export const useClearSelection = () => useInspectorStore(s => s.clear);
export const useSelectionMode = () => useInspectorStore(s => s.selectionMode);
export const useSetSelectionMode = () =>
  useInspectorStore(s => s.setSelectionMode);
export const useLastUpdateFromRoute = () =>
  useInspectorStore(s => s.lastUpdateFromRoute);
export const useSetLastUpdateFromRoute = () =>
  useInspectorStore(s => s.setLastUpdateFromRoute);
