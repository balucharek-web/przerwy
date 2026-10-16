// Service Worker background action listener for Android Notification Bar controls
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
          const targetUrl = actionType === 'start' ? './?action=start' : './?action=stop';
          return self.clients.openWindow(targetUrl);
        }
      })
    );
  } else {
    // User clicked the notification body: open/focus the app or widget view
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
