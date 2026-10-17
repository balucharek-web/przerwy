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

let keepAliveOsc: OscillatorNode | null = null;
let keepAliveGain: GainNode | null = null;

/**
 * Starts silent Web Audio keep-alive to maintain background execution on Android / mobile browsers.
 * CRITICAL: We use Web Audio API (AudioContext) instead of an HTML <audio> element.
 * Playing an HTML <audio> element causes Android Chrome to spawn a duplicate Media Player notification!
 * Web Audio API keeps the background audio thread active WITHOUT creating any media player widget!
 */
export function startBackgroundKeepAlive() {
  if (typeof window === 'undefined') return;
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    if (!keepAliveOsc) {
      keepAliveOsc = ctx.createOscillator();
      keepAliveGain = ctx.createGain();

      // Sub-audible 12Hz sine wave with tiny gain (0.0001)
      keepAliveOsc.type = 'sine';
      keepAliveOsc.frequency.setValueAtTime(12, ctx.currentTime);
      keepAliveGain.gain.setValueAtTime(0.0001, ctx.currentTime);

      keepAliveOsc.connect(keepAliveGain);
      keepAliveGain.connect(ctx.destination);
      keepAliveOsc.start();
    }
  } catch (e) {
    // Ignore keep-alive errors
  }
}

/**
 * Stops silent background audio keep-alive when break ends
 */
export function stopBackgroundKeepAlive() {
  if (typeof window === 'undefined') return;
  try {
    if (keepAliveOsc) {
      keepAliveOsc.stop();
      keepAliveOsc.disconnect();
      keepAliveOsc = null;
    }
    if (keepAliveGain) {
      keepAliveGain.disconnect();
      keepAliveGain = null;
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
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('app-sound', { detail: { type: 'warning', volume, timestamp: Date.now() } }));
    }
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
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('app-sound', { detail: { type: 'limit', volume, timestamp: Date.now() } }));
    }
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
  if (typeof window === 'undefined') {
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

  // Always dispatch in-app notification event for preview simulation
  try {
    window.dispatchEvent(
      new CustomEvent('app-notification', {
        detail: {
          title,
          options: notificationOptions,
          timestamp: Date.now(),
        },
      })
    );
  } catch {}

  if (!('Notification' in window)) {
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
