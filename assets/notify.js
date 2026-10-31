// Notifiche del browser per le richieste nuove. Le manda il server (funzione push), anche a pagina chiusa;
// qui il browser si abbona e il server riceve l'abbonamento, legato al maso di questo browser.
import { ApiError, ROOT, rpc } from './api.js?v=eeaf70f043'

const SCOPE = `${ROOT}modifica/`
const apple = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true
const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

let serverKey = null

const fromBase64url = (text) => Uint8Array.from(atob(text.replaceAll('-', '+').replaceAll('_', '/')), (c) => c.charCodeAt(0))

async function subscription() {
  const registration = await navigator.serviceWorker.getRegistration(SCOPE)
  return registration?.pushManager.getSubscription() ?? null
}

/**
 * Come stanno le notifiche in questo browser:
 * 'on', 'off', 'denied' (bloccate nelle impostazioni), 'home' (iPhone: solo dalla schermata Home),
 * 'unsupported', oppure null se il server non le manda ancora.
 */
export async function pushState() {
  try {
    serverKey = await rpc('push_web_key')
  } catch {
    serverKey = null
  }
  if (!serverKey) return null
  if (!supported) return apple && !standalone ? 'home' : 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  // Il service worker serve già prima del tocco: dopo, il permesso va chiesto subito.
  await navigator.serviceWorker.register(`${SCOPE}sw.js`, { scope: SCOPE })
  return (await subscription()) && Notification.permission === 'granted' ? 'on' : 'off'
}

/** Al tocco: il permesso come prima cosa (Safari lo vuole subito dopo il tocco), poi l'abbonamento. */
export async function enablePush(lang) {
  if (await Notification.requestPermission() !== 'granted') return 'denied'
  const registration = await navigator.serviceWorker.ready
  const current = await registration.pushManager.getSubscription()
  const value = current ?? await registration.pushManager.subscribe({
    userVisibleOnly: true, applicationServerKey: fromBase64url(serverKey),
  })
  await rpc('push_register_web', { p_subscription: value.toJSON(), p_language: lang })
  return 'on'
}

export async function disablePush() {
  const current = await subscription()
  if (current) {
    await rpc('push_unregister_web', { p_endpoint: current.endpoint })
    await current.unsubscribe()
  }
  return 'off'
}

/** Le notifiche arrivano già scritte: quando cambia la lingua il server deve saperlo. */
export async function updateLanguage(lang) {
  const current = await subscription()
  if (current) await rpc('push_register_web', { p_subscription: current.toJSON(), p_language: lang })
}

export async function testPush() {
  const devices = await rpc('push_test')
  if (!devices) throw new ApiError('push_off', 0)
}

/** Quando arriva una notifica con la pagina aperta ({ type: 'push', title }) o se ne tocca una ({ type: 'open' }). */
export function onPush(handler) {
  if (supported) navigator.serviceWorker.addEventListener('message', (event) => handler(event.data ?? {}))
}

/**
 * Su iPhone le notifiche arrivano solo dalla pagina aggiunta alla schermata Home, che ha un suo spazio
 * separato da Safari: per collegarsi al maso le serve il link. Lo si rimette nell'indirizzo, così
 * "Aggiungi alla schermata Home" lo salva (il manifest non ha start_url apposta).
 */
export function prepareHomeScreen(token) {
  if (token) history.replaceState(null, '', `${SCOPE}#link=${encodeURIComponent(token)}`)
}
