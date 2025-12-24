migrate partnership-dashboard to consume from views, and write through API routes

allow community checking of verse texts too

schema changes

- add sequence_id to media files
- redesign playlists schema (denormalize to be compatible with powersync)
- remove user_version_selections table

Features

- server side package generation
  - add version_packages table with storage_provider and object_key, package_type, version_id, scope_key (for audio versions), created_at, status, error
  - modify text and audio workers to check the version packages table and see if there have been updates

Add a Sky layer/atmosphere preset when in globe mode
add stars with a parallax effect

audio files

- dont allow any edits on delete
- filter audio table by not deleted
- bulk timestamp upload broken (violates rls)
- prompt to create an audio version before first upload
