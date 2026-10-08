# Audio-Only Background Music Broadcast & Admin/Mod Exclusive Controls Plan

This revised plan hides the YouTube/embedded video box so music plays strictly as **audio-only in the background**, synchronizes the live playback state and queue globally via Cloud Firestore & WebSockets under **Admin and Moderator control**, and gives public visitors **only local Volume and Mute/Unmute controls**.

---

### User Review & Confirmed Decisions

> [!IMPORTANT]
> Confirmed from your answers:
> - **Hidden Video Box (Audio-Only Background Playback)**:
>   - The `▶ YouTube Player` / embedded iframe box shown in your screenshot is completely hidden (`w-0 h-0 opacity-0 pointer-events-none`) so no video player UI ever appears on screen or can be clicked—music plays purely as background audio.
> - **Public Visitor Controls (Volume & Mute Only)**:
>   - Public visitors see the **Now Playing** title and read-only **Up Next Queue**, and can **only adjust their own Volume slider or Mute/Unmute**. They cannot play/pause, skip, switch tracks, add links, reorder, or delete tracks.
>   - Includes an automatic first-interaction audio unlock so if a visitor's browser initially blocks autoplay, clicking anywhere on the page or clicking the volume/unmute button immediately starts playing the live Admin broadcast.
> - **Admin & Moderator Exclusive Broadcast & Queue Controls**:
>   - **Only Admins and Moderators** can Play/Pause, Skip Previous/Next, select tracks, toggle Repeat/Shuffle, add YouTube/Spotify/SoundCloud/MP3 links (Single or Bulk), reorder (`↑`/`↓`), or delete (`🗑️`) tracks—both from the floating mini-player and from the **Admin Dashboard**.
>   - All Admin/Moderator playback and queue changes sync live to every connected visitor via Cloud Firestore (`admin_settings/music_queue`) and WebSockets.

---

### 1. Technical Architecture & Files to Update

1. **Global Music Broadcast State (`src/types.ts`, `src/firebase/db.ts`, `src/utils/realtime.ts`)**:
   - Define `MusicBroadcastSettings`:
     - `queue: MusicTrack[]`
     - `currentQueueIndex: number`
     - `isPlaying: boolean`
     - `loopMode: 'queue' | 'one' | 'off'`
     - `isShuffle: boolean`
     - `updatedAt: number`
   - Sync `MusicBroadcastSettings` via `admin_settings/music_queue` in Cloud Firestore (`subscribeToMusicBroadcast` & `saveMusicBroadcastToCloud`) and broadcast live updates via `realtimeHub` (`MUSIC_BROADCAST_UPDATED`).
   - Automatically resolve real YouTube/SoundCloud titles via `noembed.com` when a link is queued without a custom title.

2. **Audio-Only Hidden Embed & Role-Based Mini-Player (`src/components/MusicPlayerWidget.tsx`)**:
   - **Invisible Audio Engine**: Keep the YouTube/SoundCloud/Spotify iframe mounted inside a hidden zero-size container (`fixed -left-[9999px] -top-[9999px] w-1 h-1 opacity-0 pointer-events-none`) controlled via `postMessage` (`playVideo`, `pauseVideo`, `setVolume`, `mute`, `unMute`).
   - **Public View (`!canManageMusic`)**:
     - Shows the spinning vinyl badge, current song title, read-only Up Next track list, and **only the local Mute/Unmute button + Volume slider**.
     - No Play/Pause button, no Skip buttons, no track switching on click, no `+ Queue Music Links`, no reorder arrows, and no delete bin.
   - **Admin & Moderator View (`canManageMusic`)**:
     - Full broadcast transport controls (Play/Pause, Prev/Next, Repeat, Shuffle), clickable track switching, `+ Queue Music Links` (Single & Bulk), `↑`/`↓` reorder, and `🗑️` delete track controls.

3. **Admin Dashboard Music Broadcast & Queue Manager (`src/components/AdminDashboardModal.tsx` & `src/App.tsx`)**:
   - Add a **🎵 Live Music Broadcast & Queue Control** section in the Admin Dashboard so Admins and Moderators can also control the music queue and playback directly from the Admin Console.
