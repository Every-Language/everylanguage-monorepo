migrate partnership-dashboard to consume from views, and write through API routes=

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

bugs

- cant tap countries on mobile
- can't slide sheet on mobile
- app downloads view not working
- progress not updating properly - check prod
- when first loading map, flashes in map view (rather than globe view)
- make header highlighting consistent

new features

- activity feed page
- partnership dashboard
- add dots for languages
- languages available to start translation
- recently updated translations table
- map home view
  - show global stats when no country/region selected, show home view by default when navigating to map
  - recently updated translations view
- refactor to implement a router
- internationalization
- GRN API - language samples
- joshuaproject API
- get partner portal working with real data
- team view
  - let DTS teams submit requests to add new languages
- base view
- projects view ? get rid of this in the dashboard and make it a sub view of other views ?
- admin portal ? separate route ? add it to projects website instead
- add bible progress for versions we don't have

future

- get vector tile source for regions (for instant highlighting), host on CDN
- satellite view

fix inefficient queries

close all popups and modals upon logout

audio files

- dont allow any edits on delete
- filter audio table by not deleted
- bulk timestamp upload broken (violates rls)
- prompt to create an audio version before first upload
