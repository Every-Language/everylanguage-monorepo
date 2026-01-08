import type { BibleTrack } from '../types';

class TrackCacheService {
  private static instance: TrackCacheService;
  private cache = new Map<string, BibleTrack>();

  static getInstance(): TrackCacheService {
    if (!TrackCacheService.instance) {
      TrackCacheService.instance = new TrackCacheService();
    }
    return TrackCacheService.instance;
  }

  get(id: string): BibleTrack | undefined {
    return this.cache.get(id);
  }

  set(id: string, track: BibleTrack): void {
    this.cache.set(id, track);
  }

  has(id: string): boolean {
    return this.cache.has(id);
  }

  clear(): void {
    this.cache.clear();
  }
}

export const trackCacheService = TrackCacheService.getInstance();
