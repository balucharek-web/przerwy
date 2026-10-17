// Web Audio API Synthesizer and Background Audio Keep-Alive for Mobile/Android/iOS Lock Screen

let audioCtx: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function normalizeVolume(volume?: number): number {
  if (volume === undefined || volume === null) return 0.8;
  const num = Number(volume);
  if (isNaN(num)) return 0.8;
  return Math.max(0, Math.min(100, num)) / 100;
}

let silentAudioEl: HTMLAudioElement | null = null;
let silentAudioUrl: string | null = null;

/**
 * Creates a valid 10-second 8-bit mono PCM audio Blob with imperceptible sub-audible micro-oscillation.
 * Unlike flat 0-sample silence which Android DSP power-saving detects and puts to sleep,
 * this tiny 12Hz dither keeps the Android MediaSession service and background timer active
 * continuously without producing any audible sound on phone speakers.
 */
function getSilentAudioUrl(): string {
  if (silentAudioUrl) return silentAudioUrl;
  try {
    const sampleRate = 8000;
    const numSamples = sampleRate * 10; // 10 seconds
    const buffer = new ArrayBuffer(44 + numSamples);
    const view = new DataView(buffer);

    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    // RIFF identifier
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + numSamples, true);
    writeString(8, 'WAVE');

    // fmt subchunk
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, 1, true); // Mono (1 channel)
    view.setUint32(24, sampleRate, true); // Sample rate (8000 Hz)
    view.setUint32(28, sampleRate, true); // Byte rate (8000 * 1 * 1)
    view.setUint16(32, 1, true); // Block align
    view.setUint16(34, 8, true); // Bits per sample (8-bit)

    // data subchunk
    writeString(36, 'data');
    view.setUint32(40, numSamples, true);

    // Sub-audible 12Hz micro-sine wave (swings +/- 1 from 128: 127..129)
    // 12Hz is below human hearing (20Hz+) and phone speakers cannot physically reproduce it,
    // but Android hardware audio pipeline detects non-zero PCM and keeps the media session 100% active.
    const samples = new Uint8Array(buffer, 44, numSamples);
    for (let i = 0; i < numSamples; i++) {
      samples[i] = 128 + Math.round(Math.sin((2 * Math.PI * 12 * i) / sampleRate));
    }

    const blob = new Blob([buffer], { type: 'audio/wav' });
    silentAudioUrl = URL.createObjectURL(blob);
    return silentAudioUrl;
  } catch {
    // Fallback minimal URI
    return 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==';
  }
}

/**
 * Starts silent looping audio to maintain background execution on Android / mobile browsers
 * so notifications and timers keep advancing even when the user switches apps or locks screen.
 */
export function startBackgroundKeepAlive() {
  if (typeof window === 'undefined') return;
  try {
    if (!silentAudioEl) {
      silentAudioEl = new Audio();
      silentAudioEl.src = getSilentAudioUrl();
      silentAudioEl.loop = true;
      silentAudioEl.volume = 0.05;
      silentAudioEl.setAttribute('playsinline', '');
      silentAudioEl.setAttribute('webkit-playsinline', '');
    }
    
    // Ensure src is set
    if (!silentAudioEl.src) {
      silentAudioEl.src = getSilentAudioUrl();
    }

    const playPromise = silentAudioEl.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn('Silent audio keep-alive play deferred until user interaction:', err);
      });
    }
  } catch (e) {
    // Ignore
  }

  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
  } catch (e) {
    // Ignore
  }
}

/**
 * Stops silent background audio keep-alive when break ends
 */
export function stopBackgroundKeepAlive() {
  if (typeof window === 'undefined') return;
  try {
    if (silentAudioEl) {
      silentAudioEl.pause();
      silentAudioEl.currentTime = 0;
    }
  } catch (e) {
    // Ignore
  }
}

/**
 * Plays a distinct 3-minute warning alarm (two-tone chime sequence) with volume control
 */
export function playWarningAlarm(volume: number = 80) {
  const vol = normalizeVolume(volume);
  if (vol <= 0) return;

  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const now = ctx.currentTime;

    const playTone = (freq: number, start: number, duration: number, type: OscillatorType = 'sine') => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, start);

      const targetGain = Math.max(0.001, 0.45 * vol);
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(targetGain, start + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + duration);
    };

    // Sequence: 3 pairs of bell notes (784Hz -> 1046Hz -> 1174Hz)
    playTone(784, now + 0.0, 0.35, 'triangle'); // G5
    playTone(1046, now + 0.25, 0.45, 'sine');   // C6

    playTone(784, now + 0.7, 0.35, 'triangle');
    playTone(1046, now + 0.95, 0.45, 'sine');

    playTone(880, now + 1.4, 0.4, 'triangle');  // A5
    playTone(1174, now + 1.7, 0.6, 'sine');     // D6

    // Vibrate device if supported
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([250, 100, 250, 100, 450]);
      } catch {
        // Ignore
      }
    }
  } catch (err) {
    console.warn('Audio playback failed:', err);
  }
}

/**
 * Plays an urgent limit-reached alarm (when break limit is 0 / fully used) with volume control
 */
export function playLimitReachedAlarm(volume: number = 80) {
  const vol = normalizeVolume(volume);
  if (vol <= 0) return;

  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const now = ctx.currentTime;

    for (let i = 0; i < 5; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = now + i * 0.28;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(950, startTime);
      osc.frequency.exponentialRampToValueAtTime(450, startTime + 0.18);

      const targetGain = Math.max(0.001, 0.4 * vol);
      gain.gain.setValueAtTime(targetGain, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.24);
    }

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([400, 150, 400, 150, 800]);
      } catch {
        // Ignore
      }
    }
  } catch (err) {
    console.warn('Audio playback failed:', err);
  }
}

/**
 * Subtle feedback sound on start or stop with volume control
 */
export function playToggleFeedback(isStart: boolean, volume: number = 80) {
  const vol = normalizeVolume(volume);
  if (vol <= 0) return;

  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    if (isStart) {
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.12); // G5
    } else {
      osc.frequency.setValueAtTime(659.25, now); // E5
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.15); // A4
    }

    const targetGain = Math.max(0.001, 0.2 * vol);
    gain.gain.setValueAtTime(targetGain, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.2);
  } catch (err) {
    // Ignore click sound errors
  }
}

/**
 * Dispatches a system notification with vibration and sound.
 * CRITICAL for Android: On Android Chrome, `new Notification(...)` throws
 * "TypeError: Illegal constructor. Use ServiceWorkerRegistration.showNotification() instead."
 * This helper uses `serviceWorker.ready.showNotification` so vibrations and lock-screen
 * notifications reliably show on Android and desktop.
 */
export interface ExtendedNotificationOptions extends NotificationOptions {
  vibrate?: number | number[];
}

export async function sendSystemNotification(title: string, options?: ExtendedNotificationOptions): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  // Check permission, request if default
  let permission = Notification.permission;
  if (permission === 'default') {
    try {
      permission = await Notification.requestPermission();
    } catch {
      permission = Notification.permission;
    }
  }

  if (permission !== 'granted') {
    return false;
  }

  const origin = window.location.origin;
  const cleanPath = window.location.pathname.replace(/\/+$/, '');
  const appBase = `${origin}${cleanPath}`;
  const notificationOptions: any = {
    icon: `${appBase}/pwa-192x192.png`,
    badge: `${appBase}/icon.svg`,
    vibrate: [400, 150, 400, 150, 600],
    visibility: 'public',
    ...options,
  };

  // 1. Try Service Worker showNotification (works on Android Chrome!)
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        await reg.showNotification(title, notificationOptions as any);
        return true;
      }
    } catch (swErr) {
      console.warn('ServiceWorker showNotification failed, trying fallback:', swErr);
    }
  }

  // 2. Fallback to standard window.Notification (works on desktop Safari/Firefox/Chrome)
  try {
    new Notification(title, notificationOptions);
    return true;
  } catch (notifErr) {
    console.warn('Notification constructor failed:', notifErr);
    return false;
  }
}
