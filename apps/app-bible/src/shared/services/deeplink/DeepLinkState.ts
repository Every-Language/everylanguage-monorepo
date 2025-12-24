export type DeepLinkInfo = {
  type: 'verse' | 'chapter' | 'book';
  entityId: string;
  shareId?: string | undefined;
  shareType?: 'audio' | 'text';
} | null;

let lastDeepLinkInfo: DeepLinkInfo = null;

export const DeepLinkState = {
  set(info: DeepLinkInfo) {
    lastDeepLinkInfo = info;
  },
  get(): DeepLinkInfo {
    return lastDeepLinkInfo;
  },
  clear() {
    lastDeepLinkInfo = null;
  },
};
