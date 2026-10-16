// Web Audio API Synthesizer for reliable offline sounds without external asset dependencies

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
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
const SILENT_WAV_DATA_URI = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==';

/**
 * Starts silent looping audio to maintain background execution on Android / mobile browsers
 * so notifications and timers keep advancing even when the user switches to other apps.
 */
export function startBackgroundKeepAlive() {
  if (typeof window === 'undefined') return;
  try {
    if (!silentAudioEl) {
      silentAudioEl = new Audio(SILENT_WAV_DATA_URI);
      silentAudioEl.loop = true;
      silentAudioEl.volume = 0.01;
      silentAudioEl.setAttribute('playsinline', '');
      silentAudioEl.setAttribute('webkit-playsinline', '');
    }
    const playPromise = silentAudioEl.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Autoplay may need user gesture, will retry on next user tap
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
    const now = ctx.currentTime;

    const playTone = (freq: number, start: number, duration: number, type: OscillatorType = 'sine') => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, start);

      const targetGain = Math.max(0.001, 0.35 * vol);
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(targetGain, start + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + duration);
    };

    // Sequence: 3 pairs of bell notes (880Hz -> 1046Hz)
    playTone(784, now + 0.0, 0.35, 'triangle'); // G5
    playTone(1046, now + 0.25, 0.45, 'sine');   // C6

    playTone(784, now + 0.7, 0.35, 'triangle');
    playTone(1046, now + 0.95, 0.45, 'sine');

    playTone(880, now + 1.4, 0.4, 'triangle');  // A5
    playTone(1174, now + 1.7, 0.6, 'sine');     // D6

    // Vibrate device if supported
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([200, 100, 200, 100, 400]);
    }
  } catch (err) {
    console.warn('Audio playback failed (browser autoplay restriction or unsupported):', err);
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
    const now = ctx.currentTime;

    for (let i = 0; i < 4; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = now + i * 0.28;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(900, startTime);
      osc.frequency.exponentialRampToValueAtTime(450, startTime + 0.18);

      const targetGain = Math.max(0.001, 0.3 * vol);
      gain.gain.setValueAtTime(targetGain, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.24);
    }

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([400, 150, 400, 150, 600]);
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

    const targetGain = Math.max(0.001, 0.15 * vol);
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
 * Request system notifications permission and send system notification
 */
export async function sendSystemNotification(title: string, options?: NotificationOptions) {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'granted') {
    new Notification(title, {
      icon: '/pwa-192x192.png',
      badge: '/icon.svg',
      ...options,
    });
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      new Notification(title, {
        icon: '/pwa-192x192.png',
        badge: '/icon.svg',
        ...options,
      });
      return true;
    }
  }

  return false;
}
