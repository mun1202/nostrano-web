// Parti del sito pubblico che servono solo nel browser: l'ora di adesso, il contesto della pagina, la barra in alto.
import { oraDi } from './comune.js?v=764ded37ff'
import { TESTI } from './testi.js?v=764ded37ff'

// Ora di Roma. Per le prove, con "?ora=2026-10-30T10:00" nell'indirizzo il sito fa finta che sia quell'ora.
export function adesso() {
  const forzata = new URLSearchParams(location.search).get('ora')?.match(/^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)$/)
  if (forzata) {
    const [, y, m, d, h, mi] = forzata.map(Number)
    return { y, m, d, min: h * 60 + mi }
  }
  return oraDi()
}

/** I dati che il generatore ha messo nella pagina e il contesto per le regole di comune.js. */
export function pagina(base) {
  const dati = JSON.parse(document.getElementById('dati').textContent)
  const lang = document.documentElement.lang === 'de' ? 'de' : 'it'
  return { dati, c: { lang, T: TESTI[lang], kinds: dati.kinds, ora: adesso(), base } }
}

// La barra in alto prende il filo sotto quando la pagina scorre.
export function barra() {
  const top = document.querySelector('.top')
  const aggiorna = () => top.classList.toggle('scrolled', scrollY > 4)
  addEventListener('scroll', aggiorna, { passive: true })
  aggiorna()
}

/** Ricalcola "aperto ora" ogni minuto e quando si torna sulla pagina: le pagine possono restare aperte a lungo. */
export function ogniMinuto(aggiorna) {
  setInterval(aggiorna, 60_000)
  document.addEventListener('visibilitychange', () => { if (!document.hidden) aggiorna() })
}

/** Un pezzo di HTML pronto da inserire. */
export function frammento(html) {
  const t = document.createElement('template')
  t.innerHTML = html
  return t.content
}

/**
 * Un pannello che sale dal basso sul telefono (finestra sul computer): si chiude anche trascinandolo giù
 * dalla maniglia, o toccando fuori. Lo usano Filtri e "Segnala un errore".
 */
export function foglio(pannello, maniglia) {
  let inizio = null
  let spostamento = 0
  maniglia.addEventListener('pointerdown', (e) => {
    if (inizio) return
    inizio = { y: e.clientY, t: performance.now() }
    spostamento = 0
    pannello.classList.add('dragging')
    maniglia.setPointerCapture(e.pointerId)
  })
  maniglia.addEventListener('pointermove', (e) => {
    if (!inizio) return
    spostamento = e.clientY - inizio.y
    // Verso l'alto si muove sempre meno: non c'è un muro, c'è attrito.
    const y = spostamento > 0 ? spostamento : -Math.sqrt(-spostamento) * 2
    pannello.style.transform = `translateY(${y}px)`
  })
  const lascia = () => {
    if (!inizio) return
    const velocita = spostamento / (performance.now() - inizio.t)
    inizio = null
    pannello.classList.remove('dragging')
    pannello.style.transform = ''
    if (spostamento > 120 || velocita > 0.5) pannello.close()
  }
  maniglia.addEventListener('pointerup', lascia)
  maniglia.addEventListener('pointercancel', lascia)
  pannello.addEventListener('click', (e) => { if (e.target === pannello) pannello.close() })
}

/**
 * Chiama una funzione del database che vuole un utente ("Segnala un errore", "Suggerisci un maso"): un accesso
 * anonimo di Supabase, chiesto solo adesso con la chiave publishable e tenuto solo in memoria. Supabase limita gli
 * accessi anonimi: se dice di no, si lancia un errore e la pagina lo scrive.
 */
export async function chiamaAnonimo({ url, key } = {}, funzione, argomenti) {
  if (!url || !key) throw new Error('senza_progetto')
  const accesso = await fetch(`${url}/auth/v1/signup`, {
    method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json' }, body: JSON.stringify({ data: {} }),
  })
  if (!accesso.ok) throw new Error(`accesso_${accesso.status}`)
  const { access_token: token } = await accesso.json()
  const risposta = await fetch(`${url}/rest/v1/rpc/${funzione}`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(argomenti),
  })
  if (!risposta.ok) throw new Error(`${funzione}_${risposta.status}`)
}

/** Il messaggio d'errore di un modulo; l'email dentro il testo diventa un link, per scriverci subito. */
export function mostraErrore(errore, testo, email = '') {
  const link = Object.assign(document.createElement('a'), { href: `mailto:${email}`, textContent: email })
  errore.replaceChildren(...(email ? testo.split(email).flatMap((pezzo, i) => (i ? [link, pezzo] : [pezzo])) : [testo]))
  errore.hidden = !testo
}

/**
 * Porta il contenuto di "contenitore" a quello di "html" toccando solo quello che cambia: gli elementi che restano
 * tengono il fuoco, e le transizioni CSS (il colore di una pillola, un riquadro che si apre) partono da com'erano.
 * Dove la struttura cambia (un elemento diverso, un altro numero di figli) quel pezzo si sostituisce. Gli elementi
 * con data-tieni (l'evidenziazione del passo, mossa dal JavaScript) restano come sono.
 */
export function aggiornaDom(contenitore, html) {
  allinea(contenitore, frammento(html))
}

function allinea(vecchio, nuovo) {
  const a = [...vecchio.childNodes]
  const b = [...nuovo.childNodes]
  if (a.length !== b.length) return vecchio.replaceChildren(...b)
  a.forEach((x, i) => {
    const y = b[i]
    if (x.nodeType !== y.nodeType || x.nodeName !== y.nodeName || (x.nodeType === 1 && x.dataset.k !== y.dataset.k)) return x.replaceWith(y)
    if (x.nodeType !== 1) {
      if (x.nodeValue !== y.nodeValue) x.nodeValue = y.nodeValue
      return
    }
    if (x.hasAttribute('data-tieni')) return
    for (const { name } of [...x.attributes]) if (!y.hasAttribute(name)) x.removeAttribute(name)
    for (const { name, value } of [...y.attributes]) if (x.getAttribute(name) !== value) x.setAttribute(name, value)
    // Il valore scritto in un campo non segue l'attributo: si allinea a mano.
    if (x.tagName === 'INPUT' && x.value !== (y.getAttribute('value') ?? '')) x.value = y.getAttribute('value') ?? ''
    const scelta = x.tagName === 'SELECT' ? y.querySelector('option[selected]')?.value : null
    allinea(x, y)
    if (scelta != null) x.value = scelta
  })
}
