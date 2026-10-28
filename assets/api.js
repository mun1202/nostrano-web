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

async function auth(path, body) {
  const response = await fetch(`${url}/auth/v1/${path}`, {
    method: 'POST',
    headers: { apikey: key, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new ApiError(data.error_code || 'auth_failed', response.status)
  session = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at ?? Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600),
  }
  saveSession(session)
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
  return `${url}/storage/v1/object/public/${bucket}/${path}`
}

/** Toglie da Supabase Storage i file indicati con il loro indirizzo pubblico; gli altri indirizzi restano. */
export async function removeUploaded(bucket, publicUrls) {
  const prefix = `${url}/storage/v1/object/public/${bucket}/`
  const prefixes = publicUrls.filter((u) => u.startsWith(prefix)).map((u) => decodeURIComponent(u.slice(prefix.length)))
  if (!prefixes.length) return
  await fetch(`${url}/storage/v1/object/${bucket}`, {
    method: 'DELETE',
    headers: { apikey: key, Authorization: `Bearer ${await accessToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefixes }),
  }).catch(() => { /* resta un file in più, non un errore per chi usa il pannello */ })
}
