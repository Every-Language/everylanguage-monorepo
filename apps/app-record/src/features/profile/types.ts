import type { Database } from '@everylanguage/shared-types';

// User profile from public.users table
export type UserProfile = Database['public']['Tables']['users']['Row'];

// Extended user profile with display name helper
export interface UserProfileDisplay {
  profile: UserProfile | null;
  displayName: string;
  email: string;
  phoneNumber: string | null;
  createdAt: string | null;
}
