What’s in place (quick context)
Chapter play entry points:
src/features/bible/components/ChapterCard.tsx forwards onPlay to the screen.
src/features/bible/screens/BookChaptersScreen.tsx calls useMediaActions().playChapter(...) when Play is tapped.
src/features/bible/screens/ChapterVersesScreen.tsx calls playChapter / playChapterFromVerse.
src/features/media/screens/HistoryModal.tsx calls playChapter on item tap.
In-sheet actions: TextAndQueueTabs uses playTrackFromQueue (and verse actions inside the sheet), MediaControls uses skipToNext/Previous, play/pause.
Player UI state:
src/features/media/components/MediaPlayerSheet.tsx holds local isExpanded and controls sheet index; not driven by global state.
Media store:
src/features/media/store/useMediaStore.ts exposes playChapter, playChapterFromVerse, skipToNext/Previous, etc.

Implementation plan
Create a new persisted settings store for media player
File: src/features/media/store/mediaSettingsStore.ts
State:
autoOpenOnPlay: boolean (default false)
expandOnNextExternalPlay: boolean (ephemeral flag, not persisted)
Actions:
setAutoOpenOnPlay(value: boolean)
requestExpandOnNextExternalPlay() (sets the ephemeral flag true)
consumeExpandOnNextExternalPlay() (resets the flag)
Persist only autoOpenOnPlay; keep expandOnNextExternalPlay in-memory.
Export useMediaSettingsStore and small selectors (e.g., useAutoOpenOnPlay).
Wire the preference into play flows
In useMediaStore.playChapter and useMediaStore.playChapterFromVerse:
Before delegating to MediaPlayerService, read autoOpenOnPlay; if true, set expandOnNextExternalPlay via requestExpandOnNextExternalPlay().
Use a dynamic import for the settings store as needed to avoid cycles, mirroring patterns used elsewhere.
Don’t set this flag in skipToNext, skipToPrevious, or playTrackFromQueue so internal navigation and auto-advance do not force expansion.
Make the media sheet react to the one-shot expand signal
In src/features/media/components/MediaPlayerSheet.tsx:
Subscribe to expandOnNextExternalPlay from the settings store.
When expandOnNextExternalPlay is true and there is a currentTrack, set local isExpanded to true (triggers snap to index 1) and then call consumeExpandOnNextExternalPlay().
Ensure this runs both: (a) on currentTrack change, and (b) if the flag flips after the sheet mounts.
Keep existing guards (isInitializing, currentSheetIndex) to avoid jitter; just change isExpanded and let existing effects snap.

Add settings UI
File: src/features/menu/screens/SettingsScreen.tsx
Add a new section “Media player” with a row “Auto open media player”.
Use a MenuView with two actions “On”/“Off” for consistency with your menu pattern 1, or a Switch if you prefer an inline toggle.
Read and update autoOpenOnPlay via useMediaSettingsStore.
Add i18n keys (e.g., settings.mediaPlayer, settings.autoOpenMediaPlayer, common.on, common.off).
Exports and organization
Add a named export for the new store in src/features/media/index.ts if you keep that as the re-export surface.
Follow feature-first placement under src/features/media/store/ (already aligned with your structure).
Behavior matrix (after change)
External play (ChapterCard, Book/Chapter screens, History, deep links): expands if toggle ON; stays collapsed if OFF.
Internal next/previous, auto-advance on track finish, restart current track: never force expansion.
In-sheet queue tap or verse actions: no change (already in sheet; expansion is moot).
Edge cases and safeguards
Starting from no current track: the settings flag is set before playback; when the sheet mounts with the new track, it will see the flag and expand once.
Resuming the same chapter from an external screen still counts as “external play” and will expand when ON.
No persistence of the one-shot flag to avoid stale expansion on app relaunch.
Strings/i18n
Add minimal keys to en.json:
menu.mediaPlayer or settings.mediaPlayer
settings.autoOpenMediaPlayer
Use existing common.on/common.off or add if missing.
Testing checklist
Toggle ON, play from BookChaptersScreen: sheet expands immediately.
Toggle ON, press “Next” in controls or wait for auto-advance: remains as-is.
Toggle OFF, play externally: stays collapsed (current behavior).
Deep link that plays a chapter/verse: expands when ON.
Ensure no flashing/snap thrash on expansion (respect current init guards).

Files to touch
New: src/features/media/store/mediaSettingsStore.ts
Edit: src/features/media/store/useMediaStore.ts (set expand flag in playChapter/playChapterFromVerse)
Edit: src/features/media/components/MediaPlayerSheet.tsx (consume flag to expand)
Edit: src/features/menu/screens/SettingsScreen.tsx (new section + toggle)
Optional: src/features/media/index.ts (export the new store)
Optional: src/shared/services/i18n/locales/en.json (strings)
