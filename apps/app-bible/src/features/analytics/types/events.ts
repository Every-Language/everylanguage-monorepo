export interface ChapterListenEvent {
  chapterId: string;
  languageEntityId?: string | null;
}

export interface MediaFileListenEvent {
  mediaFileId: string;
}
