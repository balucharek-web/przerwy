// Client-side Web Push Service using VAPID and Service Worker PushManager

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

let cachedSubscription: PushSubscription | null = null;

export function isPushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;
}

/**
 * Gets or creates a PushSubscription using the server's VAPID key
 */
export async function getOrRegisterPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;

  try {
    const reg = await navigator.serviceWorker.ready;
    if (!reg.pushManager) return null;

    // Check existing subscription
    let subscription = await reg.pushManager.getSubscription();
    if (subscription) {
      cachedSubscription = subscription;
      return subscription;
    }

    // Fetch server VAPID public key
    const res = await fetch('/api/push/public-key');
    if (!res.ok) return null;
    const { publicKey } = await res.json();
    if (!publicKey) return null;

    const applicationServerKey = urlBase64ToUint8Array(publicKey);
    subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey as unknown as BufferSource,
    });

    cachedSubscription = subscription;
    return subscription;
  } catch (err) {
    console.warn('[WebPush] Error getting push subscription:', err);
    return null;
  }
}

/**
 * Schedules a server-side push notification alarm for active break
 */
export async function scheduleServerPush(params: {
  warningTimeMs: number;
  limitTimeMs: number;
  warningMinutes: number;
  allowanceMinutes: number;
}): Promise<boolean> {
  try {
    const subscription = cachedSubscription || (await getOrRegisterPushSubscription());
    if (!subscription) return false;

    const res = await fetch('/api/push/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription,
        warningTimeMs: params.warningTimeMs,
        limitTimeMs: params.limitTimeMs,
        warningMinutes: params.warningMinutes,
        allowanceMinutes: params.allowanceMinutes,
      }),
    });

    return res.ok;
  } catch (err) {
    console.warn('[WebPush] Failed to schedule push:', err);
    return false;
  }
}

/**
 * Cancels any scheduled push notifications for this device when break stops
 */
export async function cancelServerPush(): Promise<boolean> {
  try {
    const subscription = cachedSubscription || (await getOrRegisterPushSubscription());
    if (!subscription || !subscription.endpoint) return false;

    const res = await fetch('/api/push/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: subscription.endpoint,
      }),
    });

    return res.ok;
  } catch (err) {
    return false;
  }
}

/**
 * Triggers an immediate test Web Push notification from the server
 */
export async function sendTestServerPush(): Promise<{ success: boolean; error?: string }> {
  try {
    const subscription = cachedSubscription || (await getOrRegisterPushSubscription());
    if (!subscription) {
      return {
        success: false,
        error: 'Nie udało się zarejestrować subskrypcji Web Push. Upewnij się, że masz włączone uprawnienia powiadomień.',
      };
    }

    const res = await fetch('/api/push/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { success: false, error: data.error || `HTTP ${res.status}` };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Błąd połączenia z serwerem.' };
  }
}
