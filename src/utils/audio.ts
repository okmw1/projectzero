/**
 * Playful synthesized audio feedback & Teacher's Day Multi-Platform Queue Audio Engine
 * Supports:
 * - Built-in polyphonic Web Audio API tracks ('synth')
 * - YouTube links ('youtube')
 * - Spotify links ('spotify')
 * - SoundCloud links ('soundcloud')
 * - Direct audio stream / MP3 / WAV / OGG links ('custom_url')
 */

import { MusicPlatformType, MusicTrack } from '../types';
export type { MusicPlatformType, MusicTrack };

/**
 * Automatically resolves the real song title for YouTube, SoundCloud, or Spotify URLs via noembed oEmbed
 */
export async function resolveMusicTrackTitle(url: string): Promise<string | null> {
  try {
    const resp = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(url.trim())}`);
    if (!resp.ok) return null;
    const data = await resp.json();
    if (data && typeof data.title === 'string' && data.title.trim().length > 0) {
      return data.title.trim().slice(0, 80);
    }
  } catch {
    // Fallback to default title if offline
  }
  return null;
}

export const BUILT_IN_MUSIC_TRACKS: MusicTrack[] = [
  {
    id: 'track-piano-memories',
    title: 'Warm Classroom Memories',
    subtitle: 'Gentle Grand Piano · Built-In',
    type: 'synth',
    presetId: 'piano_memories',
  },
  {
    id: 'track-acoustic-gratitude',
    title: 'Thank You, Dear Teacher',
    subtitle: 'Acoustic Harp & Chimes · Built-In',
    type: 'synth',
    presetId: 'acoustic_gratitude',
  },
  {
    id: 'track-music-box',
    title: 'Golden Dismissal Bell',
    subtitle: 'Music Box Lullaby · Built-In',
    type: 'synth',
    presetId: 'music_box_bell',
  },
  {
    id: 'track-lofi-afternoon',
    title: 'Quiet Afternoon in the Faculty Room',
    subtitle: 'Warm Electric Piano · Built-In',
    type: 'synth',
    presetId: 'lofi_afternoon',
  },
];

/**
 * Parses a single URL (YouTube, Spotify, SoundCloud, or direct MP3/stream link) into a MusicTrack
 */
export function parseMusicUrl(rawUrl: string, customTitle?: string): MusicTrack | null {
  const cleanUrl = rawUrl.trim();
  if (!cleanUrl || !/^https?:\/\/.+/i.test(cleanUrl)) {
    return null;
  }

  const idSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  // 1. Check YouTube (youtube.com/watch?v=..., youtu.be/..., youtube.com/shorts/..., youtube.com/embed/..., music.youtube.com/watch?v=...)
  const ytMatch = cleanUrl.match(
    /(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i
  );
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1&playsinline=1&rel=0${
      origin ? `&origin=${encodeURIComponent(origin)}` : ''
    }`;
    return {
      id: `yt-${videoId}-${idSuffix}`,
      title: (customTitle || `YouTube Music (${videoId})`).slice(0, 75),
      subtitle: 'YouTube Audio / Video Stream',
      type: 'youtube',
      url: cleanUrl,
      embedUrl,
      youtubeId: videoId,
    };
  }

  // 2. Check Spotify (open.spotify.com/track/..., album/..., playlist/..., episode/...)
  const spMatch = cleanUrl.match(
    /open\.spotify\.com\/(?:intl-[a-zA-Z-]+\/)?(track|album|playlist|episode)\/([a-zA-Z0-9]+)/i
  );
  if (spMatch && spMatch[1] && spMatch[2]) {
    const kind = spMatch[1].toLowerCase() as 'track' | 'album' | 'playlist' | 'episode';
    const spotifyId = spMatch[2];
    const embedUrl = `https://open.spotify.com/embed/${kind}/${spotifyId}?utm_source=generator&theme=0`;
    const kindLabel = kind.charAt(0).toUpperCase() + kind.slice(1);
    return {
      id: `sp-${spotifyId}-${idSuffix}`,
      title: (customTitle || `Spotify ${kindLabel} (${spotifyId.slice(0, 6)})`).slice(0, 75),
      subtitle: `Spotify ${kindLabel}`,
      type: 'spotify',
      url: cleanUrl,
      embedUrl,
      spotifyKind: kind,
      spotifyId,
    };
  }

  // 3. Check SoundCloud (soundcloud.com/...)
  if (/soundcloud\.com\/.+/i.test(cleanUrl)) {
    const pathParts = cleanUrl
      .replace(/^https?:\/\/(?:www\.|m\.)?soundcloud\.com\//i, '')
      .split(/[?#]/)[0]
      .split('/')
      .filter(Boolean);
    const slug = pathParts[pathParts.length - 1] || 'Track';
    const prettySlug = decodeURIComponent(slug)
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
    const embedUrl = `https://w.soundcloud.com/player/?url=${encodeURIComponent(
      cleanUrl
    )}&color=%231F453B&auto_play=true&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false`;
    return {
      id: `sc-${idSuffix}`,
      title: (customTitle || prettySlug || 'SoundCloud Track').slice(0, 75),
      subtitle: 'SoundCloud Stream',
      type: 'soundcloud',
      url: cleanUrl,
      embedUrl,
    };
  }

  // 4. Direct Audio Stream / MP3 / WAV / OGG / M4A or other URL
  let inferredTitle = customTitle?.trim() || '';
  if (!inferredTitle) {
    try {
      const parsed = new URL(cleanUrl);
      const lastSegment = parsed.pathname.split('/').filter(Boolean).pop() || '';
      const decoded = decodeURIComponent(lastSegment)
        .replace(/\.(mp3|wav|ogg|m4a|aac|flac|opus)$/i, '')
        .replace(/[-_]+/g, ' ')
        .trim();
      inferredTitle = decoded ? decoded : `Audio Stream (${parsed.hostname.replace(/^www\./, '')})`;
    } catch {
      inferredTitle = 'Custom Audio Track';
    }
  }

  return {
    id: `audio-${idSuffix}`,
    title: inferredTitle.slice(0, 75),
    subtitle: 'Direct Audio Stream',
    type: 'custom_url',
    url: cleanUrl,
  };
}

class SoundEffects {
  private ctx: AudioContext | null = null;

  public getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  playChime() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';

      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc1.frequency.exponentialRampToValueAtTime(1046.5, now + 0.15); // C6

      osc2.frequency.setValueAtTime(659.25, now); // E5
      osc2.frequency.exponentialRampToValueAtTime(1318.5, now + 0.18); // E6

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.36);
      osc2.stop(now + 0.36);
    } catch {
      // Audio playback silently catches in restricted environments
    }
  }

  playHeartSound() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now); // A4
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.08); // A5
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.16); // E5

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.23);
    } catch {
      // Ignore audio failure
    }
  }
}

const sounds = new SoundEffects();
export const playChime = () => sounds.playChime();
export const playHeartSound = () => sounds.playHeartSound();

interface SynthStep {
  melody: number; // Hz (0 for rest)
  bass?: number; // Hz
  harmony?: number[]; // Hz
  duration: number; // seconds
}

// Expressive, warm musical arrangements for each built-in track
const PRESET_SEQUENCES: Record<
  NonNullable<MusicTrack['presetId']>,
  { tempoMs: number; wave: OscillatorType; filterHz: number; steps: SynthStep[] }
> = {
  piano_memories: {
    tempoMs: 650,
    wave: 'triangle',
    filterHz: 1400,
    steps: [
      { melody: 523.25, bass: 130.81, harmony: [261.63, 329.63], duration: 1.3 },
      { melody: 659.25, harmony: [392.0], duration: 0.9 },
      { melody: 587.33, bass: 196.0, harmony: [246.94, 392.0], duration: 1.3 },
      { melody: 493.88, harmony: [293.66], duration: 0.9 },
      { melody: 523.25, bass: 220.0, harmony: [261.63, 329.63], duration: 1.3 },
      { melody: 440.0, harmony: [329.63], duration: 0.9 },
      { melody: 392.0, bass: 164.81, harmony: [246.94, 329.63], duration: 1.3 },
      { melody: 523.25, harmony: [392.0], duration: 0.9 },
      { melody: 440.0, bass: 174.61, harmony: [261.63, 349.23], duration: 1.3 },
      { melody: 523.25, harmony: [349.23], duration: 0.9 },
      { melody: 392.0, bass: 130.81, harmony: [261.63, 329.63], duration: 1.3 },
      { melody: 329.63, harmony: [261.63], duration: 0.9 },
      { melody: 349.23, bass: 146.83, harmony: [220.0, 293.66], duration: 1.3 },
      { melody: 440.0, harmony: [261.63], duration: 0.9 },
      { melody: 392.0, bass: 196.0, harmony: [246.94, 293.66], duration: 1.8 },
      { melody: 493.88, harmony: [392.0], duration: 0.9 },
    ],
  },
  acoustic_gratitude: {
    tempoMs: 560,
    wave: 'sine',
    filterHz: 1800,
    steps: [
      { melody: 698.46, bass: 174.61, harmony: [261.63, 349.23], duration: 1.1 },
      { melody: 659.25, harmony: [440.0], duration: 0.8 },
      { melody: 523.25, harmony: [349.23], duration: 0.8 },
      { melody: 587.33, bass: 196.0, harmony: [246.94, 392.0], duration: 1.1 },
      { melody: 659.25, harmony: [392.0], duration: 0.8 },
      { melody: 783.99, harmony: [493.88], duration: 0.9 },
      { melody: 659.25, bass: 164.81, harmony: [246.94, 329.63], duration: 1.1 },
      { melody: 587.33, harmony: [392.0], duration: 0.8 },
      { melody: 493.88, harmony: [329.63], duration: 0.8 },
      { melody: 523.25, bass: 220.0, harmony: [261.63, 329.63], duration: 1.4 },
      { melody: 440.0, harmony: [329.63], duration: 0.9 },
      { melody: 523.25, harmony: [440.0], duration: 0.9 },
    ],
  },
  music_box_bell: {
    tempoMs: 600,
    wave: 'sine',
    filterHz: 2400,
    steps: [
      { melody: 1046.5, bass: 261.63, harmony: [523.25, 659.25], duration: 1.2 },
      { melody: 783.99, harmony: [659.25], duration: 0.9 },
      { melody: 880.0, bass: 220.0, harmony: [523.25], duration: 1.2 },
      { melody: 659.25, harmony: [523.25], duration: 0.9 },
      { melody: 698.46, bass: 174.61, harmony: [440.0, 523.25], duration: 1.2 },
      { melody: 659.25, harmony: [523.25], duration: 0.9 },
      { melody: 587.33, bass: 196.0, harmony: [392.0, 493.88], duration: 1.4 },
      { melody: 783.99, harmony: [493.88], duration: 0.9 },
    ],
  },
  lofi_afternoon: {
    tempoMs: 740,
    wave: 'triangle',
    filterHz: 950,
    steps: [
      { melody: 493.88, bass: 130.81, harmony: [261.63, 329.63, 392.0], duration: 1.5 },
      { melody: 523.25, harmony: [329.63], duration: 1.0 },
      { melody: 392.0, bass: 110.0, harmony: [220.0, 261.63, 329.63], duration: 1.5 },
      { melody: 440.0, harmony: [261.63], duration: 1.0 },
      { melody: 523.25, bass: 146.83, harmony: [293.66, 349.23, 440.0], duration: 1.5 },
      { melody: 440.0, harmony: [349.23], duration: 1.0 },
      { melody: 493.88, bass: 196.0, harmony: [246.94, 349.23, 392.0], duration: 1.6 },
      { melody: 392.0, harmony: [293.66], duration: 1.0 },
    ],
  },
};

class BackgroundMusicController {
  private timerId: number | null = null;
  private stepIndex = 0;
  private completedCycles = 0;
  private isPlaying = false;
  private volume = 0.45;
  private isMuted = false;
  private currentTrack: MusicTrack = BUILT_IN_MUSIC_TRACKS[0];
  private htmlAudio: HTMLAudioElement | null = null;
  private onErrorCallback: ((msg: string) => void) | null = null;
  private onTrackEndedCallback: (() => void) | null = null;

  public setOnError(cb: ((msg: string) => void) | null) {
    this.onErrorCallback = cb;
  }

  public setOnTrackEnded(cb: (() => void) | null) {
    this.onTrackEndedCallback = cb;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.htmlAudio) {
      this.htmlAudio.volume = this.isMuted ? 0 : this.volume;
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.htmlAudio) {
      this.htmlAudio.volume = this.isMuted ? 0 : this.volume;
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public playTrack(track: MusicTrack) {
    this.stop();
    this.currentTrack = track;
    this.isPlaying = true;
    this.stepIndex = 0;
    this.completedCycles = 0;

    // Embedded platform tracks (YouTube, Spotify, SoundCloud) are rendered via their official iframe players in MusicPlayerWidget
    if (track.type === 'youtube' || track.type === 'spotify' || track.type === 'soundcloud') {
      return;
    }

    if (track.type === 'custom_url' && track.url) {
      try {
        const audio = new Audio(track.url);
        audio.loop = false;
        audio.volume = this.isMuted ? 0 : this.volume;
        audio.onended = () => {
          if (this.onTrackEndedCallback) {
            this.onTrackEndedCallback();
          }
        };
        audio.onerror = () => {
          if (this.onErrorCallback) {
            this.onErrorCallback(`Could not play direct stream "${track.title}". Advancing queue...`);
          }
          if (this.onTrackEndedCallback) {
            this.onTrackEndedCallback();
          } else {
            this.startSynthLoop('piano_memories');
          }
        };
        this.htmlAudio = audio;
        audio.play().catch(() => {
          if (this.onErrorCallback) {
            this.onErrorCallback(`Stream "${track.title}" requires embedded player or direct MP3. Playing Gentle Piano.`);
          }
          this.startSynthLoop('piano_memories');
        });
      } catch {
        this.startSynthLoop('piano_memories');
      }
      return;
    }

    this.startSynthLoop(track.presetId || 'piano_memories');
  }

  private startSynthLoop(presetId: NonNullable<MusicTrack['presetId']>) {
    const preset = PRESET_SEQUENCES[presetId] || PRESET_SEQUENCES.piano_memories;
    const playNextStep = () => {
      if (!this.isPlaying) return;
      const step = preset.steps[this.stepIndex % preset.steps.length];
      this.triggerStepVoices(step, preset.wave, preset.filterHz);
      this.stepIndex += 1;

      // After 2 complete cycles of a built-in arrangement (~20-25s), notify queue so it can advance sequentially
      if (this.stepIndex >= preset.steps.length) {
        this.stepIndex = 0;
        this.completedCycles += 1;
        if (this.completedCycles >= 2 && this.onTrackEndedCallback) {
          this.completedCycles = 0;
          this.onTrackEndedCallback();
        }
      }
    };

    playNextStep();
    this.timerId = window.setInterval(playNextStep, preset.tempoMs);
  }

  private triggerStepVoices(step: SynthStep, wave: OscillatorType, filterHz: number) {
    if (this.isMuted || this.volume <= 0.001) return;
    try {
      const ctx = sounds.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const masterLevel = this.volume * 0.16;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(filterHz, now);
      filter.connect(ctx.destination);

      const playTone = (freq: number, gainScale: number, dur: number, oscType: OscillatorType) => {
        if (!freq || freq <= 0) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = oscType;
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(masterLevel * gainScale, now + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

        osc.connect(gain);
        gain.connect(filter);

        osc.start(now);
        osc.stop(now + dur + 0.03);
      };

      playTone(step.melody, 1.0, step.duration, wave);
      playTone(step.melody * 2, 0.12, step.duration * 0.7, 'sine');

      if (step.bass) {
        playTone(step.bass, 0.55, step.duration * 1.35, 'sine');
      }

      if (step.harmony) {
        step.harmony.forEach((hFreq, idx) => {
          playTone(hFreq, 0.32 - idx * 0.05, step.duration * 1.15, 'sine');
        });
      }
    } catch {
      // Ignore Web Audio errors
    }
  }

  public togglePlay(track?: MusicTrack): boolean {
    if (this.isPlaying) {
      this.stop();
      return false;
    }
    this.playTrack(track || this.currentTrack);
    return true;
  }

  public stop() {
    this.isPlaying = false;
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    if (this.htmlAudio) {
      try {
        this.htmlAudio.onended = null;
        this.htmlAudio.onerror = null;
        this.htmlAudio.pause();
        this.htmlAudio.src = '';
      } catch {
        // ignore
      }
      this.htmlAudio = null;
    }
  }
}

export const musicController = new BackgroundMusicController();
