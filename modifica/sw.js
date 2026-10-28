// Notifiche del browser per la pagina del maso: le manda il server (supabase/functions/push) anche a pagina chiusa.
// Questo file non tiene niente in cache: serve solo a mostrare le notifiche e ad aprire la pagina quando si toccano.

self.addEventListener('push', (event) => {
  let message = {}
  try { message = event.data?.json() ?? {} } catch { /* notifica senza testo */ }
  event.waitUntil((async () => {
    await self.registration.showNotification(message.title ?? 'Nostrano', {
      body: message.body ?? '',
      tag: message.tag ?? undefined,
      icon: new URL('../assets/icon-192.png', self.registration.scope).href,
      badge: new URL('../assets/icon-192.png', self.registration.scope).href,
      data: { open: message.open },
    })
    // Se la pagina è aperta, ricarica subito le richieste.
    for (const client of await self.clients.matchAll({ type: 'window' })) client.postMessage('push')
  })())
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil((async () => {
    const page = self.registration.scope
    for (const client of await self.clients.matchAll({ type: 'window', includeUncontrolled: true })) {
      if (client.url.startsWith(page)) {
        client.postMessage('push')
        return client.focus()
      }
    }
    return self.clients.openWindow(page)
  })())
})
