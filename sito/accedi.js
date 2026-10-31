// L'account sul sito, facoltativo: nell'intestazione "Accedi" o l'icona con il menu (Le mie richieste, Il tuo
// account, Esci), il pannello "Accedi" (email → codice di 6 cifre → fatto) e il pallino quando un maso ha cambiato
// lo stato di una richiesta dall'ultima visita. Al primo accesso i preferiti del browser si uniscono a quelli
// dell'account; dopo, quelli dell'account valgono su ogni dispositivo. La sessione la tiene sessione.js.
import { esc, icona } from './comune.js?v=814dc9da84'
import { foglio, mostraErrore } from './browser.js?v=814dc9da84'
import { preferiti } from './preferiti.js?v=814dc9da84'
import { apriSessione, puoRicordare } from './sessione.js?v=814dc9da84'
import { TESTI } from './testi.js?v=814dc9da84'

const T = TESTI[document.documentElement.lang === 'de' ? 'de' : 'it']
const $ = (id) => document.getElementById(id)
// Il codice dura 10 minuti (supabase/config.toml, otp_expiry); un nuovo invio dopo 60 secondi.
const DURATA_CODICE = 600
const ATTESA_INVIO = 60
// Gli stati delle richieste già visti, per il pallino: solo identificativo e stato, in questo browser.
const VISTE = 'nostrano.richieste-viste'

let progettoLetto
/** Indirizzo del progetto e chiave publishable scritti dal generatore; null se la pagina non li ha. */
export function progetto() {
  if (progettoLetto === undefined) {
    try { progettoLetto = JSON.parse($('progetto')?.textContent ?? 'null') } catch { progettoLetto = null }
  }
  return progettoLetto?.url && progettoLetto?.key ? progettoLetto : null
}

let sessione
/** La sessione dell'account, la stessa per tutti i pezzi della pagina; null senza progetto o senza localStorage. */
export function sessioneSito() {
  if (sessione === undefined) sessione = progetto() && puoRicordare() ? apriSessione(progetto()) : null
  return sessione
}

// Le richieste dell'account, lette una volta per pagina: servono al pallino, al nome già scritto e alla pagina.
let richieste = null
export async function mieRichieste({ ricarica = false } = {}) {
  const s = sessioneSito()
  if (!s?.attiva) return []
  if (!richieste || ricarica) richieste = s.rpc('my_requests').catch((e) => { richieste = null; throw e })
  return richieste
}

const leggiViste = () => { try { return JSON.parse(localStorage.getItem(VISTE)) ?? {} } catch { return {} } }

/** Le richieste che un maso ha cambiato da quando le hai guardate (come unseenRequestChanges nell'app). */
export function cambiate(lista) {
  const viste = leggiViste()
  return lista.filter((r) => r.status !== 'waiting' && r.status !== 'cancelled' && viste[r.id] !== r.status)
}

/** Da "Le mie richieste": tutto quello che c'è è visto. Si tengono solo le richieste di adesso. */
export function segnaViste(lista) {
  try { localStorage.setItem(VISTE, JSON.stringify(Object.fromEntries(lista.map((r) => [r.id, r.status])))) } catch { /* niente pallino */ }
  pallino(false)
}

// Intestazione ---------------------------------------------------------------------------------

function pallino(acceso) {
  for (const el of document.querySelectorAll('[data-pallino]')) el.hidden = !acceso
  $('conto-bottone')?.setAttribute('aria-label', acceso ? `${T.menuAccount} · ${T.cambiamenti}` : T.menuAccount)
}

function intestazione() {
  const posto = $('conto')
  if (!posto) return
  const s = sessioneSito()
  posto.hidden = false
  if (!s?.attiva) {
    posto.innerHTML = `<button class="account-btn" type="button" data-accedi aria-haspopup="dialog" aria-label="${esc(T.accedi)}">${icona('user')}<span>${esc(T.accedi)}</span></button>`
    return
  }
  posto.innerHTML = `<button class="account-btn signed" type="button" id="conto-bottone" aria-expanded="false" aria-controls="conto-menu" aria-label="${esc(T.menuAccount)}">${icona('user')}<span class="account-dot" data-pallino hidden></span></button>
    <div class="account-menu" id="conto-menu">
      <p class="account-email">${esc(s.email)}</p>
      <a href="${esc(posto.dataset.preferiti)}">${icona('heart')}<span>${esc(T.preferiti)}</span></a>
      <a href="${esc(posto.dataset.richieste)}">${icona('bag')}<span>${esc(T.leMieRichieste)}</span><span class="account-dot" data-pallino hidden></span></a>
      <a href="${esc(posto.dataset.account)}">${icona('user')}<span>${esc(T.tuoAccount)}</span></a>
      <button type="button" data-esci>${icona('logout')}<span>${esc(T.esci)}</span></button>
    </div>`
  // Il pallino: solo se un maso ha cambiato qualcosa dall'ultima volta in "Le mie richieste".
  mieRichieste().then((lista) => pallino(cambiate(lista).length > 0)).catch(() => {})
}

function menu(apri) {
  const bottone = $('conto-bottone')
  const elenco = $('conto-menu')
  if (!bottone || !elenco) return
  const aperto = apri ?? bottone.getAttribute('aria-expanded') !== 'true'
  bottone.setAttribute('aria-expanded', String(aperto))
  elenco.classList.toggle('open', aperto)
  if (aperto) elenco.querySelector('a')?.focus({ preventScroll: true })
}

// Il pannello "Accedi" -------------------------------------------------------------------------

let attesa = null
let inviatoAlle = 0
let contoAllaRovescia = null
let perRichiesta = false

function passo(quale) {
  for (const id of ['accedi-email', 'accedi-codice', 'accedi-fatto', 'accedi-senza']) $(id).hidden = id !== quale
  const avanti = $('accedi-avanti')
  avanti.hidden = quale === 'accedi-fatto' || quale === 'accedi-senza'
  avanti.setAttribute('form', quale)
  avanti.disabled = false
  avanti.textContent = quale === 'accedi-codice' ? T.entra : T.mandamiCodice
  $('accedi-annulla').textContent = avanti.hidden ? T.chiudi : T.annulla
}

function messaggio(e, fase) {
  if (e.codice === 'network') return T.erroreRete
  if (e.stato === 429 || /rate_limit|too_many/.test(e.codice)) return T.troppiTentativi
  if (fase === 'email' && (e.stato === 400 || e.stato === 422 || /email|validation/.test(e.codice))) return T.emailSbagliata
  if (fase === 'codice' && (e.codice === 'otp_expired' || e.stato === 403 || e.stato === 400)) {
    return Date.now() / 1000 - inviatoAlle > DURATA_CODICE ? T.codiceScaduto : T.codiceSbagliato
  }
  return T.erroreRete
}

function rimanda() {
  const bottone = $('accedi-rimanda')
  clearInterval(contoAllaRovescia)
  const aggiorna = () => {
    const resta = Math.ceil(inviatoAlle + ATTESA_INVIO - Date.now() / 1000)
    bottone.disabled = resta > 0
    bottone.textContent = resta > 0 ? T.rimandaTra(resta) : T.rimanda
    if (resta <= 0) clearInterval(contoAllaRovescia)
  }
  aggiorna()
  contoAllaRovescia = setInterval(aggiorna, 1000)
}

async function mandaCodice(email) {
  await sessioneSito().inviaCodice(email)
  inviatoAlle = Date.now() / 1000
  try { sessionStorage.setItem('nostrano.accesso-in-corso', JSON.stringify({ email, inviatoAlle })) } catch { /* resta in memoria */ }
}

function chiudiAccesso(riuscito) {
  clearInterval(contoAllaRovescia)
  const pannello = $('accedi')
  if (pannello.open) pannello.close()
  attesa?.(riuscito)
  attesa = null
}

/**
 * Apre "Accedi". Si risolve con true quando l'accesso è fatto, false se si chiude prima. Con perRichiesta dice
 * che serve per mandare la richiesta e, appena dentro, si chiude da solo: la richiesta parte.
 */
export function apriAccesso({ perRichiesta: pr = false } = {}) {
  const pannello = $('accedi')
  if (!pannello) return Promise.resolve(false)
  perRichiesta = pr
  attesa?.(false)
  const promessa = new Promise((ok) => { attesa = ok })
  $('accedi-perche').textContent = pr ? T.accediPerRichiesta : T.accediPerche
  mostraErrore($('accedi-errore-email'), '')
  mostraErrore($('accedi-errore-codice'), '')
  $('accedi-rimandato').hidden = true
  if (!sessioneSito()) {
    passo('accedi-senza')
  } else {
    // Un codice chiesto poco fa in questa scheda (per esempio prima di passare all'app della posta): si riprende da lì.
    let inCorso = null
    try { inCorso = JSON.parse(sessionStorage.getItem('nostrano.accesso-in-corso')) } catch { /* niente */ }
    if (inCorso?.email && Date.now() / 1000 - inCorso.inviatoAlle < DURATA_CODICE) {
      inviatoAlle = inCorso.inviatoAlle
      $('accedi-indirizzo').textContent = inCorso.email
      $('accedi-email').elements.email.value = inCorso.email
      $('accedi-codice').elements.codice.value = ''
      passo('accedi-codice')
      rimanda()
    } else {
      passo('accedi-email')
    }
  }
  pannello.showModal()
  const campo = !$('accedi-codice').hidden ? $('accedi-codice').elements.codice : $('accedi-email').elements.email
  if (!$('accedi-senza').hidden) $('accedi-annulla').focus()
  else campo.focus()
  return promessa
}

function preparaPannello() {
  const pannello = $('accedi')
  if (!pannello || pannello.dataset.pronto) return
  pannello.dataset.pronto = '1'
  const moduloEmail = $('accedi-email')
  const moduloCodice = $('accedi-codice')
  const avanti = $('accedi-avanti')

  moduloEmail.addEventListener('submit', async (e) => {
    e.preventDefault()
    const email = moduloEmail.elements.email.value.trim().toLowerCase()
    const errore = $('accedi-errore-email')
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      mostraErrore(errore, email ? T.emailSbagliata : T.scriviEmail)
      return moduloEmail.elements.email.focus()
    }
    mostraErrore(errore, '')
    avanti.disabled = true
    avanti.textContent = T.invio
    try {
      await mandaCodice(email)
      $('accedi-indirizzo').textContent = email
      moduloCodice.elements.codice.value = ''
      mostraErrore($('accedi-errore-codice'), '')
      $('accedi-rimandato').hidden = true
      passo('accedi-codice')
      rimanda()
      moduloCodice.elements.codice.focus()
    } catch (err) {
      mostraErrore(errore, messaggio(err, 'email'))
      avanti.disabled = false
      avanti.textContent = T.mandamiCodice
    }
  })

  const campo = moduloCodice.elements.codice
  // Un campo solo: si incolla anche "123 456" o "Il tuo codice: 123456"; con sei cifre si entra da soli.
  campo.addEventListener('input', () => {
    const cifre = campo.value.replace(/\D/g, '').slice(0, 6)
    if (campo.value !== cifre) campo.value = cifre
    if (cifre.length === 6 && !avanti.disabled) moduloCodice.requestSubmit()
  })
  moduloCodice.addEventListener('submit', async (e) => {
    e.preventDefault()
    const codice = campo.value.replace(/\D/g, '')
    const errore = $('accedi-errore-codice')
    $('accedi-rimandato').hidden = true
    if (codice.length !== 6) {
      mostraErrore(errore, T.scriviCodice)
      return campo.focus()
    }
    mostraErrore(errore, '')
    avanti.disabled = true
    avanti.textContent = T.controllo
    const email = $('accedi-indirizzo').textContent
    try {
      await sessioneSito().verificaCodice(email, codice)
      try { sessionStorage.removeItem('nostrano.accesso-in-corso') } catch { /* niente */ }
      if (perRichiesta) return chiudiAccesso(true)
      $('accedi-fatto-testo').textContent = T.dentroTesto(email)
      passo('accedi-fatto')
      $('accedi-annulla').focus()
      attesa?.(true)
      attesa = null
    } catch (err) {
      mostraErrore(errore, messaggio(err, 'codice'))
      avanti.disabled = false
      avanti.textContent = T.entra
      campo.select()
    }
  })
  $('accedi-rimanda').addEventListener('click', async () => {
    const email = $('accedi-indirizzo').textContent
    $('accedi-rimanda').disabled = true
    mostraErrore($('accedi-errore-codice'), '')
    try {
      await mandaCodice(email)
      $('accedi-rimandato').hidden = false
      campo.value = ''
      campo.focus()
    } catch (err) {
      mostraErrore($('accedi-errore-codice'), messaggio(err, 'email'))
    }
    rimanda()
  })
  $('accedi-cambia').addEventListener('click', () => {
    try { sessionStorage.removeItem('nostrano.accesso-in-corso') } catch { /* niente */ }
    clearInterval(contoAllaRovescia)
    passo('accedi-email')
    moduloEmail.elements.email.select()
  })
  $('accedi-annulla').addEventListener('click', () => chiudiAccesso(sessioneSito()?.attiva ?? false))
  $('accedi-chiudi').addEventListener('click', () => chiudiAccesso(sessioneSito()?.attiva ?? false))
  // Esc, trascinare giù o toccare fuori: come Annulla.
  pannello.addEventListener('close', () => { clearInterval(contoAllaRovescia); attesa?.(sessioneSito()?.attiva ?? false); attesa = null })
  foglio(pannello, $('accedi-maniglia'))
}

// Preferiti con l'account ----------------------------------------------------------------------

/** Con l'account i preferiti stanno anche sul server: al primo accesso si uniscono, poi vale quello del server. */
async function preferitiDalServer(unisci) {
  const p = preferiti()
  const s = sessioneSito()
  if (!p || !s?.attiva) return
  try {
    const lista = unisci ? await s.rpc('favorites_merge', { p_farms: [...p.set] }) : await s.rpc('my_favorites')
    p.sostituisci(lista)
  } catch { /* restano quelli del browser */ }
}

let pronto = false
/** Prepara intestazione e pannello: lo chiamano tutte le pagine. */
export function account() {
  if (pronto || !progetto()) return
  pronto = true
  preparaPannello()
  const s = sessioneSito()
  const p = preferiti()
  // Un cuore toccato con l'account si salva anche sul server.
  if (p) p.alServer = (slug, si) => (s?.attiva ? s.rpc('favorite_set', { p_farm: slug, p_on: si }).catch(() => {}) : null)
  intestazione()
  if (s?.attiva) preferitiDalServer(false)
  s?.ascolta((nuova) => {
    richieste = null
    intestazione()
    if (nuova) preferitiDalServer(true)
  })
  // Entrato o uscito da un'altra scheda.
  addEventListener('storage', (e) => { if (e.key === 'nostrano.accesso') s?.ricarica() })

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-accedi]')) return apriAccesso()
    if (e.target.closest('#conto-bottone')) return menu()
    if (e.target.closest('[data-esci]')) {
      menu(false)
      return s?.esci()
    }
    if (!e.target.closest('#conto-menu')) menu(false)
  })
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || $('conto-bottone')?.getAttribute('aria-expanded') !== 'true') return
    menu(false)
    $('conto-bottone').focus()
  })
  document.addEventListener('focusin', (e) => { if (!e.target.closest('#conto')) menu(false) })
  // Tornando sulla pagina il pallino si aggiorna.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden || !s?.attiva) return
    mieRichieste({ ricarica: true }).then((lista) => pallino(cambiate(lista).length > 0)).catch(() => {})
  })
}
