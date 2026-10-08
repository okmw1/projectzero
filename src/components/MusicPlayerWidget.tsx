import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Music,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Disc3,
  Radio,
  ListMusic,
  Repeat,
  Repeat1,
  Shuffle,
  ArrowUp,
  ArrowDown,
  ShieldCheck,
} from 'lucide-react';
import {
  BUILT_IN_MUSIC_TRACKS,
  MusicTrack,
  musicController,
  parseMusicUrl,
  playChime,
  resolveMusicTrackTitle,
} from '../utils/audio';
import { MusicBroadcastSettings, UserSession } from '../types';

interface MusicPlayerWidgetProps {
  isMaintenanceMode?: boolean;
  user?: UserSession | null;
  musicBroadcast: MusicBroadcastSettings;
  onUpdateMusicBroadcast: (next: MusicBroadcastSettings) => void;
}

const LOCAL_VOLUME_KEY = 'teacher_day_local_music_volume_v1';
const LOCAL_MUTED_KEY = 'teacher_day_local_music_muted_v1';

export const MusicPlayerWidget: React.FC<MusicPlayerWidgetProps> = ({
  isMaintenanceMode = false,
  user = null,
  musicBroadcast,
  onUpdateMusicBroadcast,
}) => {
  // Only Administrators and Moderators can control playback, switch tracks, add links, reorder, or delete tracks
  const canManageMusic = !!user && (user.role === 'admin' || user.role === 'moderator');

  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_VOLUME_KEY);
      if (saved !== null) {
        const parsed = parseFloat(saved);
        if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 1) return parsed;
      }
    } catch {
      // ignore
    }
    return 0.45;
  });

  const [isMuted, setIsMuted] = useState<boolean>(() => {
    try {
      return localStorage.getItem(LOCAL_MUTED_KEY) === 'true';
    } catch {
      return false;
    }
  });

  // Add to Queue Drawer State (Admin & Moderator only)
  const [showAddDrawer, setShowAddDrawer] = useState<boolean>(false);
  const [addMode, setAddMode] = useState<'single' | 'bulk'>('single');
  const [customTitle, setCustomTitle] = useState<string>('');
  const [customUrl, setCustomUrl] = useState<string>('');
  const [bulkUrlsText, setBulkUrlsText] = useState<string>('');
  const [customError, setCustomError] = useState<string>('');
  const [isResolvingTitles, setIsResolvingTitles] = useState<boolean>(false);
  const [streamNotice, setStreamNotice] = useState<string>('');

  const embedIframeRef = useRef<HTMLIFrameElement | null>(null);
  const lastPlayedTrackIdRef = useRef<string | null>(null);
  const lastPlayingStateRef = useRef<boolean>(false);

  const safeQueue =
    Array.isArray(musicBroadcast.queue) && musicBroadcast.queue.length > 0
      ? musicBroadcast.queue
      : BUILT_IN_MUSIC_TRACKS;
  const safeIndex = Math.min(
    Math.max(0, musicBroadcast.currentQueueIndex || 0),
    safeQueue.length - 1
  );
  const activeTrack = safeQueue[safeIndex] || BUILT_IN_MUSIC_TRACKS[0];
  const isPlaying = !!musicBroadcast.isPlaying;
  const loopMode = musicBroadcast.loopMode || 'queue';
  const isShuffle = !!musicBroadcast.isShuffle;

  const isEmbeddedPlatform =
    activeTrack.type === 'youtube' ||
    activeTrack.type === 'spotify' ||
    activeTrack.type === 'soundcloud';

  // Helper to update global broadcast state (Admin & Moderator only)
  const commitBroadcastUpdate = useCallback(
    (partial: Partial<MusicBroadcastSettings>) => {
      if (!canManageMusic) return;
      const nextQueue =
        partial.queue && partial.queue.length > 0 ? partial.queue : safeQueue;
      const nextIndex =
        typeof partial.currentQueueIndex === 'number'
          ? Math.min(Math.max(0, partial.currentQueueIndex), nextQueue.length - 1)
          : Math.min(safeIndex, nextQueue.length - 1);

      onUpdateMusicBroadcast({
        queue: nextQueue,
        currentQueueIndex: nextIndex,
        isPlaying: partial.isPlaying !== undefined ? partial.isPlaying : isPlaying,
        loopMode: partial.loopMode !== undefined ? partial.loopMode : loopMode,
        isShuffle: partial.isShuffle !== undefined ? partial.isShuffle : isShuffle,
        updatedAt: Date.now(),
        updatedBy: user?.name || 'Administrator',
      });
    },
    [
      canManageMusic,
      isPlaying,
      isShuffle,
      loopMode,
      onUpdateMusicBroadcast,
      safeIndex,
      safeQueue,
      user?.name,
    ]
  );

  // Send audio command to hidden YouTube or SoundCloud iframe via postMessage
  const sendCommandToEmbed = useCallback(
    (action: 'play' | 'pause' | 'volume' | 'mute', val?: number | boolean) => {
      const win = embedIframeRef.current?.contentWindow;
      if (!win) return;
      try {
        if (activeTrack.type === 'youtube') {
          if (action === 'play') {
            win.postMessage(
              JSON.stringify({ event: 'command', func: 'playVideo', args: [] }),
              '*'
            );
          } else if (action === 'pause') {
            win.postMessage(
              JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }),
              '*'
            );
          } else if (action === 'volume' && typeof val === 'number') {
            win.postMessage(
              JSON.stringify({
                event: 'command',
                func: 'setVolume',
                args: [Math.round(val * 100)],
              }),
              '*'
            );
          } else if (action === 'mute') {
            win.postMessage(
              JSON.stringify({
                event: 'command',
                func: val ? 'mute' : 'unMute',
                args: [],
              }),
              '*'
            );
          }
        } else if (activeTrack.type === 'soundcloud') {
          if (action === 'play') {
            win.postMessage(JSON.stringify({ method: 'play' }), '*');
          } else if (action === 'pause') {
            win.postMessage(JSON.stringify({ method: 'pause' }), '*');
          } else if (action === 'volume' && typeof val === 'number') {
            win.postMessage(
              JSON.stringify({ method: 'setVolume', value: Math.round(val * 100) }),
              '*'
            );
          }
        }
      } catch {
        // Ignore cross-origin postMessage restrictions
      }
    },
    [activeTrack.type]
  );

  // Sync local volume & mute preferences with musicController on mount
  useEffect(() => {
    musicController.setVolume(volume);
    musicController.setMuted(isMuted);
  }, [volume, isMuted]);

  // Synchronize local audio engine whenever Admin/Mod broadcast state changes
  useEffect(() => {
    const trackChanged = lastPlayedTrackIdRef.current !== activeTrack.id;
    const playStateChanged = lastPlayingStateRef.current !== isPlaying;

    lastPlayedTrackIdRef.current = activeTrack.id;
    lastPlayingStateRef.current = isPlaying;

    if (!isPlaying) {
      musicController.stop();
      if (isEmbeddedPlatform) {
        sendCommandToEmbed('pause');
      }
      return;
    }

    if (trackChanged || playStateChanged) {
      musicController.playTrack(activeTrack);
      if (isEmbeddedPlatform) {
        sendCommandToEmbed('play');
        sendCommandToEmbed('volume', isMuted ? 0 : volume);
        sendCommandToEmbed('mute', isMuted);
      }
    }
  }, [activeTrack, isEmbeddedPlatform, isMuted, isPlaying, sendCommandToEmbed, volume]);

  // Unlock browser audio on first visitor interaction if Admin broadcast is currently playing
  useEffect(() => {
    if (!isPlaying) return;
    const handleUnlockAudio = () => {
      if (!musicBroadcast.isPlaying) return;
      if (!isEmbeddedPlatform && !musicController.getIsPlaying()) {
        musicController.playTrack(activeTrack);
      } else if (isEmbeddedPlatform) {
        sendCommandToEmbed('play');
        sendCommandToEmbed('volume', isMuted ? 0 : volume);
        sendCommandToEmbed('mute', isMuted);
      }
    };
    window.addEventListener('pointerdown', handleUnlockAudio, { once: true });
    window.addEventListener('keydown', handleUnlockAudio, { once: true });
    return () => {
      window.removeEventListener('pointerdown', handleUnlockAudio);
      window.removeEventListener('keydown', handleUnlockAudio);
    };
  }, [activeTrack, isEmbeddedPlatform, isMuted, isPlaying, musicBroadcast.isPlaying, sendCommandToEmbed, volume]);

  // Advance to the next track in the sequential queue when current track finishes
  const advanceQueueOnTrackEnd = useCallback(() => {
    if (loopMode === 'one') {
      musicController.playTrack(activeTrack);
      if (isEmbeddedPlatform) {
        sendCommandToEmbed('play');
      }
      return;
    }

    if (safeQueue.length === 1) {
      if (loopMode === 'queue') {
        musicController.playTrack(safeQueue[0]);
        if (isEmbeddedPlatform) {
          sendCommandToEmbed('play');
        }
      } else {
        musicController.stop();
        if (canManageMusic) {
          commitBroadcastUpdate({ isPlaying: false });
        }
      }
      return;
    }

    let nextIndex = safeIndex + 1;
    if (isShuffle && safeQueue.length > 1) {
      const candidates = safeQueue.map((_, idx) => idx).filter((idx) => idx !== safeIndex);
      nextIndex = candidates[Math.floor(Math.random() * candidates.length)] ?? 0;
    } else if (nextIndex >= safeQueue.length) {
      if (loopMode === 'queue') {
        nextIndex = 0;
      } else {
        musicController.stop();
        if (canManageMusic) {
          commitBroadcastUpdate({ isPlaying: false });
        }
        return;
      }
    }

    const nextTrack = safeQueue[nextIndex];
    if (nextTrack) {
      musicController.playTrack(nextTrack);
      if (canManageMusic) {
        commitBroadcastUpdate({
          currentQueueIndex: nextIndex,
          isPlaying: true,
        });
      }
    }
  }, [
    activeTrack,
    canManageMusic,
    commitBroadcastUpdate,
    isEmbeddedPlatform,
    isShuffle,
    loopMode,
    safeIndex,
    safeQueue,
    sendCommandToEmbed,
  ]);

  useEffect(() => {
    musicController.setOnError((msg) => {
      setStreamNotice(msg);
      setTimeout(() => setStreamNotice(''), 5000);
    });
    musicController.setOnTrackEnded(() => {
      advanceQueueOnTrackEnd();
    });
    return () => {
      musicController.setOnError(null);
      musicController.setOnTrackEnded(null);
    };
  }, [advanceQueueOnTrackEnd]);

  // Listen for hidden YouTube / SoundCloud / Spotify iframe ended events so queue advances automatically
  useEffect(() => {
    const handleWindowMessage = (event: MessageEvent) => {
      if (!isPlaying || !isEmbeddedPlatform) return;
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (!data) return;

        // YouTube IFrame API: playerState === 0 means ENDED
        if (
          activeTrack.type === 'youtube' &&
          data.event === 'infoDelivery' &&
          data.info &&
          data.info.playerState === 0
        ) {
          advanceQueueOnTrackEnd();
        }

        // SoundCloud Widget API: 'finish' event
        if (activeTrack.type === 'soundcloud' && data.method === 'finish') {
          advanceQueueOnTrackEnd();
        }

        // Spotify Embed API: playback_update at end of track
        if (
          activeTrack.type === 'spotify' &&
          data.type === 'playback_update' &&
          data.payload &&
          data.payload.duration > 0 &&
          data.payload.position >= data.payload.duration - 600 &&
          data.payload.isPaused
        ) {
          advanceQueueOnTrackEnd();
        }
      } catch {
        // Ignore non-JSON postMessages
      }
    };

    window.addEventListener('message', handleWindowMessage);
    return () => window.removeEventListener('message', handleWindowMessage);
  }, [activeTrack.type, advanceQueueOnTrackEnd, isEmbeddedPlatform, isPlaying]);

  // Admin/Mod: Play/Pause live broadcast
  const handleTogglePlay = () => {
    if (!canManageMusic) return;
    const nextPlaying = !isPlaying;
    if (nextPlaying) {
      musicController.playTrack(activeTrack);
      if (isEmbeddedPlatform) {
        sendCommandToEmbed('play');
      }
    } else {
      musicController.stop();
      if (isEmbeddedPlatform) {
        sendCommandToEmbed('pause');
      }
    }
    commitBroadcastUpdate({ isPlaying: nextPlaying });
  };

  // Admin/Mod: Select track in queue
  const handleSelectQueueTrack = (index: number) => {
    if (!canManageMusic) return;
    const chosen = safeQueue[index];
    if (!chosen) return;
    musicController.playTrack(chosen);
    commitBroadcastUpdate({
      currentQueueIndex: index,
      isPlaying: true,
    });
  };

  // Admin/Mod: Previous track
  const handlePrevTrack = () => {
    if (!canManageMusic) return;
    const prevIdx = (safeIndex - 1 + safeQueue.length) % safeQueue.length;
    handleSelectQueueTrack(prevIdx);
  };

  // Admin/Mod: Next track
  const handleNextTrack = () => {
    if (!canManageMusic) return;
    if (isShuffle && safeQueue.length > 1) {
      const candidates = safeQueue.map((_, idx) => idx).filter((idx) => idx !== safeIndex);
      const randIdx = candidates[Math.floor(Math.random() * candidates.length)] ?? 0;
      handleSelectQueueTrack(randIdx);
      return;
    }
    const nextIdx = (safeIndex + 1) % safeQueue.length;
    handleSelectQueueTrack(nextIdx);
  };

  // Public & Staff: Local Volume slider
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    musicController.setVolume(val);
    sendCommandToEmbed('volume', val);
    try {
      localStorage.setItem(LOCAL_VOLUME_KEY, String(val));
    } catch {
      // ignore
    }
    if (val > 0 && isMuted) {
      setIsMuted(false);
      musicController.setMuted(false);
      sendCommandToEmbed('mute', false);
      try {
        localStorage.setItem(LOCAL_MUTED_KEY, 'false');
      } catch {
        // ignore
      }
    }
    if (isPlaying && !isEmbeddedPlatform && !musicController.getIsPlaying()) {
      musicController.playTrack(activeTrack);
    }
  };

  // Public & Staff: Local Mute/Unmute toggle
  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    musicController.setMuted(nextMuted);
    sendCommandToEmbed('mute', nextMuted);
    if (!nextMuted) {
      sendCommandToEmbed('volume', volume);
      if (isPlaying) {
        if (isEmbeddedPlatform) {
          sendCommandToEmbed('play');
        } else if (!musicController.getIsPlaying()) {
          musicController.playTrack(activeTrack);
        }
      }
    }
    try {
      localStorage.setItem(LOCAL_MUTED_KEY, String(nextMuted));
    } catch {
      // ignore
    }
  };

  // Admin/Mod: Cycle loop mode
  const handleCycleLoopMode = () => {
    if (!canManageMusic) return;
    const order: ('queue' | 'one' | 'off')[] = ['queue', 'one', 'off'];
    const next = order[(order.indexOf(loopMode) + 1) % order.length];
    commitBroadcastUpdate({ loopMode: next });
  };

  // Admin/Mod: Toggle shuffle
  const handleToggleShuffle = () => {
    if (!canManageMusic) return;
    commitBroadcastUpdate({ isShuffle: !isShuffle });
  };

  // Admin/Mod: Add a single URL to queue (resolves YouTube/SoundCloud/Spotify title automatically)
  const handleAddSingleUrl = async (playNext = false) => {
    if (!canManageMusic) return;
    setCustomError('');
    const parsed = parseMusicUrl(customUrl, customTitle);
    if (!parsed) {
      setCustomError('Please enter a valid YouTube, Spotify, SoundCloud, or direct audio URL.');
      return;
    }

    if (!customTitle.trim() && parsed.url) {
      setIsResolvingTitles(true);
      const resolvedTitle = await resolveMusicTrackTitle(parsed.url);
      setIsResolvingTitles(false);
      if (resolvedTitle) {
        parsed.title = resolvedTitle;
      }
    }

    let nextQueue: MusicTrack[];
    let targetIndex: number;

    if (playNext) {
      nextQueue = [
        ...safeQueue.slice(0, safeIndex + 1),
        parsed,
        ...safeQueue.slice(safeIndex + 1),
      ];
      targetIndex = safeIndex + 1;
    } else {
      nextQueue = [...safeQueue, parsed];
      targetIndex = nextQueue.length - 1;
    }

    setCustomTitle('');
    setCustomUrl('');
    setShowAddDrawer(false);
    playChime();

    if (playNext || !isPlaying) {
      musicController.playTrack(parsed);
      commitBroadcastUpdate({
        queue: nextQueue,
        currentQueueIndex: targetIndex,
        isPlaying: true,
      });
    } else {
      commitBroadcastUpdate({
        queue: nextQueue,
      });
      setStreamNotice(`Added "${parsed.title}" to live queue (#${targetIndex + 1})`);
      setTimeout(() => setStreamNotice(''), 3500);
    }
  };

  // Admin/Mod: Bulk paste multiple URLs
  const handleAddBulkUrls = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageMusic) return;
    setCustomError('');
    const lines = bulkUrlsText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      setCustomError('Paste one or more YouTube, Spotify, SoundCloud, or audio URLs (one per line).');
      return;
    }

    setIsResolvingTitles(true);
    const addedTracks: MusicTrack[] = [];
    for (const line of lines) {
      let titlePart: string | undefined;
      let urlPart = line;

      if (line.includes('|')) {
        const parts = line.split('|');
        titlePart = parts[0]?.trim();
        urlPart = parts.slice(1).join('|').trim();
      } else {
        const urlMatch = line.match(/(https?:\/\/\S+)/i);
        if (urlMatch) {
          urlPart = urlMatch[1];
          const prefix = line.replace(urlMatch[1], '').replace(/[-–—:]+$/, '').trim();
          if (prefix.length >= 2) titlePart = prefix;
        }
      }

      const track = parseMusicUrl(urlPart, titlePart);
      if (track) {
        if (!titlePart && track.url) {
          const resolved = await resolveMusicTrackTitle(track.url);
          if (resolved) track.title = resolved;
        }
        addedTracks.push(track);
      }
    }
    setIsResolvingTitles(false);

    if (addedTracks.length === 0) {
      setCustomError('No valid http:// or https:// music links found in your list.');
      return;
    }

    const nextQueue = [...safeQueue, ...addedTracks];
    setBulkUrlsText('');
    setShowAddDrawer(false);
    playChime();

    setStreamNotice(
      `Queued ${addedTracks.length} track${addedTracks.length > 1 ? 's' : ''} to live broadcast!`
    );
    setTimeout(() => setStreamNotice(''), 4000);

    if (!isPlaying) {
      const firstNewIndex = safeQueue.length;
      musicController.playTrack(addedTracks[0]);
      commitBroadcastUpdate({
        queue: nextQueue,
        currentQueueIndex: firstNewIndex,
        isPlaying: true,
      });
    } else {
      commitBroadcastUpdate({
        queue: nextQueue,
      });
    }
  };

  // Admin/Mod: Move track up or down in queue
  const handleMoveTrackInQueue = (idx: number, direction: -1 | 1, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canManageMusic) return;
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= safeQueue.length) return;
    const copy = [...safeQueue];
    const [moved] = copy.splice(idx, 1);
    copy.splice(targetIdx, 0, moved);

    let nextActiveIdx = safeIndex;
    if (idx === safeIndex) {
      nextActiveIdx = targetIdx;
    } else if (idx < safeIndex && targetIdx >= safeIndex) {
      nextActiveIdx = safeIndex - 1;
    } else if (idx > safeIndex && targetIdx <= safeIndex) {
      nextActiveIdx = safeIndex + 1;
    }

    commitBroadcastUpdate({
      queue: copy,
      currentQueueIndex: nextActiveIdx,
    });
  };

  // Admin/Mod: Delete track from queue
  const handleRemoveFromQueue = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canManageMusic) return;
    if (safeQueue.length <= 1) {
      commitBroadcastUpdate({
        queue: [...BUILT_IN_MUSIC_TRACKS],
        currentQueueIndex: 0,
      });
      return;
    }
    const copy = safeQueue.filter((_, i) => i !== idx);
    let nextActiveIdx = safeIndex;

    if (idx === safeIndex) {
      nextActiveIdx = idx % copy.length;
      if (isPlaying && copy[nextActiveIdx]) {
        musicController.playTrack(copy[nextActiveIdx]);
      }
    } else if (idx < safeIndex) {
      nextActiveIdx = safeIndex - 1;
    }

    commitBroadcastUpdate({
      queue: copy,
      currentQueueIndex: nextActiveIdx,
    });
  };

  // Admin/Mod: Reset queue to default built-in tracks
  const handleResetToDefaultQueue = () => {
    if (!canManageMusic) return;
    if (isPlaying) {
      musicController.playTrack(BUILT_IN_MUSIC_TRACKS[0]);
    }
    commitBroadcastUpdate({
      queue: [...BUILT_IN_MUSIC_TRACKS],
      currentQueueIndex: 0,
    });
    playChime();
  };

  const getPlatformBadge = (track: MusicTrack, isSelected: boolean) => {
    const base = 'px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider shrink-0 ';
    if (track.type === 'youtube') {
      return (
        <span className={base + (isSelected ? 'bg-red-500 text-white' : 'bg-red-100 text-red-800')}>
          🎵 YouTube Audio
        </span>
      );
    }
    if (track.type === 'spotify') {
      return (
        <span
          className={
            base + (isSelected ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-800')
          }
        >
          🟢 Spotify Audio
        </span>
      );
    }
    if (track.type === 'soundcloud') {
      return (
        <span
          className={
            base + (isSelected ? 'bg-orange-500 text-white' : 'bg-orange-100 text-orange-800')
          }
        >
          ☁️ SoundCloud
        </span>
      );
    }
    if (track.type === 'custom_url') {
      return (
        <span
          className={
            base + (isSelected ? 'bg-amber-400 text-[#1F453B]' : 'bg-amber-100 text-amber-900')
          }
        >
          🔗 Audio Stream
        </span>
      );
    }
    return (
      <span
        className={
          base + (isSelected ? 'bg-white/15 text-[#F7DE85]' : 'bg-[#EFE6D5] text-[#6E5F51]')
        }
      >
        🎹 Built-In
      </span>
    );
  };

  return (
    <div className="fixed bottom-4 left-4 z-50 max-w-[calc(100vw-2rem)] select-none">
      {/* Hidden Audio-Only Background Embed Engine for YouTube / Spotify / SoundCloud
          Strictly invisible (0x0 offscreen, pointer-events-none) so no video box ever shows on screen */}
      {isEmbeddedPlatform && activeTrack.embedUrl && isPlaying && (
        <div
          className="fixed -left-[9999px] -top-[9999px] w-1 h-1 opacity-0 pointer-events-none overflow-hidden"
          aria-hidden="true"
        >
          <iframe
            ref={embedIframeRef}
            key={activeTrack.id}
            src={activeTrack.embedUrl}
            title={activeTrack.title}
            width="1"
            height="1"
            tabIndex={-1}
            allow="autoplay; encrypted-media"
            className="w-0 h-0 border-0 pointer-events-none"
            onLoad={() => {
              if (embedIframeRef.current?.contentWindow) {
                try {
                  if (activeTrack.type === 'youtube') {
                    embedIframeRef.current.contentWindow.postMessage(
                      JSON.stringify({ event: 'listening', id: activeTrack.id }),
                      '*'
                    );
                  }
                  sendCommandToEmbed('play');
                  sendCommandToEmbed('volume', isMuted ? 0 : volume);
                  sendCommandToEmbed('mute', isMuted);
                } catch {
                  // ignore
                }
              }
            }}
          />
        </div>
      )}

      {/* Minimized Floating Pill */}
      {!isExpanded ? (
        <div className="flex items-center gap-2 bg-[#1F453B] text-[#FDF2CA] p-2 pr-3.5 rounded-full shadow-2xl border-2 border-[#F7DE85]/40 transition-all hover:border-[#F7DE85]">
          {canManageMusic ? (
            <>
              <button
                type="button"
                onClick={handleTogglePlay}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                  isPlaying
                    ? 'bg-[#CE5A46] text-white shadow-inner'
                    : 'bg-[#F7DE85] text-[#1F453B] hover:scale-105'
                }`}
                title={isPlaying ? 'Pause Live Broadcast (Admin/Mod)' : 'Play Live Broadcast (Admin/Mod)'}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>

              <button
                type="button"
                onClick={handleNextTrack}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-[#F7DE85] flex items-center justify-center transition-colors cursor-pointer shrink-0"
                title="Skip to Next in Live Queue (Admin/Mod)"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            /* Public Visitors: Local Mute / Unmute Button Only */
            <button
              type="button"
              onClick={handleToggleMute}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                isMuted || volume === 0
                  ? 'bg-[#CE5A46] text-white'
                  : 'bg-[#F7DE85] text-[#1F453B] hover:scale-105'
              }`}
              title={isMuted ? 'Unmute Background Music' : 'Mute Background Music'}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="flex items-center gap-2.5 text-left cursor-pointer group min-w-0"
          >
            <div className="min-w-0 max-w-[155px] sm:max-w-[210px]">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#F7DE85]">
                <Disc3 className={`w-3.5 h-3.5 shrink-0 ${isPlaying ? 'animate-spin' : ''}`} />
                <span className="truncate">
                  {isPlaying
                    ? `Live Audio · ${safeIndex + 1}/${safeQueue.length}`
                    : isMaintenanceMode
                    ? 'Waiting Room Audio'
                    : `Background Music (${safeQueue.length})`}
                </span>
              </div>
              <div className="text-xs font-bold text-white truncate">{activeTrack.title}</div>
            </div>
            <ChevronUp className="w-4 h-4 text-[#F7DE85] group-hover:-translate-y-0.5 transition-transform shrink-0" />
          </button>
        </div>
      ) : (
        /* Expanded Warm Mini-Player & Sequential Queue Card */
        <div className="w-80 sm:w-96 bg-[#FFFDF9] border-2 border-[#DECDB8] rounded-3xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-200">
          {/* Top Header */}
          <div className="bg-[#1F453B] text-[#FDF2CA] px-4 py-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-[#F7DE85]/20 border border-[#F7DE85]/40 flex items-center justify-center shrink-0">
                <Disc3 className={`w-4 h-4 text-[#F7DE85] ${isPlaying ? 'animate-spin' : ''}`} />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#F7DE85] flex items-center gap-1.5">
                  <span>🎵 Teacher's Day Audio ({safeIndex + 1}/{safeQueue.length})</span>
                  {canManageMusic && (
                    <span className="px-1.5 py-0.2 rounded bg-[#F7DE85] text-[#1F453B] text-[9px] font-black">
                      STAFF DJ
                    </span>
                  )}
                </div>
                <div className="text-xs font-bold text-white truncate">{activeTrack.title}</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-[#FDF2CA] transition-colors cursor-pointer shrink-0"
              title="Minimize player"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-3">
            {/* Active Track Info & Status */}
            <div className="p-3 rounded-2xl bg-[#FAF5EB] border border-[#E5D7C3] flex items-center justify-between gap-2.5">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  {getPlatformBadge(activeTrack, false)}
                  <span className="text-[10px] font-bold text-[#7A6B5B]">
                    Track #{safeIndex + 1} of {safeQueue.length}
                  </span>
                </div>
                <div className="text-xs font-bold text-[#231F1D] truncate">{activeTrack.title}</div>
                <div className="text-[11px] text-[#756759] font-body-serif truncate">
                  {activeTrack.subtitle}
                </div>
              </div>

              <span
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 flex items-center gap-1 ${
                  isPlaying
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    : 'bg-[#EFE6D5] text-[#6E5F51]'
                }`}
              >
                <Radio className={`w-3 h-3 ${isPlaying ? 'text-emerald-600 animate-pulse' : ''}`} />
                <span>{isPlaying ? 'Live Audio' : 'Paused'}</span>
              </span>
            </div>

            {streamNotice && (
              <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-[11px] font-bold text-amber-900">
                ✨ {streamNotice}
              </div>
            )}

            {/* Controls Row: Full Broadcast Transport for Admin/Mod vs Volume-Only for Public */}
            {canManageMusic ? (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handlePrevTrack}
                    className="p-2 rounded-xl bg-[#FAF5EB] hover:bg-[#EFE6D5] text-[#3B3026] border border-[#DECDB8] transition-colors cursor-pointer"
                    title="Previous track in live queue"
                  >
                    <SkipBack className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleTogglePlay}
                    className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer ${
                      isPlaying
                        ? 'bg-[#CE5A46] hover:bg-[#B84A39] text-white'
                        : 'bg-[#1F453B] hover:bg-[#16332C] text-[#F7DE85]'
                    }`}
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="w-3.5 h-3.5" />
                        <span>Pause</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" />
                        <span>Play</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleNextTrack}
                    className="p-2 rounded-xl bg-[#FAF5EB] hover:bg-[#EFE6D5] text-[#3B3026] border border-[#DECDB8] transition-colors cursor-pointer"
                    title="Next track in live queue"
                  >
                    <SkipForward className="w-3.5 h-3.5" />
                  </button>

                  {/* Loop Mode Toggle */}
                  <button
                    type="button"
                    onClick={handleCycleLoopMode}
                    className={`p-2 rounded-xl border text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                      loopMode !== 'off'
                        ? 'bg-[#1F453B] text-[#F7DE85] border-[#1F453B]'
                        : 'bg-[#FAF5EB] text-[#6E5F51] border-[#DECDB8]'
                    }`}
                    title={
                      loopMode === 'queue'
                        ? 'Repeat Queue (Sequential Loop)'
                        : loopMode === 'one'
                        ? 'Repeat Single Track'
                        : 'Repeat Off'
                    }
                  >
                    {loopMode === 'one' ? (
                      <Repeat1 className="w-3.5 h-3.5" />
                    ) : (
                      <Repeat className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {/* Shuffle Toggle */}
                  <button
                    type="button"
                    onClick={handleToggleShuffle}
                    className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                      isShuffle
                        ? 'bg-[#CE5A46] text-white border-[#CE5A46]'
                        : 'bg-[#FAF5EB] text-[#6E5F51] border-[#DECDB8]'
                    }`}
                    title={isShuffle ? 'Shuffle On' : 'Shuffle Off (Sequential)'}
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Staff Local Volume Slider */}
                <div className="flex items-center gap-1 flex-1 max-w-[105px]">
                  <button
                    type="button"
                    onClick={handleToggleMute}
                    className="p-1 rounded-lg text-[#55483B] hover:bg-[#FAF5EB] cursor-pointer shrink-0"
                    title={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-3.5 h-3.5 text-[#CE5A46]" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5 text-[#1F453B]" />
                    )}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.02}
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    aria-label="Music volume"
                    className="w-full accent-[#1F453B] cursor-pointer h-1.5 bg-[#E5D7C3] rounded-lg"
                  />
                </div>
              </div>
            ) : (
              /* Public Visitor View: Volume & Mute/Unmute Only */
              <div className="p-2.5 rounded-2xl bg-[#FAF5EB] border border-[#E5D7C3] space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-[#3B3026] flex items-center gap-1.5">
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-3.5 h-3.5 text-[#CE5A46]" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5 text-[#1F453B]" />
                    )}
                    <span>Your Listening Volume</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleToggleMute}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                      isMuted || volume === 0
                        ? 'bg-[#CE5A46] text-white'
                        : 'bg-[#EFE6D5] hover:bg-[#E2D5C1] text-[#3B3026]'
                    }`}
                  >
                    {isMuted || volume === 0 ? 'Unmute Audio' : 'Mute Audio'}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.02}
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    aria-label="Music volume"
                    className="w-full accent-[#1F453B] cursor-pointer h-1.5 bg-[#E5D7C3] rounded-lg"
                  />
                  <span className="text-[10px] font-mono font-bold text-[#6E5F51] w-8 text-right">
                    {isMuted ? '0%' : `${Math.round(volume * 100)}%`}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-[#7A6B5B]">
                  <ShieldCheck className="w-3 h-3 text-[#1F453B] shrink-0" />
                  <span>Live playlist & playback are managed by Admin & Moderators</span>
                </div>
              </div>
            )}

            {/* Sequential Queue Header & Admin/Mod Add URL Drawer Toggle */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C7B68] flex items-center gap-1">
                  <ListMusic className="w-3.5 h-3.5 text-[#1F453B]" />
                  <span>Up Next Queue ({safeQueue.length} Tracks)</span>
                </span>
                {canManageMusic && (
                  <div className="flex items-center gap-2">
                    {safeQueue.length > BUILT_IN_MUSIC_TRACKS.length && (
                      <button
                        type="button"
                        onClick={handleResetToDefaultQueue}
                        className="text-[10px] font-bold text-[#8C5D39] hover:text-red-700 cursor-pointer"
                        title="Reset queue to built-in Teacher's Day tracks"
                      >
                        Reset
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddDrawer((prev) => !prev);
                        setCustomError('');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[#1F453B] hover:bg-[#16332C] text-[#F7DE85] text-[10px] font-bold flex items-center gap-1 cursor-pointer shadow-2xs"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{showAddDrawer ? 'Close' : 'Queue Music Links'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Admin/Mod Only: Add Single or Bulk Multi-URL Queue Drawer */}
              {canManageMusic && showAddDrawer && (
                <div className="mb-2.5 p-3 rounded-2xl bg-[#FAF5EB] border border-[#DECDB8] space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-[#4A3E33]">
                      Audio-Only YouTube, Spotify, SoundCloud & MP3
                    </span>
                    <div className="inline-flex rounded-lg bg-[#EFE6D5] p-0.5 border border-[#DECDB8]">
                      <button
                        type="button"
                        onClick={() => {
                          setAddMode('single');
                          setCustomError('');
                        }}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold cursor-pointer ${
                          addMode === 'single'
                            ? 'bg-[#1F453B] text-[#F7DE85]'
                            : 'text-[#55483B]'
                        }`}
                      >
                        Single URL
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAddMode('bulk');
                          setCustomError('');
                        }}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold cursor-pointer ${
                          addMode === 'bulk'
                            ? 'bg-[#1F453B] text-[#F7DE85]'
                            : 'text-[#55483B]'
                        }`}
                      >
                        Bulk Queue
                      </button>
                    </div>
                  </div>

                  {addMode === 'single' ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={customTitle}
                        onChange={(e) => setCustomTitle(e.target.value)}
                        placeholder="Optional Song Title (auto-detected if blank)"
                        maxLength={70}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#DECDB8] text-xs text-[#231F1D] focus:outline-none focus:border-[#1F453B]"
                      />
                      <input
                        type="url"
                        value={customUrl}
                        onChange={(e) => setCustomUrl(e.target.value)}
                        placeholder="Paste YouTube, Spotify, SoundCloud, or MP3 link..."
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#DECDB8] text-xs text-[#231F1D] focus:outline-none focus:border-[#1F453B]"
                      />
                      {customError && (
                        <div className="text-[10px] font-bold text-red-700">⚠️ {customError}</div>
                      )}
                      <div className="flex items-center justify-end gap-1.5 pt-0.5">
                        <button
                          type="button"
                          disabled={isResolvingTitles}
                          onClick={() => handleAddSingleUrl(true)}
                          className="px-2.5 py-1 rounded-lg bg-white hover:bg-[#EFE6D5] text-[#1F453B] border border-[#DECDB8] text-[11px] font-bold cursor-pointer disabled:opacity-50"
                        >
                          {isResolvingTitles ? 'Loading...' : '⏭ Play Next'}
                        </button>
                        <button
                          type="button"
                          disabled={isResolvingTitles}
                          onClick={() => handleAddSingleUrl(false)}
                          className="px-3 py-1 rounded-lg bg-[#1F453B] hover:bg-[#16332C] text-[#F7DE85] text-[11px] font-bold cursor-pointer disabled:opacity-50"
                        >
                          {isResolvingTitles ? 'Adding...' : '+ Add to Queue'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleAddBulkUrls} className="space-y-2">
                      <textarea
                        rows={3}
                        value={bulkUrlsText}
                        onChange={(e) => setBulkUrlsText(e.target.value)}
                        placeholder={
                          'Paste multiple links (one per line):\nMy Song | https://youtu.be/...\nhttps://open.spotify.com/track/...\nhttps://soundcloud.com/...'
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#DECDB8] text-[11px] text-[#231F1D] focus:outline-none focus:border-[#1F453B] resize-none font-mono"
                      />
                      {customError && (
                        <div className="text-[10px] font-bold text-red-700">⚠️ {customError}</div>
                      )}
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={isResolvingTitles}
                          className="px-3 py-1 rounded-lg bg-[#CE5A46] hover:bg-[#B84A39] text-white text-[11px] font-bold cursor-pointer disabled:opacity-50"
                        >
                          {isResolvingTitles
                            ? 'Resolving Titles...'
                            : 'Queue All Links Sequentially'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* Sequential Play Queue List (Read-Only for Public; Interactive + Delete Bin for Admin/Mod) */}
              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                {safeQueue.map((track, idx) => {
                  const isSelected = idx === safeIndex;
                  return (
                    <div
                      key={track.id}
                      onClick={() => {
                        if (canManageMusic) {
                          handleSelectQueueTrack(idx);
                        }
                      }}
                      className={`px-2.5 py-2 rounded-xl border text-left transition-all flex items-center justify-between gap-2 ${
                        canManageMusic ? 'cursor-pointer' : 'cursor-default'
                      } ${
                        isSelected
                          ? 'bg-[#1F453B] text-white border-[#1F453B] shadow-2xs'
                          : 'bg-white text-[#2B231D] border-[#E5D7C3]' +
                            (canManageMusic ? ' hover:bg-[#FAF5EB]' : '')
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`text-[10px] font-mono font-bold w-4 text-center shrink-0 ${
                            isSelected ? 'text-[#F7DE85]' : 'text-[#8C7B68]'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <Music
                          className={`w-3.5 h-3.5 shrink-0 ${
                            isSelected ? 'text-[#F7DE85]' : 'text-[#8C5D39]'
                          }`}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold truncate">{track.title}</span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {getPlatformBadge(track, isSelected)}
                            <span
                              className={`text-[10px] truncate ${
                                isSelected ? 'text-[#F7DE85]/90' : 'text-[#7A6B5B]'
                              }`}
                            >
                              {track.subtitle}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Queue Reorder & Delete Bin — Strictly visible ONLY to Admins & Moderators */}
                      {canManageMusic && (
                        <div
                          className="flex items-center gap-0.5 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={(e) => handleMoveTrackInQueue(idx, -1, e)}
                            className={`p-1 rounded-md transition-colors cursor-pointer disabled:opacity-30 ${
                              isSelected
                                ? 'text-white/80 hover:text-white hover:bg-white/10'
                                : 'text-[#6E5F51] hover:bg-[#EFE6D5]'
                            }`}
                            title="Move up in queue (Admin/Mod)"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === safeQueue.length - 1}
                            onClick={(e) => handleMoveTrackInQueue(idx, 1, e)}
                            className={`p-1 rounded-md transition-colors cursor-pointer disabled:opacity-30 ${
                              isSelected
                                ? 'text-white/80 hover:text-white hover:bg-white/10'
                                : 'text-[#6E5F51] hover:bg-[#EFE6D5]'
                            }`}
                            title="Move down in queue (Admin/Mod)"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                          {safeQueue.length > 1 && (
                            <button
                              type="button"
                              onClick={(e) => handleRemoveFromQueue(idx, e)}
                              className={`p-1 rounded-md transition-colors cursor-pointer ${
                                isSelected
                                  ? 'text-white/80 hover:text-white hover:bg-white/10'
                                  : 'text-red-600 hover:bg-red-50'
                              }`}
                              title="Delete track from queue (Admin/Mod)"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
