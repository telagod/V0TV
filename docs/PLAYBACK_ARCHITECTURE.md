# Playback Architecture (Play Page)

## Goals

- Stable viewing experience: no UI elements blocking playback; minimize visual flicker when metadata changes.
- Performance: avoid high-frequency React re-renders during playback; keep HLS worker overhead minimal.
- Resilience: show actionable errors and provide a compatibility fallback path when the enhanced player fails.

## Constraints

- Client-side playback runs in `src/app/play/*` (Next.js App Router, `use client`).
- Some upstream M3U8 hosts may be unreachable or blocked; the player must fail gracefully.
- Service Worker is disabled by design; do not rely on SW caching for playback.

## Design

### Primary player: Artplayer + hls.js

- `useVideoPlayer` owns the Artplayer instance lifecycle via a `ref` and exposes a small imperative surface (`play/pause/seek/destroy`).
- URL switching uses `art.switchUrl(url)` and is only triggered when the **URL changes** (not when `title/poster` update) to avoid “flash” reloads.
- hls.js is configured with `enableWorker: false` to minimize worker overhead.

### UI wrapper: VideoPlayer state machine

`VideoPlayer` renders a single video area and overlays lightweight UI states:

- `empty/loading`: centered placeholder.
- `initializing`: non-blocking spinner (pointer-events disabled) while the enhanced player boots.
- `error`: visible error overlay with a single action: “Use native player to retry”.
- `fallback`: native `<video controls>` with optional hls.js attachment (still `enableWorker: false`).

There is no always-visible “mode toggle” button; switching is only offered after failure.

## Performance notes

- `PlayPageClient` throttles `onTimeUpdate` UI state updates (e.g. every 250ms) to prevent whole-page re-renders on each `timeupdate` tick.
- Keep the player container DOM stable (`ref` target does not unmount during normal playback).

## Future improvements

- Add a settings-level “prefer native/enhanced” option (stored in user settings), instead of an in-player toggle.
- Add optional server-side stream proxying for blocked sources (only if required; consider legal/compliance and cost).

