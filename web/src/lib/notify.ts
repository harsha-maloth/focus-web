// Browser notifications for "session done". The on/off choice is per device (localStorage),
// because permission is per browser too. Nothing is sent to a server.

const KEY = 'focus:notify'

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

/** True only if this device opted in and the browser permission is still granted. */
export function notificationsEnabled(): boolean {
  if (!notificationsSupported() || Notification.permission !== 'granted') return false
  try {
    return window.localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export async function enableNotifications(): Promise<'enabled' | 'denied' | 'unsupported'> {
  if (!notificationsSupported()) return 'unsupported'
  const permission =
    Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission
  if (permission !== 'granted') return 'denied'
  try {
    window.localStorage.setItem(KEY, '1')
  } catch {
    // Not remembered; it will show as off next time.
  }
  return 'enabled'
}

export function disableNotifications(): void {
  try {
    window.localStorage.removeItem(KEY)
  } catch {
    // Nothing to remove.
  }
}

/** Shows a notification if this device opted in. Uses the service worker when there is one (Android needs it). */
export async function notify(title: string, body: string): Promise<void> {
  if (!notificationsEnabled()) return
  try {
    const registration = await navigator.serviceWorker?.getRegistration()
    if (registration) {
      await registration.showNotification(title, { body, icon: `${import.meta.env.BASE_URL}icon-192.png`, tag: 'focus' })
    } else {
      new Notification(title, { body, tag: 'focus' })
    }
  } catch {
    // Blocked or unsupported: the sound and the on-page message still happen.
  }
}
