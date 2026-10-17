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
  const channel = new BroadcastChannel('break_control_channel');

  if (action === 'start_break' || action === 'stop_break') {
    const actionType = action === 'start_break' ? 'start' : 'stop';

    // Broadcast to active windows
    channel.postMessage({
      type: 'NOTIFICATION_ACTION',
      action: actionType,
    });

    if (actionType === 'stop') {
      event.notification.close();
      // Show instant confirmation on lock screen
      try {
        self.registration.showNotification('✅ Przerwa zakończona', {
          body: 'Pomyślnie zarejestrowano koniec przerwy. Wracaj do pracy!',
          icon: '/pwa-192x192.png',
          badge: '/icon.svg',
          tag: 'przerwa-persistent-control',
          silent: true,
          data: { closedAt: Date.now() },
        });
        setTimeout(async () => {
          const notifs = await self.registration.getNotifications({ tag: 'przerwa-persistent-control' });
          notifs.forEach((n) => n.close());
        }, 3500);
      } catch (e) {
        // Ignore
      }
    }

    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        // Send message to each client
        for (const client of clientList) {
          client.postMessage({
            type: 'NOTIFICATION_ACTION',
            action: actionType,
          });
        }
        // If no clients open, open with action param
        if (clientList.length === 0 && self.clients.openWindow) {
          const targetUrl = actionType === 'start' ? '/?action=start' : '/?action=stop';
          return self.clients.openWindow(targetUrl);
        }
      })
    );
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
