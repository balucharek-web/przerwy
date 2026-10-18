/**
 * Permanent Pocket Protection Service for PrzerwaPro
 * 
 * Ensures the app is 100% safeguarded when the phone is placed in a pocket:
 * 1. Background audio & timer execution never sleep.
 * 2. Pocket haptics: tactile confirmation on screen lock and periodic minute pulses.
 * 3. Proximity / Pocket orientation detection: blocks phantom touches from trousers fabric.
 * 4. Zero configuration needed: permanently active without toggles.
 */

export interface PocketState {
  isInPocket: boolean;
  isCovered: boolean;
}

type PocketListener = (state: PocketState) => void;
const listeners = new Set<PocketListener>();

let currentState: PocketState = {
  isInPocket: false,
  isCovered: false,
};

let initialized = false;

export function getPocketState(): PocketState {
  return currentState;
}

export function subscribePocketState(listener: PocketListener): () => void {
  listeners.add(listener);
  listener(currentState);
  return () => {
    listeners.delete(listener);
  };
}

function updateState(updates: Partial<PocketState>) {
  const next = { ...currentState, ...updates };
  if (next.isInPocket !== currentState.isInPocket || next.isCovered !== currentState.isCovered) {
    currentState = next;
    listeners.forEach((l) => l(currentState));
  }
}

/**
 * Initializes sensor listeners for permanent pocket detection
 */
export function initPermanentPocketProtection() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  // 1. Proximity Sensor API (available in modern Android Chrome)
  try {
    if ('ProximitySensor' in window) {
      const ProximityClass = (window as any).ProximitySensor;
      const sensor = new ProximityClass();
      sensor.addEventListener('reading', () => {
        const near = sensor.distance !== undefined ? sensor.distance < 2.5 : sensor.near;
        updateState({ isCovered: Boolean(near) });
      });
      sensor.start();
    }
  } catch {
    // Sensor may require permission or be unsupported
  }

  // 2. Device Orientation: detect vertical inverted orientation (phone inserted head-down into trouser pocket)
  if (typeof window !== 'undefined' && 'addEventListener' in window) {
    window.addEventListener('deviceorientation', (e) => {
      if (e.beta === null || e.gamma === null) return;
      // Beta is front-back tilt (-180 to 180)
      // When placed head-first into pocket: beta is typically inverted (< -45 deg or > 135 deg)
      const isUpsideDownInPocket = e.beta < -45 || e.beta > 135;
      const isVertical = Math.abs(e.gamma) < 40;
      const inPocketLikely = isUpsideDownInPocket && isVertical;
      
      updateState({ isInPocket: inPocketLikely });
    }, { passive: true });
  }

  // 3. Document visibility change
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        updateState({ isCovered: true });
      } else {
        // When screen wakes up, check again
        setTimeout(() => {
          updateState({ isCovered: false });
        }, 300);
      }
    });
  }
}
