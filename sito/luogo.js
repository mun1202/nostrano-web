// "Indirizzo del maso": un solo riquadro al posto di comune, indirizzo e coordinate. Lo usano il pannello admin (scheda
// del maso) e "Chiedi il tuo link" del sito.
//   scegli  si scrive e la ricerca parte da sola (Photon, web/sito/indirizzo.js) dopo una breve pausa; i luoghi
//           compaiono sotto la casella. La mappa (web/sito/punto.js) è sempre lì: il luogo scelto ci va con il
//           segnaposto, e si può anche toccare il maso direttamente. "Conferma l'indirizzo".
//   fatto   una riga con l'indirizzo e "Cambia".
// cambia(luogo) arriva alla conferma: { indirizzo, comune, comuni, lat, lng }. Senza cartina non c'è la mappa.
import { esc } from './comune.js?v=eeaf70f043'
import { cercaIndirizzo, luogoDelPunto } from './indirizzo.js?v=eeaf70f043'
import { mappaPunto } from './punto.js?v=eeaf70f043'

// La pausa dopo l'ultima lettera prima di cercare: a ogni lettera sarebbero troppe richieste per Photon.
const PAUSA = 450
// Spostando il segnaposto di poco l'indirizzo trovato resta; più in là è un altro posto, e si cerca da lì.
const VICINO = 300
// Pochi luoghi: l'elenco non deve coprire la mappa.
const QUANTI = 4
// Senza mappa la ricerca preferisce i luoghi intorno all'Alto Adige, dove sono oggi i masi.
const ZONA = { lat: 46.62, lng: 11.33 }

const STILE = `
.luogo { display: grid; gap: 10px; }
.luogo-campo { position: relative; }
.luogo-campo input { width: 100%; }
.luogo-trovati { display: grid; gap: 4px; margin: 6px 0 0; padding: 0; list-style: none; }
.luogo-trovati:empty { display: none; }
.luogo-trovato { width: 100%; padding: 10px 12px; border: 1px solid var(--line-strong, #d4d4d8); border-radius: 12px;
  background: #fff; color: var(--ink, #18181b); font: inherit; font-size: 14px; font-weight: 500; text-align: left; cursor: pointer; }
.luogo-trovato:hover, .luogo-trovato:focus-visible { border-color: var(--ink, #18181b); outline: 0; }
.luogo-nota { margin: 0; color: var(--muted, #71717a); font-size: 13px; }
.luogo-nota:empty { display: none; }
.luogo-mappa { height: 240px; overflow: hidden; border: 1px solid var(--line, #e4e4e7); border-radius: 12px; }
.luogo-azioni { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
.luogo-fatto { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border: 1px solid var(--line, #e4e4e7);
  border-radius: 12px; background: #fff; }
.luogo-fatto svg { flex: none; width: 22px; height: 22px; color: var(--green, #2f6b3a); }
.luogo-fatto span { display: grid; flex: 1; min-width: 0; gap: 2px; font-size: 15px; }
.luogo-fatto small { color: var(--muted, #71717a); font-size: 13px; }
`

function aggiungiStile() {
  if (document.getElementById('stile-luogo')) return
  const el = document.createElement('style')
  el.id = 'stile-luogo'
  el.textContent = STILE
  document.head.append(el)
}

const SPUNTA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg>'

/** Metri tra due punti, abbastanza per dire "vicino". */
function distanza(a, b) {
  const r = Math.PI / 180
  const x = (b.lng - a.lng) * r * Math.cos(((a.lat + b.lat) / 2) * r)
  const y = (b.lat - a.lat) * r
  return Math.hypot(x, y) * 6371000
}

let progressivo = 0

/**
 * contenitore: dove disegnarlo. testi: i testi nella lingua della pagina (luogo in web/sito/testi.js).
 * classi: { primario, link } dei bottoni della pagina. cartina: { tessere, font, libreria } o null.
 * iniziale: il luogo che c'è già (si parte da "fatto"). cambia(luogo): alla conferma.
 */
export function sceltaLuogo({ contenitore, testi: T, lang = 'it', classi, cartina = null, iniziale = null, cambia = () => {} }) {
  aggiungiStile()
  const id = `luogo-${++progressivo}`
  const s = { fase: iniziale ? 'fatto' : 'scegli', scelto: iniziale ? { ...iniziale } : null, trovati: [], attesa: false }
  // L'ultimo indirizzo confermato: "Annulla" ci torna.
  let confermato = iniziale ? { ...iniziale } : null
  const giaCercati = new Map()
  let mappa = null
  let timer = null
  let ultima = 0

  const $ = (sel) => contenitore.querySelector(sel)
  const togliMappa = () => {
    mappa?.then((m) => m.togli()).catch(() => {})
    mappa = null
  }
  const nota = (testo) => { if ($('.luogo-nota')) $('.luogo-nota').textContent = testo }
  const pronto = () => {
    const b = $('[data-luogo="conferma"]')
    if (b) b.disabled = !s.scelto || s.attesa
  }

  function disegna() {
    togliMappa()
    if (s.fase === 'fatto') {
      const sopra = s.scelto.indirizzo || s.scelto.comune || T.puntoMappa
      const sotto = s.scelto.indirizzo ? s.scelto.comune : ''
      contenitore.innerHTML = `<div class="luogo"><div class="luogo-fatto">${SPUNTA}<span><strong>${esc(sopra)}</strong>${sotto ? `<small>${esc(sotto)}</small>` : ''}</span>
        <button type="button" class="${classi.link}" data-luogo="cambia">${esc(T.cambia)}</button></div></div>`
      return
    }
    contenitore.innerHTML = `<div class="luogo">
      <div class="luogo-campo">
        <input type="search" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="${id}-elenco"
          enterkeyhint="search" autocomplete="off" aria-label="${esc(T.etichetta)}" placeholder="${esc(T.esempio)}">
        <ul class="luogo-trovati" id="${id}-elenco" role="listbox" aria-label="${esc(T.etichetta)}"></ul>
      </div>
      <p class="luogo-nota" aria-live="polite">${esc(cartina ? T.aiuto : T.aiutoSenzaMappa)}</p>
      ${cartina ? '<div class="luogo-mappa"></div>' : ''}
      <div class="luogo-azioni">
        <button type="button" class="${classi.primario}" data-luogo="conferma" disabled>${esc(T.conferma)}</button>
        ${confermato ? `<button type="button" class="${classi.link}" data-luogo="annulla">${esc(T.annulla)}</button>` : ''}
      </div>
    </div>`
    pronto()
    if (!cartina) return
    mappa = mappaPunto({ contenitore: $('.luogo-mappa'), cartina, lang, punto: s.scelto, sposta: spostato })
    // Senza mappa (niente WebGL) si sceglie dall'elenco e basta.
    mappa.catch(() => { $('.luogo-mappa')?.remove() })
  }

  function elenco() {
    const ul = $('.luogo-trovati')
    if (!ul) return
    ul.innerHTML = s.trovati.map((r, i) => `<li><button type="button" class="luogo-trovato" role="option" data-luogo="scegli" data-i="${i}">${esc(r.etichetta)}</button></li>`).join('')
    $('input')?.setAttribute('aria-expanded', String(s.trovati.length > 0))
  }

  /** Dove guarda la mappa (o la zona dei masi): la ricerca dà prima i luoghi lì intorno. */
  async function vicino() {
    try { return (await mappa)?.centro() ?? ZONA } catch { return ZONA }
  }

  async function cerca(testo) {
    const mia = ++ultima
    if (testo.length < 3) {
      s.trovati = []
      elenco()
      return
    }
    try {
      if (!giaCercati.has(testo)) {
        nota(T.cerco)
        giaCercati.set(testo, await cercaIndirizzo(testo, lang, fetch, { quanti: QUANTI, vicino: await vicino() }))
      }
      // Nel frattempo si è scritto ancora: questa risposta non serve più.
      if (mia !== ultima) return
      s.trovati = giaCercati.get(testo)
      nota(s.trovati.length ? '' : T.nessuno)
    } catch (e) {
      if (mia !== ultima) return
      s.trovati = []
      nota(e.message === 'too_many' ? T.troppe : T.errore)
    }
    elenco()
  }

  function scegli(r) {
    s.scelto = { ...r }
    s.trovati = []
    elenco()
    $('input').value = r.etichetta
    nota(cartina ? T.controlla : '')
    mappa?.then((m) => m.vai(r)).catch(() => {})
    pronto()
  }

  /** Il segnaposto messo o spostato sulla mappa. */
  function spostato(p) {
    if (s.scelto && !s.scelto.aMano && distanza(s.scelto, p) < VICINO) {
      Object.assign(s.scelto, p)
    } else {
      s.scelto = { ...p, aMano: true, indirizzo: '', comune: '' }
      nota(T.puntoAMano)
    }
    pronto()
  }

  function conferma(luogo) {
    const { aMano, ...pulito } = luogo
    s.scelto = pulito
    confermato = { ...pulito }
    s.fase = 'fatto'
    disegna()
    cambia(pulito)
  }

  async function confermaScelto() {
    // Il punto messo a mano: l'indirizzo si chiede a Photon da lì.
    if (!s.scelto.aMano) return conferma(s.scelto)
    s.attesa = true
    pronto()
    nota(T.cercoIndirizzo)
    let luogo = null
    try { luogo = await luogoDelPunto(s.scelto, lang) } catch { /* resta senza indirizzo */ }
    s.attesa = false
    pronto()
    if (!luogo?.comune) return nota(T.nessunIndirizzo)
    conferma(luogo)
  }

  contenitore.addEventListener('input', (e) => {
    if (e.target.tagName !== 'INPUT') return
    clearTimeout(timer)
    const testo = e.target.value.trim()
    timer = setTimeout(() => cerca(testo), PAUSA)
  })
  contenitore.addEventListener('keydown', (e) => {
    if (e.target.tagName !== 'INPUT') return
    // Invio sceglie il primo luogo (o cerca subito), senza mandare il modulo intorno; freccia giù va all'elenco.
    if (e.key === 'Enter') {
      e.preventDefault()
      clearTimeout(timer)
      if (s.trovati.length) scegli(s.trovati[0])
      else cerca(e.target.value.trim())
    } else if (e.key === 'ArrowDown' && s.trovati.length) {
      e.preventDefault()
      $('.luogo-trovato')?.focus()
    }
  })
  contenitore.addEventListener('click', (e) => {
    const b = e.target.closest('[data-luogo]')
    if (!b) return
    switch (b.dataset.luogo) {
      case 'scegli': return s.trovati[Number(b.dataset.i)] && scegli(s.trovati[Number(b.dataset.i)])
      case 'conferma': return s.scelto && !s.attesa && confermaScelto()
      case 'annulla':
        s.scelto = { ...confermato }
        s.fase = 'fatto'
        return disegna()
      case 'cambia':
        s.fase = 'scegli'
        s.trovati = []
        disegna()
        return $('input')?.focus()
    }
  })

  disegna()
  return {
    get luogo() { return s.fase === 'fatto' ? s.scelto : null },
    togli() {
      clearTimeout(timer)
      togliMappa()
    },
  }
}
