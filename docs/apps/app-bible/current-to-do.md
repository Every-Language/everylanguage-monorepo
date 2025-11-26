# TODO List

**Legend:**

- `[ ]` = Todo item (not started)
- `[🔄]` = In progress (currently being worked on)
- `[✅]` = Completed (ticked in original section, detailed info in DONE section)

## Testing Status

### Background Audio Fixes

- **✅ Android Physical Device:** Working perfectly
- **✅ Android Simulator:** Working perfectly
- **❌ iOS Simulator:** Fails (needs physical device test)
- **⏳ iOS Physical Device:** Not tested yet

---

## Page 1: Current Work

### CHECKING

- [🔄] test production build

### DOING

- [🔄]

---

## Page 2: Backend & Infrastructure

### Backend Tasks

- [ ] upload bsb to prod
- [ ] move AWS bibles over
- [ ] eas updates
- [ ] push notifications
- [ ] background downloads
- [✅] analytics - send actual media file timing info (position, duration)
- [ ] sync global image sets
- [ ] connectivity - do we need to ping real http endpoints?

### Database & Performance

- [ ] switch to powersync/tanstack-query
- [ ] chapters / verses screen - refactor, ?inefficient queries take time to load
- [ ] optimise time to play
- [ ] Defer index maintenance (optional, bigger change)
- [ ] Drop indexes on books/chapters/verses before the INSERTs and recreate them after COMMIT
- [ ] Creating indexes once after a bulk load is faster than updating them row-by-row during inserts/updates

---

## Page 3: Media Player & Audio

### Media Player UI Issues

- [ ] media player area not touchable after switching versions and it disappears
- [✅] investigate android media player spacing - make the controls stay fixed at the bottom
- [✅] make expandedtrackdetails a fixed height, lists should be the only things which expand
- [✅] android media player UI - expanded info not positioned correctly whenever expanding modal on android
- [ ] optimise media sheet animation - a bit jittery when expanding / contracting
- [✅] move speed controls to another row of media player controls, make this only visible when expanded
- [✅] media sheet drag sensitivity - setup implemented, adjustable sensitivity
- [✅] media player sheet not collapsing unless scrolled all the way to the bottom - improved drag behavior and state management
- [✅] MediaPlayerContent layout fix - replaced percentage-based height calculations with proper flex layout

### Audio Playback & Controls

- [ ] add chapter from later on in the same book to queue doens't function as intended
- [ ] tap anywhere to expand ?? expand when first playing a chapter
- [ ] intelligent seek if no verse timings available
- [ ] ?verses skipping too late?
- [ ] replay, shuffle
- [✅] background music - **COMPLETED** (Android working, iOS needs physical device test)
- [ ] ?cache future streams in queue

### Playhead & Seeking Issues

- [✅] next, please look at my playhead dragging. if i "pick up" the playhead, then let go without changing the position of my cursor/finger, the seek bar stops tracking play progress completely (although it keeps playing). re-seeking seems to fix this

### Media Player UI Issues

- [ ] media player sheet disappears when automatically advancing to next chapter after playback completes
  - **How to replicate**: Play a chapter to completion and let it automatically advance to the next chapter. The media player sheet will disappear/hide instead of staying visible with the new track information.

---

## Page 4: UI/UX & Navigation

### Visual & Layout Issues

- [ ] set the background of the entire app (navigation pushes in dark mode have a light background)
- [🔄] android - increase top spacing in modals
- [ ] remove safearea at the bottom of app
- [ ] safe area insets iphone - bottom black thing showing up
- [ ] blur on ios headers
- [ ] redo topbar UI

### Navigation & Modals

- [ ] downloads modal - can't scroll down
- [ ] sub screens of menu, cannot swipe down to close
- [ ] ? bible / playlists navigation - make consistent with tabs

### Onboarding & Permissions

- [ ] permission screen flash when going thru onboarding
- [ ] sign up / sign in flow, user data migration, add sign in to onboarding (skip if offline)
- [ ] onboarding network warning modal - when no internet detected and user clicks "try again", it moves to permissions screen instead of just closing the modal

---

## Page 5: Features & Functionality

### Core Features

- [ ] search feature
- [ ] bookmarks
- [ ] playlists - have a way to have user created playlists and app defined playlists (for rej's dmm content)
- [ ] history UI, check that history works across versions
- [ ] select multiple verses to share
- [ ] logic to chain shares - originshareid

### Downloads & Offline

- [ ] ?still some downloads failing while stuck on pending
- [ ] chapter download progress and status not showing up
- [ ] image downloads
- [ ] test multip ackage import

### Settings & Configuration

- [✅] move version selection buttons insto settings, and also audio player / text bit
- [ ] settings - add more settings
- [ ] menu - add network connectivity widget

---

## Page 6: Performance & Optimization

### Performance Issues

- [ ] initial book / chapter selection too slow
- [ ] harden ended_at calculation - ?heartbeat
- [ ] playlists - denormalize playlist data so that sync works ??

### Code Quality & Architecture

- [✅] fix require cycle warnings - **COMPLETED** (Fixed circular dependencies in Details.tsx and MediaPlayerSheet.tsx by using direct imports instead of index imports)
- [✅] get rid of appwithstores and just have app
- [✅] refactor media store to achieve single responsibility principle - **COMPLETED** (Split useMediaStore into focused stores: usePlaybackStore for playback state, useMediaPlayerUIStore for UI state, useSessionStore for session management)
- [ ] extract init logic?
- [ ] write tests for everything
- [ ] write tests
- [ ] fix up all the todos

---

## Page 7: Advanced Features & Future

### Notifications & Communication

- [ ] push notifications
- [ ] add a function to send a notification to specific users - people can pray over a verse / message to send and then send it

### App Polish

- [ ] splash screen, notification icon, notification sound
- [ ] expo-dynamic-app-icon
- [ ] haptics

### Special Features

- [ ] calulator mode

### Session Management

- [ ] ? close-sessions isn't finding a session to update

---

## DONE

**Note:** Completed issues are marked with ✅ in their original sections above.

### Completed Tasks

- [✅] Background audio playback - **COMPLETED** (Android working perfectly, iOS needs physical device test)
- [✅] MediaPlayerContent layout fix - **COMPLETED** (Android simulator and physical device tested, iOS not tested)
- [✅] Media sheet drag sensitivity - **COMPLETED** (Setup implemented, adjustable sensitivity)
- [✅] Media player sheet not collapsing unless scrolled all the way to the bottom - **COMPLETED** (Improved drag behavior and state management)
- [✅] Move speed controls to another row of media player controls, make this only visible when expanded - **COMPLETED** (Speed controls now appear in dedicated row above progress bar when player is expanded, right-aligned with proper spacing, using store-based state management, footer height increased to 160px)
- [✅] Investigate android media player spacing - make the controls stay fixed at the bottom - **COMPLETED** (Android media player controls now stay fixed at the bottom)
- [✅] Make expandedtrackdetails a fixed height, lists should be the only things which expand - **COMPLETED** (Expanded track details now have fixed height with only lists expanding)
- [✅] Android media player UI - expanded info not positioned correctly whenever expanding modal on android - **COMPLETED** (Fixed positioning of expanded info in Android media player modal)
- [✅] Playhead dragging issue - seek bar stops tracking play progress when dragging without position change - **COMPLETED**
- [✅] Fix require cycle warnings - **COMPLETED** (Fixed circular dependencies in Details.tsx and MediaPlayerSheet.tsx by using direct imports instead of index imports)
- [✅] Get rid of appwithstores and just have app - **COMPLETED**
- [✅] Move version selection buttons into settings, and also audio player / text bit - **COMPLETED**
- [✅] Analytics - send actual media file timing info (position, duration) - **COMPLETED** (Added analytics triggers for chapter_listens and media_file_listens in QueueWatcher.handleTrackChange() with deduplication logic to prevent duplicate events)

---

## Notes & Warnings

### Analytics Warning

```
WARN [2025-09-02T01:24:45.321Z] WARN: Analytics: location enrichment failed {
"name": "Error",
"message": "Result set is empty",
"stack": "Error: Result set is empty
```

### React Key Duplication Error

```
ERROR Warning: Encountered two children with the same key, `.$45a0428a-46ed-4747-9f48-651827228ec4`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version.

Location: DownloadStatusModal component (line 44)
```
