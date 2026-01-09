import type { PackageManifest } from '../types';

export const CURRENT_MANIFEST_VERSION = 1;

export function createBaseManifest(): PackageManifest {
  return {
    schemaVersion: CURRENT_MANIFEST_VERSION,
    createdAt: new Date().toISOString(),
    kind: 'audio',
    dbFilename: 'package.db',
    mediaRoot: 'media',
    checksums: {},
  };
}
