// PowerSync App Schema
// This file exports the generated PowerSync schema for the recording app.
//
// The schema is generated from powersync/sync-rules.yaml using:
//   pnpm powersync:generate-schema
//
// NOTE: Schema generation requires PowerSync credentials:
//   - PROJECT_ID
//   - AUTH_TOKEN
//   - ORG_ID
//
// These can be set as environment variables or configured via "powersync init"
//
// The generated schema file (AppSchema.generated.ts) contains the actual
// table definitions. This file re-exports it for convenience.

export { AppSchema, SyncedSchema } from './AppSchema.generated';
