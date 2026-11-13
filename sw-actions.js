// Service Worker background action listener for Android Notification Bar & Web Push controls

// 1. Listen to incoming Web Push notifications from server
self.addEventListener('push', (event) => {
  let payload = {
    title: '🔔 Powiadomienie PrzerwaPro',
    body: 'Powiadomienie z rejestratora przerw',
    tag: 'break-web-push',
    icon: '/pwa-192x192.png',
    badge: '/icon.svg',
    vibrate: [500, 200, 500, 200, 500],
    data: { url: '/?mode=widget' },
  };

  if (event.data) {
    try {
      const json = event.data.json();
      payload = { ...payload, ...json };
    } catch (e) {
      payload.body = event.data.text();
    }
  }

  const notificationOptions = {
    body: payload.body,
    icon: payload.icon || '/pwa-192x192.png',
    badge: payload.badge || '/icon.svg',
    tag: payload.tag || 'break-web-push',
    vibrate: payload.vibrate || [500, 200, 500, 200, 500],
    requireInteraction: true,
    data: payload.data || { url: '/?mode=widget' },
    actions: [
      {
        action: 'stop_break',
        title: '⏹ ZAKOŃCZ PRZERWĘ (STOP)',
      },
      {
        action: 'open_app',
        title: '📱 OTWÓRZ APLIKACJĘ',
      },
    ],
  };

  event.waitUntil(self.registration.showNotification(payload.title, notificationOptions));
});

// 2. Notification click listener
self.addEventListener('notificationclick', (event) => {
  const action = event.action;

  if (action === 'start_break' || action === 'stop_break') {
    const actionType = action === 'start_break' ? 'start' : 'stop';

    if (actionType === 'stop') {
      // Immediately and cleanly dismiss the notification from lock screen
      event.notification.close();

      event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
          if (clientList && clientList.length > 0) {
            for (const client of clientList) {
              client.postMessage({
                type: 'NOTIFICATION_ACTION',
                action: 'stop',
              });
            }
          } else {
            // Only fallback to BroadcastChannel if no window clients were found
            const channel = new BroadcastChannel('break_control_channel');
            channel.postMessage({
              type: 'NOTIFICATION_ACTION',
              action: 'stop',
            });
            setTimeout(() => channel.close(), 1000);
          }
          // NEVER call openWindow for STOP on a locked screen.
          // Calling openWindow while locked causes Android to flash/prompt "Unlock phone".
        })
      );
    } else {
      // actionType === 'start'
      event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
          for (const client of clientList) {
            client.postMessage({
              type: 'NOTIFICATION_ACTION',
              action: 'start',
            });
          }
          if (clientList.length === 0 && self.clients.openWindow) {
            return self.clients.openWindow('./?action=start');
          }
        })
      );
    }
  } else {
    // User clicked the notification body or 'open_app': open/focus the app or widget view
    event.notification.close();
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow('./?mode=widget');
        }
      })
    );
  }
});

// 3. Background alarm scheduler for Warning and Limit Alarms (survives app minimization!)
let scheduledWarningTimer = null;
let scheduledLimitTimer = null;

self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SCHEDULE_BREAK_ALARMS') {
    const { warningTimeMs, limitTimeMs, warningMinutes, allowanceMinutes, appBase } = event.data;
    const base = appBase || '';

    if (scheduledWarningTimer) clearTimeout(scheduledWarningTimer);
    if (scheduledLimitTimer) clearTimeout(scheduledLimitTimer);
    scheduledWarningTimer = null;
    scheduledLimitTimer = null;

    const now = Date.now();

    // 1. Native Android AlarmManager Trigger (if supported by Chrome/Android)
    if (typeof TimestampTrigger !== 'undefined') {
      try {
        if (warningTimeMs && warningTimeMs > now) {
          self.registration.showNotification('⚠️ Zbliża się koniec przerwy!', {
            body: `Zostały tylko ${warningMinutes || 3} minuty z limitu (${allowanceMinutes || 30} min). Czas wracać!`,
            tag: 'break-warning-scheduled',
            icon: `${base}/pwa-192x192.png`,
            badge: `${base}/icon.svg`,
            vibrate: [400, 150, 400, 150, 600],
            renotify: true,
            requireInteraction: true,
            showTrigger: new TimestampTrigger(warningTimeMs),
          });
        }
        if (limitTimeMs && limitTimeMs > now) {
          self.registration.showNotification('⏰ Limit przerwy wykorzystany!', {
            body: `Twój limit ${allowanceMinutes || 30} minut na dzisiaj właśnie się skończył. Wracaj do pracy!`,
            tag: 'break-limit-scheduled',
            icon: `${base}/pwa-192x192.png`,
            badge: `${base}/icon.svg`,
            vibrate: [1000, 300, 1000, 300, 1500],
            renotify: true,
            requireInteraction: true,
            showTrigger: new TimestampTrigger(limitTimeMs),
          });
        }
      } catch (err) {
        console.warn('Native TimestampTrigger failed:', err);
      }
    }

    // 2. Service Worker Background Timers
    if (warningTimeMs && warningTimeMs > now) {
      const delay = Math.max(50, warningTimeMs - now);
      scheduledWarningTimer = setTimeout(() => {
        self.registration.showNotification('⚠️ Zbliża się koniec przerwy!', {
          body: `Zostały tylko ${warningMinutes || 3} minuty z limitu (${allowanceMinutes || 30} min). Czas wracać!`,
          tag: 'break-warning',
          icon: `${base}/pwa-192x192.png`,
          badge: `${base}/icon.svg`,
          vibrate: [400, 150, 400, 150, 600],
          renotify: true,
          requireInteraction: true,
        });
      }, delay);
    }

    if (limitTimeMs && limitTimeMs > now) {
      const delay = Math.max(50, limitTimeMs - now);
      scheduledLimitTimer = setTimeout(() => {
        self.registration.showNotification('⏰ Limit przerwy wykorzystany!', {
          body: `Twój limit ${allowanceMinutes || 30} minut na dzisiaj właśnie się skończył. Wracaj do pracy!`,
          tag: 'break-limit',
          icon: `${base}/pwa-192x192.png`,
          badge: `${base}/icon.svg`,
          vibrate: [1000, 300, 1000, 300, 1500],
          renotify: true,
          requireInteraction: true,
        });
      }, delay);
    }
  } else if (event.data.type === 'CANCEL_BREAK_ALARMS') {
    if (scheduledWarningTimer) clearTimeout(scheduledWarningTimer);
    if (scheduledLimitTimer) clearTimeout(scheduledLimitTimer);
    scheduledWarningTimer = null;
    scheduledLimitTimer = null;

    try {
      if (self.registration.getNotifications) {
        self.registration.getNotifications({ includeTriggered: true }).then((notifs) => {
          if (notifs) {
            notifs.forEach((n) => {
              if (n.tag === 'break-warning-scheduled' || n.tag === 'break-limit-scheduled') {
                n.close();
              }
            });
          }
        });
      }
    } catch {}
  }
});
