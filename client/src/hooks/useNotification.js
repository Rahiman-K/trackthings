import { useEffect, useRef } from 'react';

export function useNotification() {
  const permissionRef = useRef(Notification.permission);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(perm => {
        permissionRef.current = perm;
      });
    }
  }, []);

  const notify = (title, body, options = {}) => {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const notification = new Notification(title, {
      body,
      icon: '/vite.svg',
      badge: '/vite.svg',
      vibrate: [200, 100, 200],
      ...options
    });

    // Auto close after 5 seconds
    setTimeout(() => notification.close(), 5000);
    return notification;
  };

  return { notify };
}
