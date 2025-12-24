export { default as PowerSyncSystem, powerSyncSystem } from './PowerSyncSystem';
export { PowerSyncConnector } from './PowerSyncConnector';
export {
  PowerSyncConnectionManager,
  powerSyncConnectionManager,
} from './PowerSyncConnectionManager';
export {
  PowerSyncErrorHandler,
  powerSyncErrorHandler,
} from './PowerSyncErrorHandler';
export {
  PowerSyncErrorMonitor,
  powerSyncErrorMonitor,
} from './PowerSyncErrorMonitor';

// Export all types from centralized types file
export type {
  ConnectionState,
  ConnectionConfig,
  PowerSyncCredentials,
  SupabaseSession,
  SupabaseAuthResponse,
  DatabaseRecord,
  DatabaseError,
  PowerSyncBackendConnector,
} from './types';

// Export error handler types
export type {
  PowerSyncError,
  ErrorClassificationResult,
  PowerSyncErrorStats,
} from './PowerSyncErrorHandler';

// Export local schema types from powersync folder
export type {
  LocalDatabase,
  MediaFileDownloadRecord,
  DownloadQueueRecord,
} from '../../../../powersync/LocalSchema';
export { LocalSchema } from '../../../../powersync/LocalSchema';
