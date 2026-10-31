// Home del sito pubblico (e pagine dei paesi e dei prodotti): ricerca in tre passi come nell'app (Dove, Quando,
// Cosa), filtri veloci, pannello Filtri, elenco o schede con foto, preferiti, novità e mercati.
// L'HTML arriva già pronto dal generatore (web/genera/pagine.mjs): qui si aggiunge quello che cambia nel browser.
// La ricerca si apre in una finestra che lavora su una bozza e la applica con "Mostra N masi", come SearchSheet
// nell'app; i filtri veloci e il pannello Filtri cambiano invece la ricerca subito.
import {
  aperto, categoria, esc, giorno, icona, leggiRicerca, nuovaRicerca, ordina, origine, passa, riassunto, riassuntoCosa,
  riassuntoDove, riassuntoQuando, scheda, scriviRicerca, stato, statoScheda, stessaRicerca,
} from './comune.js?v=de8833acec'
import { adesso, aggiornaDom, barra, foglio, frammento, ogniMinuto, pagina } from './browser.js?v=de8833acec'
import {
  chips, daDove, elencoDove, ordinaMercati, pannello, passiFinestra, passiTelefono, quandoMercato,
  scelteFinestra,
} from './viste.js?v=de8833acec'
import { mostraCuori, preferiti, toccaCuore } from './preferiti.js?v=de8833acec'
import { account } from './accedi.js?v=de8833acec'
import { suggerisci } from './suggerisci.js?v=de8833acec'
import { creaCartina } from './cartina.js?v=de8833acec'

const $ = (id) => document.getElementById(id)
const { dati, c } = pagina(document.body.dataset.base ?? './')
const { farms: FARMS, markets: MARKETS } = dati
const T = c.T
const COMUNI = [...new Set(FARMS.map((f) => f.municipality))]
const riduci = () => matchMedia('(prefers-reduced-motion: reduce)').matches
const copia = (x) => nuovaRicerca(JSON.parse(JSON.stringify(x)))
// La curva del sito (--ease-out in sito.css), per le animazioni fatte dal JavaScript.
const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)'
// I preferiti di questo browser (null se non si possono ricordare: allora niente cuori).
const pref = preferiti()
c.preferiti = pref?.set ?? new Set()
// Contano solo i masi che ci sono ancora: uno tolto da Il mio contadino resta salvato (può tornare) ma non fa comparire la pillola.
const quantiPreferiti = () => FARMS.filter((f) => c.preferiti.has(f.slug)).length
let stati = new Map()
let posizione = null

function calcolaStati() {
  c.ora = adesso()
  stati = new Map(FARMS.map((f) => [f.slug, stato(f, c.ora)]))
}
calcolaStati()

// La ricerca sta anche nell'indirizzo: si può condividere e il tasto Indietro la ritrova. Sulle pagine di un paese
// o di un prodotto la ricerca parte già impostata su quello.
const P = new URLSearchParams(location.search)
const preset = nuovaRicerca(dati.preset ?? {})
let r = leggiRicerca(P, COMUNI)
// I preferiti hanno una pagina loro: i vecchi link con "?preferiti=1" (menu dell'account, segnalibri) portano lì.
if (P.get('preferiti')) location.replace(`${c.base}preferiti/`)
r.preferiti = false
if (preset.comune && !P.has('comune')) r.comune = preset.comune
if (preset.prodotti.length && !P.has('prodotto')) r.prodotti = [...preset.prodotti]

const da = (s = r) => origine(s, FARMS, posizione, dati.zona)
const trovati = (s = r) => FARMS.filter((f) => passa(f, s, c, da(s)))
const base = trovati(preset)

function salva() {
  const u = scriviRicerca(r)
  if (P.get('ora')) u.set('ora', P.get('ora'))
  // Uscendo dal paese o dal prodotto della pagina si torna alla home, con la ricerca.
  const fuori = (preset.comune && r.comune !== preset.comune) || (preset.prodotti.length && !preset.prodotti.every((k) => r.prodotti.includes(k)))
  if (fuori) return location.assign(`${c.base}${u.size ? `?${u}` : ''}`)
  if (preset.comune) u.delete('comune')
  if (preset.prodotti.length && r.prodotti.length === preset.prodotti.length) u.delete('prodotto')
  history.replaceState(null, '', u.size ? `?${u}` : location.pathname)
  // Cambiando lingua resta la ricerca; il testo cercato no, perché i nomi dei prodotti cambiano.
  u.delete('q')
  for (const a of document.querySelectorAll('a[hreflang]')) a.href = `${a.href.split('?')[0]}${u.size ? `?${u}` : ''}`
}

// Elenco ---------------------------------------------------------------------------------------
function mostraConteggio(lista) {
  const apertiOra = lista.filter((f) => aperto(stati.get(f.slug))).length
  // Senza scelte "20 masi · 11 aperti adesso"; con una ricerca "3 masi su 20" (su una pagina di paese, su quelli del paese).
  $('conteggio').innerHTML = stessaRicerca(r, preset) ? T.contaTutti(lista.length, apertiOra) : T.contaFiltrati(lista.length, base.length)
}

/**
 * Rifà l'elenco. "dalla" dice da dove arriva il cambio: dalla finestra della ricerca ("Mostra N masi") l'elenco
 * nuovo compare con una dissolvenza e i riassunti cambiano con la loro; dai filtri veloci tutto cambia subito.
 */
function mostra({ entra = false, dallaRicerca = false } = {}) {
  const lista = ordina(trovati(), r, c, da())
  mostraConteggio(lista)
  $('da').innerHTML = daDove(r, !!posizione, c)
  $('elenco').innerHTML = lista.map((f, i) => scheda(f, i, c, { da: da(), prodotto: r.prodotti[0] ?? '', entra, ricerca: r })).join('')
  mostraCuori($('elenco'), pref)
  // Le foto già scaricate compaiono subito (filtri veloci, ordine): la dissolvenza resta per quelle che arrivano ora.
  for (const img of $('elenco').querySelectorAll('img')) if (img.complete && img.naturalWidth) img.classList.add('ok')
  $('elenco').style.visibility = ''
  if (dallaRicerca) $('elenco').animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: EASE_OUT })
  $('vuoto').hidden = lista.length > 0
  vuoto(lista)
  $('ordine').value = r.ordine
  mostraChips({ anima: dallaRicerca })
  riassunti({ anima: dallaRicerca })
  if ($('pannello').open) mostraPannello()
  mostraCartina({ anima: dallaRicerca })
  salva()
  inizioRisultati()
}

// Con una ricerca nuova l'elenco riparte dal primo maso: se si era scesi più in basso, si torna all'inizio dei
// risultati (sotto intestazione e filtri, che restano in alto).
function inizioRisultati() {
  if (inMappa()) return
  const alto = $('filtri').offsetHeight + parseFloat(getComputedStyle($('filtri')).top)
  const inizio = scrollY + $('risultati').getBoundingClientRect().top - alto
  if (scrollY > inizio + 1) scrollTo({ top: inizio, behavior: 'instant' })
}

// Le schede già nella pagina restano dove sono: cambiano solo lo stato e il conteggio, così foto e animazione
// d'ingresso non ripartono.
function aggiornaOra() {
  calcolaStati()
  const perSlug = new Map(FARMS.map((f) => [f.slug, f]))
  for (const li of $('elenco').querySelectorAll('.farm[data-slug]')) {
    const f = perSlug.get(li.dataset.slug)
    if (!f) continue
    // Con Quando su oggi, domani o un giorno le schede dicono gli orari di quel giorno.
    const ora = statoScheda(f, c, r)
    li.querySelector('.status')?.replaceWith(frammento(ora.riga))
    li.querySelector('.photo-status')?.replaceWith(frammento(ora.bollino))
  }
  mostraConteggio(trovati())
  mercati()
  novitaScadute()
  mostraCartina({ inquadra: false })
}

// Cartina (vista "Mappa") ----------------------------------------------------------------------
// Si crea la prima volta che si apre la vista (MapLibre è grande); poi segue la ricerca come l'elenco.
let cartina = null
const inMappa = () => $('cartina') && !$('cartina').hidden

function mostraCartina({ inquadra = true, anima = false } = {}) {
  if (!inMappa()) return
  cartina ??= creaCartina({
    contenitore: $('cartina'),
    cartina: dati.cartina,
    c,
    prepara: (el) => {
      mostraCuori(el, pref)
      el.addEventListener('click', (e) => toccaCuore(e, pref, () => mostraChips()))
    },
  })
  cartina
    .then((m) => {
      m.mostra(ordina(trovati(), r, c, da()), { da: da(), prodotto: r.prodotti[0] ?? '', ricerca: r }, { inquadra, anima })
      m.posizione(posizione)
    })
    // Senza WebGL o senza rete la cartina lo scrive lei; la prossima volta si riprova.
    .catch(() => { cartina = null })
}

// Le novità valgono fino a fine giornata: la pagina può essere di ieri, quindi quelle scadute si tolgono qui.
function novitaScadute() {
  const oggi = giorno(c.ora).iso
  for (const li of document.querySelectorAll('.news-item[data-fino]')) if (li.dataset.fino < oggi) li.remove()
  if (!document.querySelector('.news-item')) $('novita-masi')?.remove()
}

function chiediPosizione() {
  const bottone = $('posizione')
  if (bottone) bottone.textContent = T.unAttimo
  navigator.geolocation?.getCurrentPosition(
    ({ coords }) => {
      posizione = { lat: coords.latitude, lng: coords.longitude }
      mostra()
    },
    () => { if ($('posizione')) $('posizione').textContent = T.posizioneNo },
    { timeout: 8000, maximumAge: 300000 },
  )
}

/** Un testo che cambia per una scelta: entra con una dissolvenza e 4 px di salita (con Riduci movimento, solo dissolvenza). */
function cambiaTesto(el, testo, anima) {
  if (el.textContent === testo) return
  el.textContent = testo
  if (anima) entraTesto(el)
}
const entraTesto = (el) => el.animate(
  riduci() ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }],
  { duration: 160, easing: EASE_OUT },
)

// I riassunti della ricerca: nel riquadro e nel bottone compatto dell'intestazione.
function riassunti({ anima = false } = {}) {
  const testi = { dove: riassuntoDove(r, c), quando: riassuntoQuando(r, c), cosa: riassuntoCosa(r, c) }
  for (const [p, testo] of Object.entries(testi)) {
    const el = document.querySelector(`#barra [data-valore="${p}"]`)
    if (!el) continue
    cambiaTesto(el, testo, anima)
    const vuoto = p === 'dove' ? !r.comune && !r.km : p === 'quando' ? r.quando === 'sempre' : testo === T.tuttiIProdotti
    el.classList.toggle('set', !vuoto)
  }
  const mini = $('mini-ricerca')
  if (mini) {
    mini.querySelector('[data-valore="riassunto"]').textContent = riassunto(r, c)
    mini.setAttribute('aria-label', `${T.ricercaTitolo}: ${riassunto(r, c)}`)
  }
}

/** Una scelta dentro un passo della ricerca, sulla bozza della finestra. */
function cambia(s, el, ui) {
  const d = el.dataset
  if (d.dove) {
    s.comune = ''
    if (!posizione) chiediPosizione()
  } else if (d.comune) s.comune = s.comune === d.comune ? '' : d.comune
  else if (d.km !== undefined) s.km = Number(d.km)
  else if (d.quando) {
    s.quando = d.quando
    if (d.quando === 'giorno' && !s.giorno) Object.assign(s, { giorno: giorno(c.ora, 1).iso, minuto: 600 })
  } else if (d.giorno) s.giorno = d.giorno
  else if (d.categoria) {
    if (s.categorie.includes(d.categoria)) {
      s.categorie = s.categorie.filter((k) => k !== d.categoria)
      // Togliendo la categoria si tolgono anche i suoi prodotti scelti, come nell'app.
      s.prodotti = s.prodotti.filter((k) => categoria(k, c) !== d.categoria)
    } else s.categorie = [...s.categorie, d.categoria]
  } else if (d.prodotto) {
    s.prodotti = s.prodotti.includes(d.prodotto) ? s.prodotti.filter((k) => k !== d.prodotto) : [...s.prodotti, d.prodotto]
  } else if (d.nessuno !== undefined) s.prodotti = []
  else if (d.tutti !== undefined) ui.tutti = !ui.tutti
  else return false
  return true
}

// La ricerca in una finestra -------------------------------------------------------------------
// Si apre dal riquadro, da "Cerca" o dal bottone compatto dell'intestazione. Le scelte restano in una bozza e
// valgono solo con "Mostra N masi"; la X, Esc o un clic fuori chiudono senza cambiare niente, come nell'app.
// Sul computer i tre passi stanno in una colonna a sinistra; sul telefono sono tre riquadri uno sotto l'altro.
// La finestra non si rifà da capo a ogni scelta: cambia solo quello che cambia, così le pillole passano di colore,
// l'evidenziazione scorre al passo nuovo e i riquadri del telefono si aprono crescendo.
const finestra = $('ricerca')
const corpo = $('ricerca-corpo')
const largo = matchMedia('(min-width: 760px)')
const ui = { comune: '', tutti: false }
let bozza = nuovaRicerca()
let passo = 'dove'

const contaBozza = () => { $('ricerca-mostra').textContent = T.mostra(trovati(bozza).length) }

/**
 * Aggiorna la finestra. entra: le scelte del passo compaiono con una dissolvenza (cambio di passo con il mouse);
 * scorri: l'evidenziazione del passo scorre al posto nuovo; anima: i riassunti cambiati entrano con la loro.
 */
function rendiFinestra({ entra = false, scorri = false, anima = false } = {}) {
  const prima = new Map([...corpo.querySelectorAll('[data-riassunto]')].map((el) => [el, el.textContent]))
  const k = document.activeElement?.closest?.('[data-k]')?.dataset.k
  const html = largo.matches
    ? `<div class="sd-layout">${passiFinestra(passo, bozza, c)}${scelteFinestra(passo, bozza, c, FARMS, ui, entra)}</div>`
    : passiTelefono(passo, bozza, c, FARMS, ui)
  aggiornaDom(corpo, html)
  // Se il comando che aveva il fuoco è stato rifatto, il fuoco torna al suo posto.
  if (k && !corpo.contains(document.activeElement)) corpo.querySelector(`[data-k="${CSS.escape(k)}"]`)?.focus({ preventScroll: true })
  if (anima) for (const [el, testo] of prima) if (el.isConnected && el.textContent !== testo) entraTesto(el)
  posizionaEvidenziazione(scorri)
  contaBozza()
}

/** Lo sfondo bianco del passo scelto: scorre in 220 ms con il mouse, si sposta subito da tastiera o all'apertura. */
function posizionaEvidenziazione(scorri) {
  const evidenzia = corpo.querySelector('.sd-indicatore')
  const scelto = corpo.querySelector('.sd-step[aria-selected="true"]')
  if (!evidenzia || !scelto) return
  evidenzia.classList.toggle('fermo', !scorri)
  evidenzia.style.height = `${scelto.offsetHeight}px`
  evidenzia.style.transform = `translateY(${scelto.offsetTop}px)`
  if (!scorri) {
    evidenzia.getBoundingClientRect()
    requestAnimationFrame(() => evidenzia.classList.remove('fermo'))
  }
}

// Mentre si scrive restano il campo e il cursore: cambiano solo il numero e i riassunti dei passi, senza animazione.
function riassuntiBozza() {
  const testi = { dove: riassuntoDove(bozza, c), quando: riassuntoQuando(bozza, c), cosa: riassuntoCosa(bozza, c) }
  for (const el of corpo.querySelectorAll('[data-riassunto]')) el.textContent = testi[el.dataset.riassunto]
  contaBozza()
}

// Il primo comando del passo aperto: il campo di testo, la scelta fatta o il primo bottone.
const primoComando = () => corpo.querySelector('.sd-pane input, .step-card.open .step-dentro input')
  ?? corpo.querySelector('.sd-pane [aria-pressed="true"], .step-card.open .step-dentro [aria-pressed="true"]')
  ?? corpo.querySelector('.sd-pane button, .step-card.open .step-dentro button')

/**
 * Cambia passo. Con il mouse le scelte si dissolvono (computer) o il riquadro cresce (telefono), e l'evidenziazione
 * scorre; da tastiera tutto subito. Il fuoco va sul passo (computer) o sulle scelte.
 */
function vaiAPasso(p, { tastiera = false, fuoco = 'passo', anima = false } = {}) {
  passo = p
  rendiFinestra({ entra: !tastiera, scorri: !tastiera && !riduci(), anima })
  if (largo.matches) {
    const dove = fuoco === 'passo' ? corpo.querySelector(`#passo-${p}`) : primoComando()
    dove?.focus({ preventScroll: true })
    return
  }
  if (tastiera) primoComando()?.focus({ preventScroll: true })
  // Il riquadro aperto scorre in vista, finita la crescita (250 ms); se è più alto dello schermo, dall'inizio.
  const aperto = corpo.querySelector('.step-card.open')
  setTimeout(() => aperto?.scrollIntoView({
    block: aperto.offsetHeight + 24 > corpo.clientHeight ? 'start' : 'nearest',
    behavior: riduci() || tastiera ? 'auto' : 'smooth',
  }), tastiera || riduci() ? 0 : 260)
}

function apriRicerca(p, tastiera = false) {
  bozza = copia(r)
  passo = p
  Object.assign(ui, { comune: '', tutti: false })
  // Aperta da tastiera compare subito: chi usa i tasti non aspetta l'animazione.
  finestra.classList.toggle('subito', tastiera)
  corpo.replaceChildren()
  finestra.showModal()
  rendiFinestra()
  corpo.scrollTop = 0
  // Sul computer si comincia dal primo comando del passo; sul telefono il fuoco va sulla finestra stessa: niente
  // tastiera aperta e niente contorno sulla X (Safari lo mostra al primo fuoco).
  if (largo.matches) primoComando()?.focus({ preventScroll: true })
  else if (!tastiera) {
    finestra.tabIndex = -1
    finestra.focus({ preventScroll: true })
  }
}

function chiudiRicerca(tastiera = false) {
  if (!finestra.open) return
  finestra.classList.toggle('subito', tastiera)
  finestra.close()
}

function mostraRisultati() {
  r = copia(bozza)
  chiudiRicerca()
  mostra({ dallaRicerca: true })
  $('risultati').scrollIntoView({ behavior: riduci() ? 'auto' : 'smooth' })
}

function ricerca() {
  // Il riquadro e il bottone compatto aprono la finestra sul passo cliccato ("Cerca" dal primo).
  $('barra').addEventListener('click', (e) => {
    const b = e.target.closest('[data-passo]')
    if (b) apriRicerca(b.dataset.passo, e.detail === 0)
  })
  $('mini-ricerca')?.addEventListener('click', (e) => apriRicerca('dove', e.detail === 0))

  corpo.addEventListener('click', (e) => {
    const el = e.target.closest('button')
    if (!el) return
    const tastiera = e.detail === 0
    if (el.getAttribute('role') === 'tab') return vaiAPasso(el.dataset.passo, { tastiera })
    if (el.dataset.apri) return vaiAPasso(el.dataset.apri, { tastiera, fuoco: 'scelte' })
    if (!cambia(bozza, el, ui)) return
    // Scelto dove, si passa da soli a Quando; scelto quando (tranne "Scegli giorno e ora"), a Cosa.
    const avanti = el.dataset.dove || (el.dataset.comune && bozza.comune) ? 'quando'
      : el.dataset.quando && el.dataset.quando !== 'giorno' ? 'cosa' : null
    if (avanti) vaiAPasso(avanti, { tastiera, fuoco: tastiera ? 'scelte' : 'passo', anima: true })
    else rendiFinestra({ anima: true })
  })
  corpo.addEventListener('input', (e) => {
    if (e.target.dataset.k === 'cerca-comune') {
      ui.comune = e.target.value
      corpo.querySelector('[data-elenco="comuni"]').innerHTML = elencoDove(FARMS, bozza, c, ui.comune)
    } else if (e.target.dataset.k === 'testo') {
      bozza.q = e.target.value
      riassuntiBozza()
    }
  })
  corpo.addEventListener('change', (e) => {
    if (e.target.dataset.minuto === undefined) return
    bozza.minuto = Number(e.target.value)
    rendiFinestra({ anima: true })
  })
  corpo.addEventListener('keydown', (e) => {
    const tab = e.target.closest('[role="tab"]')
    if (tab && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault()
      const passi = ['dove', 'quando', 'cosa']
      const i = passi.indexOf(tab.dataset.passo) + (e.key === 'ArrowDown' ? 1 : -1)
      return vaiAPasso(passi[(i + passi.length) % passi.length], { tastiera: true })
    }
    if (e.key !== 'Enter' || !e.target.matches('input')) return
    e.preventDefault()
    // Invio nel campo dei comuni sceglie il primo comune della lista (o apre il primo maso); nel campo di testo cerca.
    if (e.target.dataset.k === 'cerca-comune') corpo.querySelector('[data-elenco="comuni"] [data-comune], [data-elenco="comuni"] a')?.click()
    else mostraRisultati()
  })
  largo.addEventListener('change', () => {
    if (!finestra.open) return
    corpo.replaceChildren()
    rendiFinestra()
  })
  addEventListener('resize', () => { if (finestra.open) posizionaEvidenziazione(false) })

  $('ricerca-chiudi').addEventListener('click', (e) => chiudiRicerca(e.detail === 0))
  $('ricerca-togli').addEventListener('click', () => {
    bozza = copia(preset)
    rendiFinestra({ anima: true })
  })
  $('ricerca-mostra').addEventListener('click', mostraRisultati)
  // Esc: si chiude da tastiera, quindi subito. Un clic fuori dalla finestra (iniziato fuori) la chiude.
  finestra.addEventListener('cancel', () => finestra.classList.add('subito'))
  let fuori = false
  finestra.addEventListener('pointerdown', (e) => { fuori = e.target === finestra })
  finestra.addEventListener('click', (e) => { if (fuori && e.target === finestra) chiudiRicerca() })

  // Scorrendo, il riquadro lascia il posto al bottone compatto nell'intestazione.
  const mini = $('mini-ricerca')
  const top = document.querySelector('.top')
  if (!mini) return
  new IntersectionObserver(([voce]) => {
    const compatta = !voce.isIntersecting && voce.boundingClientRect.top < 0
    top.classList.toggle('compatta', compatta)
    mini.tabIndex = compatta ? 0 : -1
    mini.setAttribute('aria-hidden', String(!compatta))
  }, { rootMargin: '-61px 0px 0px 0px' }).observe($('barra'))
}

// Filtri veloci e pannello Filtri: scorciatoie della stessa ricerca -------------------------------
// I filtri veloci si toccano spesso: cambiano subito, senza animazione. Dopo "Mostra N masi" invece le pillole
// nuove (un prodotto con la ×) entrano con la loro.
function mostraChips({ anima = false } = {}) {
  const el = $('chips')
  const html = chips(r, c, { preferiti: quantiPreferiti() })
  el.classList.toggle('subito', !anima)
  if (anima) aggiornaDom(el, html)
  else el.innerHTML = html
  sfumaChips()
}

function sfumaChips() {
  const el = $('chips')
  el.classList.toggle('more', el.scrollLeft + el.clientWidth < el.scrollWidth - 2)
}

function tocca(e) {
  const b = e.target.closest('button')
  if (!b) return
  if (b.id === 'apri-filtri') return apriPannello(e.detail === 0)
  const d = b.dataset
  if (d.veloce === 'ora') r.quando = r.quando === 'ora' ? 'sempre' : 'ora'
  else if (d.veloce) r[d.veloce] = !r[d.veloce]
  else if (d.solo) r[d.solo] = !r[d.solo]
  else if (d.categoria) {
    r.categorie = r.categorie.includes(d.categoria) ? r.categorie.filter((k) => k !== d.categoria) : [...r.categorie, d.categoria]
    if (!r.categorie.includes(d.categoria)) r.prodotti = r.prodotti.filter((k) => categoria(k, c) !== d.categoria)
  } else if (d.ordine) r.ordine = d.ordine
  else if (d.togliProdotto) r.prodotti = r.prodotti.filter((k) => k !== d.togliProdotto)
  else if (d.togliTesto !== undefined) r.q = ''
  else return
  mostra()
}

/**
 * Il riquadro senza risultati dice perché: con "Preferiti" acceso e nessun preferito tra i masi non sono i filtri,
 * è che non ce ne sono (o non più) — allora "Vedi tutti i masi" e come se ne salva uno.
 */
function vuoto(lista) {
  if (lista.length || !FARMS.length) return
  const soloPreferiti = r.preferiti && trovati({ ...r, preferiti: false }).length > 0
  $('vuoto').querySelector('h3').textContent = soloPreferiti ? T.preferitiVuotiTitolo : T.vuotoTitolo
  $('vuoto').querySelector('p').textContent = soloPreferiti ? T.preferitiVuotiTesto : T.vuotoTesto
  $('togli').textContent = soloPreferiti ? T.vediTuttiIMasi : T.togliFiltri
}

function togliTutto() {
  r = copia(preset)
  mostra()
}

// Il pannello Filtri si aggiorna senza rifarsi: le pillole scelte passano di colore in 150 ms.
function mostraPannello() {
  aggiornaDom($('pannello-corpo'), pannello(r, c))
  $('pannello-mostra').textContent = T.mostra(trovati().length)
}

function apriPannello(tastiera) {
  $('pannello-corpo').replaceChildren()
  mostraPannello()
  $('pannello').classList.toggle('subito', tastiera)
  $('pannello').showModal()
  // Come la ricerca: sul telefono il fuoco sulla finestra, non sulla X.
  if (!tastiera) {
    $('pannello').tabIndex = -1
    $('pannello').focus({ preventScroll: true })
  }
}

// Vista elenco, schede con foto o mappa: la vista iniziale la mette già lo script dentro la pagina, qui si cambia.
function vista() {
  $('vista').addEventListener('click', (e) => {
    const b = e.target.closest('button')
    if (!b) return
    scegliVista(b.dataset.vista)
  })
  // Sul telefono, come nell'app, un bottone in basso passa dall'elenco alla mappa e indietro.
  const bottone = $('cambia-vista')
  if (!bottone) return
  bottone.addEventListener('click', () => scegliVista(inMappa() ? ultimaVista : 'mappa'))
  new IntersectionObserver(([e]) => { vicinoAiRisultati = e.isIntersecting; bottoneVista() }).observe($('risultati'))
}

let ultimaVista = $('elenco').classList.contains('grid') ? 'grid' : 'list'
let vicinoAiRisultati = false
const telefono = () => matchMedia('(max-width: 759px)').matches

function bottoneVista() {
  const b = $('cambia-vista')
  // Senza masi non c'è niente da vedere sulla mappa.
  if (!b || !FARMS.length) return
  const mappa = inMappa()
  b.hidden = !(mappa || vicinoAiRisultati)
  b.innerHTML = `${icona(mappa ? 'list' : 'map')}<span>${esc(mappa ? T.elenco : T.mappa)}</span>`
}

// Dove era la pagina prima di aprire la mappa: tornando all'elenco si riparte da lì, non dall'inizio.
let scrollPrimaDellaMappa = null

function scegliVista(v) {
  const mappa = v === 'mappa'
  if (mappa && !inMappa()) scrollPrimaDellaMappa = scrollY
  for (const x of $('vista').querySelectorAll('button')) x.setAttribute('aria-pressed', String(x.dataset.vista === v))
  $('elenco').hidden = mappa
  if ($('cartina')) $('cartina').hidden = !mappa
  // Sul telefono la mappa è a tutto schermo sotto i filtri, che restano fissi in alto: la pagina sotto non scorre.
  document.documentElement.classList.remove('in-mappa')
  if (mappa) {
    if (telefono()) {
      // Prima la classe (tiene la pagina lunga abbastanza), poi i filtri in cima, poi la mappa sotto di loro.
      document.documentElement.classList.add('in-mappa')
      // I risultati subito sotto intestazione e filtri (fissi), senza animazione: la misura sotto dev'essere quella finale.
      const alto = $('filtri').offsetHeight + parseFloat(getComputedStyle($('filtri')).top)
      scrollTo({ top: scrollY + $('risultati').getBoundingClientRect().top - alto, behavior: 'instant' })
      document.documentElement.style.setProperty('--sotto-filtri', `${Math.round(alto)}px`)
    } else $('risultati').scrollIntoView({ block: 'start', behavior: riduci() ? 'auto' : 'smooth' })
    bottoneVista()
    mostraCartina()
    cartina?.then((m) => m.ridisegna())
    return
  }
  // La mappa non si ricorda: si apre quando serve. Elenco e foto sì.
  ultimaVista = v
  $('elenco').className = `farms ${v}`
  try { localStorage.setItem('nostrano.vista', v) } catch {}
  bottoneVista()
  if (scrollPrimaDellaMappa !== null) {
    scrollTo({ top: scrollPrimaDellaMappa, behavior: 'instant' })
    scrollPrimaDellaMappa = null
  }
}

// Mercati, ordinati dal prossimo: si spostano gli elementi che ci sono, senza ricaricare le foto.
function mercati() {
  const lista = $('mercati')
  if (!lista) return
  for (const m of ordinaMercati(MARKETS, c.ora)) {
    const li = lista.querySelector(`[data-slug="${CSS.escape(m.slug)}"]`)
    if (!li) continue
    li.querySelector('[data-quando]').innerHTML = quandoMercato(m, c)
    lista.append(li)
  }
}

// Avvio ----------------------------------------------------------------------------------------
$('chips').addEventListener('click', tocca)
$('chips').addEventListener('scroll', sfumaChips, { passive: true })
addEventListener('resize', sfumaChips)
$('pannello-corpo').addEventListener('click', tocca)
$('ordine').addEventListener('change', (e) => { r.ordine = e.target.value; mostra() })
$('togli').addEventListener('click', togliTutto)
$('pannello-togli').addEventListener('click', togliTutto)
$('pannello-mostra').addEventListener('click', () => $('pannello').close())
$('chiudi').addEventListener('click', () => $('pannello').close())
$('da').addEventListener('click', (e) => { if (e.target.closest('#posizione')) chiediPosizione() })
foglio($('pannello'), $('maniglia'))
// Un cuore cambia solo la pillola "Preferiti" (che compare o sparisce). Con "Preferiti" acceso la scheda tolta resta
// finché l'elenco non si rifà: un tocco per sbaglio si rimedia subito, toccando di nuovo.
$('elenco').addEventListener('click', (e) => toccaCuore(e, pref, () => mostraChips()))

// Il filo sotto i filtri compare solo quando restano attaccati in alto.
const sentinella = document.createElement('div')
$('filtri').before(sentinella)
new IntersectionObserver(([e]) => $('filtri').classList.toggle('stuck', !e.isIntersecting), { rootMargin: '-61px 0px 0px 0px' })
  .observe(sentinella)

$('pannello').addEventListener('cancel', () => $('pannello').classList.add('subito'))

barra()
suggerisci()
account()
ricerca()
vista()
// Con una ricerca nell'indirizzo (condivisa) l'elenco si rifà; altrimenti è già giusto.
if (!stessaRicerca(r, preset)) mostra({ entra: true })
else {
  aggiornaOra()
  riassunti()
  mostraCuori($('elenco'), pref)
  // La pillola "Preferiti" dipende da questo browser: l'HTML pronto non la può avere.
  if (quantiPreferiti()) mostraChips()
  sfumaChips()
}
$('elenco').style.visibility = ''
ogniMinuto(aggiornaOra)
// I preferiti dell'account (arrivati dal server dopo l'accesso): cuori e pillola si rifanno, e con "Preferiti"
// acceso anche l'elenco.
document.addEventListener('preferiti-cambiati', () => {
  if (r.preferiti) return mostra()
  mostraCuori($('elenco'), pref)
  mostraChips()
})
