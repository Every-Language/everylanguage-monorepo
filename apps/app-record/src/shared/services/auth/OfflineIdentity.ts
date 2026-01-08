import AsyncStorage from '@react-native-async-storage/async-storage';
import { powerSyncSystem } from '@/shared/services/powersync/PowerSyncSystem';

const OFFLINE_USER_ID_KEY = 'offline_user_id_v1';

async function generateUuid(): Promise<string> {
  // Lightweight UUID v4 generator
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g: any = global;
  if (g?.crypto?.randomUUID) return g.crypto.randomUUID();
  const rnd = () =>
    Math.floor(Math.random() * 0xffffffff)
      .toString(16)
      .padStart(8, '0');
  return `${rnd().slice(0, 8)}-${rnd().slice(0, 4)}-${rnd().slice(0, 4)}-${rnd().slice(0, 4)}-${rnd()}`;
}

export async function getOfflineUserId(): Promise<string> {
  try {
    const existing = await AsyncStorage.getItem(OFFLINE_USER_ID_KEY);
    if (existing) return existing;
    const id = await generateUuid();
    await AsyncStorage.setItem(OFFLINE_USER_ID_KEY, id);
    return id;
  } catch {
    // Best-effort fallback
    return await generateUuid();
  }
}

/**
 * Returns a best-effort target user id for local writes.
 * Priority:
 * 1) user_current_selections.user_id (if present)
 * 2) Supabase session user id (caller may pass if already known)
 * 3) offline_user_id (device-scoped)
 */
export async function resolveTargetUserId(
  sessionUserId?: string | null
): Promise<string> {
  try {
    if (powerSyncSystem.isInitialized) {
      const row = await powerSyncSystem.get(
        'SELECT user_id FROM user_current_selections LIMIT 1'
      );
      const uid = (row?.user_id as string | null) ?? null;
      if (uid) return uid;
    }
  } catch {
    // ignore
  }
  if (sessionUserId) return sessionUserId;
  return await getOfflineUserId();
}
