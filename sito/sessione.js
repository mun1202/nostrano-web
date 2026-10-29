// L'account sul sito: accesso con email e codice di 6 cifre (Supabase Auth), senza librerie e senza password.
// Come la pagina del produttore (web/assets/api.js) la sessione sta nel browser (localStorage) e si rinnova da
// sola; qui però è un account con email, non un utente anonimo. Senza localStorage non si accede: la sessione
// non si potrebbe ricordare. Niente DOM in questo file, così le prove lo usano anche da Node.
const CHIAVE = 'nostrano.accesso'

export class ErroreApi extends Error {
  constructor(codice, stato = 0) {
    super(codice)
    this.codice = codice
    this.stato = stato
  }
}

/** Vero se il browser lascia ricordare l'accesso (in navigazione privata o con i dati bloccati, no). */
export function puoRicordare(archivio) {
  try {
    // Anche solo leggere localStorage può dare errore (dati del sito bloccati): dentro il try.
    archivio ??= globalThis.localStorage
    archivio.setItem(`${CHIAVE}.prova`, '1')
    archivio.removeItem(`${CHIAVE}.prova`)
    return true
  } catch {
    return false
  }
}

/**
 * La sessione dell'account per il progetto { url, key } (chiave publishable). Restituisce i comandi:
 * inviaCodice, verificaCodice, rpc (le funzioni del database come utente), esci, dimentica.
 */
export function apriSessione({ url, key }, archivio = globalThis.localStorage) {
  const base = url.replace(/\/$/, '')
  const ascoltatori = new Set()
  let inCorso = null

  const leggi = () => { try { return JSON.parse(archivio.getItem(CHIAVE)) } catch { return null } }
  let s = leggi()

  function scrivi(valore) {
    const prima = s?.user_id ?? null
    s = valore
    try {
      if (valore) archivio.setItem(CHIAVE, JSON.stringify(valore))
      else archivio.removeItem(CHIAVE)
    } catch { /* senza localStorage la sessione resta solo in questa pagina */ }
    if ((valore?.user_id ?? null) !== prima) for (const f of ascoltatori) f(valore)
  }

  async function chiama(percorso, { metodo = 'POST', corpo, token } = {}) {
    let risposta
    try {
      risposta = await fetch(`${base}${percorso}`, {
        method: metodo,
        headers: { apikey: key, 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: corpo === undefined ? undefined : JSON.stringify(corpo),
      })
    } catch {
      throw new ErroreApi('network')
    }
    const testo = await risposta.text()
    let dati = null
    try { dati = testo ? JSON.parse(testo) : null } catch { dati = testo }
    if (!risposta.ok) {
      // Supabase Auth: { error_code, msg }; le funzioni del database (PostgREST): { code, message }.
      const codice = dati?.error_code || (risposta.status === 429 ? 'too_many_attempts' : null) || dati?.message || 'failed'
      throw new ErroreApi(codice, risposta.status)
    }
    return dati
  }

  function salva(dati) {
    scrivi({
      access_token: dati.access_token,
      refresh_token: dati.refresh_token,
      expires_at: dati.expires_at ?? Math.floor(Date.now() / 1000) + (dati.expires_in ?? 3600),
      user_id: dati.user?.id ?? s?.user_id ?? null,
      email: dati.user?.email ?? s?.email ?? '',
    })
  }

  /** Un token valido: se sta per scadere si rinnova, una volta sola anche con più chiamate insieme. */
  async function token() {
    // Un'altra scheda può averla già rinnovata (o essere uscita).
    const ultima = leggi()
    if (ultima?.refresh_token !== s?.refresh_token) s = ultima
    if (!s?.refresh_token) throw new ErroreApi('not_signed_in', 401)
    if (s.expires_at - 60 > Date.now() / 1000) return s.access_token
    inCorso ??= (async () => {
      try {
        salva(await chiama('/auth/v1/token?grant_type=refresh_token', { corpo: { refresh_token: s.refresh_token } }))
      } catch (e) {
        // Sessione non più valida (account eliminato, uscito da un altro dispositivo): si esce anche qui.
        if (e.codice !== 'network') scrivi(null)
        throw e.codice === 'network' ? e : new ErroreApi('not_signed_in', 401)
      }
    })().finally(() => { inCorso = null })
    await inCorso
    return s.access_token
  }

  return {
    get attiva() { return !!s?.refresh_token },
    get email() { return s?.email ?? '' },
    get utente() { return s?.user_id ?? null },

    /** f(sessione o null) quando si entra o si esce, anche da un'altra scheda (ricarica()). */
    ascolta(f) { ascoltatori.add(f); return () => ascoltatori.delete(f) },
    ricarica() { const ultima = leggi(); if ((ultima?.user_id ?? null) !== (s?.user_id ?? null)) scrivi(ultima); else s = ultima },

    /** Manda il codice all'email; l'account si crea al primo accesso. */
    async inviaCodice(email) {
      await chiama('/auth/v1/otp', { corpo: { email, create_user: true } })
    },

    async verificaCodice(email, codice) {
      salva(await chiama('/auth/v1/verify', { corpo: { type: 'email', email, token: codice } }))
    },

    /** Una funzione del database come utente dell'account. */
    async rpc(nome, argomenti = {}) {
      const prova = async () => chiama(`/rest/v1/rpc/${nome}`, { corpo: argomenti, token: await token() })
      try {
        return await prova()
      } catch (e) {
        // Token rifiutato prima della scadenza (orologio sbagliato, sessione revocata): un rinnovo e si riprova.
        if (e.stato !== 401 || !s?.refresh_token) throw e
        s = { ...s, expires_at: 0 }
        return prova()
      }
    },

    async esci() {
      const t = s?.access_token
      scrivi(null)
      if (t) await chiama('/auth/v1/logout?scope=local', { token: t }).catch(() => {})
    },

    /** Dopo "Elimina account": la sessione non vale più, si toglie e basta. */
    dimentica() { scrivi(null) },
  }
}

/** Una funzione del database senza accesso (ruolo anon), per esempio get_farm per i giorni pieni aggiornati. */
export async function rpcPubblica({ url, key }, nome, argomenti = {}) {
  let risposta
  try {
    risposta = await fetch(`${url.replace(/\/$/, '')}/rest/v1/rpc/${nome}`, {
      method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json' }, body: JSON.stringify(argomenti),
    })
  } catch {
    throw new ErroreApi('network')
  }
  if (!risposta.ok) throw new ErroreApi('failed', risposta.status)
  return risposta.json()
}
