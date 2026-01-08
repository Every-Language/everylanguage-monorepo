import type { AudioVersion, TextVersion } from './entities';

// Component Props Types

// Version List Item (used in new modals)
export interface VersionListItemProps {
  version: AudioVersion | TextVersion;
  isSelected: boolean;
  onSelect: (version: AudioVersion | TextVersion) => void;
  onRemove?: (versionId: string) => void;
  showRemoveButton?: boolean;
}
