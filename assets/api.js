// Collegamento a Supabase senza librerie: accesso anonimo e chiamate alle funzioni del database.
// Sono le stesse funzioni che usa l'app iOS (supabase/migrations/*_api.sql).
const { url, key } = window.NOSTRANO_CONFIG

/** La cartella del sito: "/" in prova, "/nostrano-web/" su GitHub Pages. La calcola la pagina HTML. */
export const ROOT = window.NOSTRANO_ROOT ?? '/'

/**
 * Il codice del link: /modifica/<token> o /admin/<codice>. Su GitHub Pages arriva dopo il # (#link=<codice>),
 * perché lì 404.html rimanda alla pagina vera.
 */
export function linkCode() {
  const fromPath = location.pathname.slice(ROOT.length).split('/').filter(Boolean)[1]
  const fromHash = new URLSearchParams(location.hash.slice(1)).get('link')
  const code = fromPath ?? fromHash
  return code ? decodeURIComponent(code) : null
}
// Il pannello admin usa un'identità sua, separata da quella dell'area produttore nello stesso browser.
const SESSION_KEY = window.NOSTRANO_SESSION_KEY ?? 'nostrano.session'

export class ApiError extends Error {
  constructor(code, status) {
    super(code)
    this.code = code
    this.status = status
  }
}

function loadSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)) } catch { return null }
}

function saveSession(value) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(value)) } catch { /* navigazione privata */ }
}

let session = loadSession()
let pending = null

async function authRequest(path, { method = 'POST', body, token } = {}) {
  let response
  try {
    response = await fetch(`${url}/auth/v1/${path}`, {
      method,
      headers: { apikey: key, 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body ?? {}),
    })
  } catch {
    throw new ApiError('network', 0)
  }
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new ApiError(data.error_code || (response.status === 429 ? 'too_many_attempts' : 'auth_failed'), response.status)
  return data
}

function setSession(data) {
  session = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at ?? Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600),
    // L'email solo se l'identità è un account: quella anonima non ne ha.
    email: data.user && !data.user.is_anonymous ? data.user.email || null : null,
  }
  saveSession(session)
}

async function auth(path, body) {
  setSession(await authRequest(path, { body }))
}

/** Un'identità anonima per questo browser, come fa l'app: niente account e niente password. */
async function accessToken() {
  if (session && session.expires_at - 60 > Date.now() / 1000) return session.access_token
  // Una sola richiesta alla volta, anche se partono più chiamate insieme.
  pending ??= (async () => {
    if (session?.refresh_token) {
      try {
        await auth('token?grant_type=refresh_token', { refresh_token: session.refresh_token })
        return
      } catch {
        session = null
      }
    }
    await auth('signup', { data: {} })
  })().finally(() => { pending = null })
  await pending
  return session.access_token
}

/** L'email con cui questo browser è entrato; null se l'identità è anonima (il caso normale, con il link). */
export const accountEmail = () => session?.email || null

/**
 * Manda il codice di 6 cifre per entrare con l'email. Dalla pagina del maso l'email si aggiunge a questa identità
 * anonima, che resta collegata al maso; se l'email ha già un account si entra lì e il maso passa all'account
 * (account_merge). Con existingOnly ("Hai salvato l'accesso?") si entra solo in un account che c'è già.
 */
export async function sendCode(email, { existingOnly = false } = {}) {
  if (!existingOnly) {
    try {
      await authRequest('user', { method: 'PUT', body: { email }, token: await accessToken() })
      return { add: true }
    } catch (error) {
      if (error.code !== 'email_exists') throw error
    }
  }
  // Prima, ancora da anonimi, il codice che porterà i dati di questa identità nell'account.
  const linkCode = accountEmail() ? null : await rpc('account_link_code')
  await authRequest('otp', { body: { email, create_user: false } })
  return { linkCode }
}

export async function verifyCode(email, code, step) {
  if (step.add) {
    const data = await authRequest('verify', { body: { type: 'email_change', email, token: code }, token: await accessToken() })
    // Lo stesso utente, ora con l'email: se la risposta non porta la sessione nuova, la si rinnova.
    if (data.access_token) setSession(data)
    else await auth('token?grant_type=refresh_token', { refresh_token: session.refresh_token })
    return
  }
  // Dopo la verifica la sessione è già dell'account: l'unione si chiede da lì.
  setSession(await authRequest('verify', { body: { type: 'email', email, token: code } }))
  if (step.linkCode) await rpc('account_merge', { p_code: step.linkCode })
}

/** Esce da questo browser: alla prossima chiamata si riparte da un'identità anonima nuova. */
export async function signOut() {
  const token = session?.access_token
  session = null
  try { localStorage.removeItem(SESSION_KEY) } catch { /* navigazione privata */ }
  if (token) await authRequest('logout?scope=local', { token }).catch(() => { /* la sessione qui è già tolta */ })
}

export async function rpc(name, args = {}) {
  let response
  try {
    response = await fetch(`${url}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${await accessToken()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
    })
  } catch {
    throw new ApiError('network', 0)
  }
  const text = await response.text()
  let data = null
  try { data = text ? JSON.parse(text) : null } catch { data = text }
  if (!response.ok) throw new ApiError(data?.message || 'request_failed', response.status)
  return data
}

/** Carica un file in Supabase Storage e restituisce l'indirizzo pubblico. */
export async function upload(bucket, path, file) {
  let response
  try {
    response = await fetch(`${url}/storage/v1/object/${bucket}/${path}`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${await accessToken()}`, 'Content-Type': file.type || 'application/octet-stream' },
      body: file,
    })
  } catch {
    throw new ApiError('network', 0)
  }
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new ApiError(data.error || data.message || 'upload_failed', response.status)
  }
  // Sempre un indirizzo intero: in prova `url` è /_supabase, e la foto si deve aprire anche da altre pagine.
  return new URL(`${url}/storage/v1/object/public/${bucket}/${path}`, location.href).href
}

/** Toglie da Supabase Storage i file indicati con il loro indirizzo pubblico; gli altri indirizzi restano. */
export async function removeUploaded(bucket, publicUrls) {
  const prefix = new URL(`${url}/storage/v1/object/public/${bucket}/`, location.href).href
  const prefixes = publicUrls.filter((u) => u.startsWith(prefix)).map((u) => decodeURIComponent(u.slice(prefix.length)))
  if (!prefixes.length) return
  await fetch(`${url}/storage/v1/object/${bucket}`, {
    method: 'DELETE',
    headers: { apikey: key, Authorization: `Bearer ${await accessToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefixes }),
  }).catch(() => { /* resta un file in più, non un errore per chi usa il pannello */ })
}

/** Rimpicciolisce a 1600 px di lato e salva in JPEG: le foto del telefono pesano troppo (pannello e pagina del maso). */
export async function shrink(file) {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
    const canvas = Object.assign(document.createElement('canvas'), {
      width: Math.round(bitmap.width * scale), height: Math.round(bitmap.height * scale),
    })
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))
    return blob ?? file
  } catch {
    return file
  }
}
