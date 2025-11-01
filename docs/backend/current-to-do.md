? RLS for amterialized views / views

allow community checking of verse texts too

schema changes

- add sequence_id to media files
- redesign playlists schema (denormalize to be compatible with powersync)
- remove user_version_selections table

Features

- server side package generation
  - add version_packages table with storage_provider and object_key, package_type, version_id, scope_key (for audio versions), created_at, status, error
  - modify text and audio workers to check the version packages table and see if there have been updates
