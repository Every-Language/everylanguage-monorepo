import { VerseWithText } from '@/features/bible';
import { Tables } from '@everylanguage/shared-types';

export type Playlist = Tables<'playlists'>;
export type PlaylistItem = Tables<'playlist_items'>;
export type PlaylistItemWithVerses = Tables<'playlist_items'> & {
  title?: string;
  verses: VerseWithText[];
};

export type UserPlaylist = Tables<'user_playlists'>;
export type UserPlaylistGroup = Tables<'user_playlist_groups'>;
export interface PlaylistFormData {
  title: string;
  description?: string;
}
export interface PlaylistWithItems extends Playlist {
  items: PlaylistItem[];
  totalDuration: number;
  itemCount: number;
  audioVersionId: string;
}

export interface PlaylistsState {
  playlists: PlaylistWithItems[];
  currentPlaylist: PlaylistWithItems | null;
  loading: boolean;
  error: string | null;
}

// Nuevos tipos para manejar playlist items en el sistema de audio
export interface PlaylistItemQueueRef {
  playlistItemId: string;
  startVerseId: string;
  endVerseId: string;
  chapterId: string;
  audioVersionId?: string;
  textVersionId?: string;
}

export interface VerseRangeOptions {
  preferOffline?: boolean;
  audioVersionId?: string;
  textVersionId?: string;
  languageEntityId?: string;
  startVerseId: string;
  endVerseId: string;
}
