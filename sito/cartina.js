// La vista "Mappa" della home e delle pagine dei paesi e dei prodotti: MapLibre (in sito/vendor/maplibre, caricato
// solo quando si apre la vista) con le tessere di OpenStreetMap di OpenFreeMap, per tutta l'Italia (mappa in
// web/genera/impostazioni.mjs). Niente account né chiavi; i caratteri stanno sul nostro sito.
// Colori naturali e vivi (boschi verdi, acqua azzurra, strade principali gialle): i segnaposti bianchi restano in primo piano.
import { aperto, categoria, esc, icona, scheda, stato } from './comune.js?v=a4bd50e540'

const CHIARO = {
  terra: '#f2efe4',
  bosco: '#c4dcb4',
  campi: '#e4ecc8',
  citta: '#e6e1d8',
  ghiaccio: '#f4f8fb',
  acqua: '#9cc9e6',
  edifici: '#d9d3c8',
  confini: '#b9a9c9',
  bordoStrade: '#d0ccc2',
  bordoAutostrade: '#e0b24a',
  strade: '#ffffff',
  principali: '#ffe9a3',
  sentieri: '#bfb6a6',
  ferrovia: '#b3b0aa',
  testo: '#3f3f46',
  testoTenue: '#71717a',
  alone: '#ffffff',
}

let libreria = null

/** MapLibre e il suo stile, una volta sola. */
export function caricaLibreria(cartella) {
  libreria ??= (async () => {
    const css = document.createElement('link')
    css.rel = 'stylesheet'
    css.href = `${cartella}maplibre-gl.css`
    document.head.append(css)
    return import(`${cartella}maplibre-gl.mjs`)
  })()
  libreria.catch(() => { libreria = null })
  return libreria
}

/**
 * Lo stile della cartina sulle tessere di OpenFreeMap (schema OpenMapTiles): pochi livelli, i nomi nella lingua della
 * pagina. Gallerie e ponti si disegnano come le strade normali, senza distinzioni: alla scala dei masi bastano.
 */
export function stile(cartina, lang, colori = CHIARO) {
  // Fuori dall'Italia il nome nella lingua della pagina spesso manca: allora quello in alfabeto latino, che i nostri
  // caratteri sanno scrivere (Tunisi e non تونس).
  const nome = ['coalesce', ['get', `name:${lang}`], ['get', 'name:latin'], ['get', 'name']]
  const classe = (...k) => ['in', ['get', 'class'], ['literal', k]]
  const senzaGallerie = (filtro) => ['all', ['!=', ['get', 'brunnel'], 'tunnel'], filtro]
  const larghezza = (pezzi) => ['interpolate', ['exponential', 1.6], ['zoom'], ...pezzi]
  const PRINCIPALI = ['motorway', 'trunk', 'primary', 'secondary', 'tertiary']
  return {
    version: 8,
    glyphs: cartina.font,
    sources: {
      // L'indirizzo TileJSON dice dove stanno le tessere e porta l'attribuzione (OpenFreeMap, OpenMapTiles, OpenStreetMap).
      italia: { type: 'vector', url: cartina.tessere },
    },
    layers: [
      { id: 'sfondo', type: 'background', paint: { 'background-color': colori.terra } },
      { id: 'copertura', type: 'fill', source: 'italia', 'source-layer': 'landcover', paint: {
        'fill-color': ['match', ['get', 'class'], 'wood', colori.bosco, 'ice', colori.ghiaccio, ['grass', 'farmland', 'wetland'], colori.campi, colori.terra],
      } },
      { id: 'parchi', type: 'fill', source: 'italia', 'source-layer': 'park', paint: { 'fill-color': colori.bosco, 'fill-opacity': 0.5 } },
      { id: 'abitato', type: 'fill', source: 'italia', 'source-layer': 'landuse', filter: classe('residential', 'suburb', 'neighbourhood', 'industrial', 'commercial', 'retail', 'railway', 'military'), paint: { 'fill-color': colori.citta } },
      { id: 'acqua', type: 'fill', source: 'italia', 'source-layer': 'water', filter: ['!=', ['get', 'brunnel'], 'tunnel'], paint: { 'fill-color': colori.acqua } },
      { id: 'fiumi', type: 'line', source: 'italia', 'source-layer': 'waterway', minzoom: 8, filter: ['!=', ['get', 'brunnel'], 'tunnel'], paint: {
        'line-color': colori.acqua, 'line-width': larghezza([8, 0.5, 14, ['match', ['get', 'class'], 'river', 4, 1.5]]),
      } },
      { id: 'edifici', type: 'fill', source: 'italia', 'source-layer': 'building', minzoom: 13, paint: { 'fill-color': colori.edifici, 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 13, 0, 14, 1] } },
      // Confini di stato e di regione; quelli in mare no.
      { id: 'confini', type: 'line', source: 'italia', 'source-layer': 'boundary', filter: ['all', ['in', ['get', 'admin_level'], ['literal', [2, 4]]], ['!=', ['get', 'maritime'], 1]], paint: {
        'line-color': colori.confini, 'line-width': ['match', ['get', 'admin_level'], 2, 1.4, 0.9], 'line-dasharray': [3, 2],
      } },
      { id: 'sentieri', type: 'line', source: 'italia', 'source-layer': 'transportation', minzoom: 13, filter: senzaGallerie(classe('path', 'track')), paint: {
        'line-color': colori.sentieri, 'line-width': 0.8, 'line-dasharray': [2, 1.5],
      } },
      { id: 'ferrovia', type: 'line', source: 'italia', 'source-layer': 'transportation', minzoom: 10, filter: senzaGallerie(classe('rail')), paint: {
        'line-color': colori.ferrovia, 'line-width': 1, 'line-dasharray': [3, 2],
      } },
      { id: 'bordo-strade', type: 'line', source: 'italia', 'source-layer': 'transportation', minzoom: 11, filter: senzaGallerie(classe('minor', 'service')), layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: {
        'line-color': colori.bordoStrade, 'line-width': larghezza([11, 0.5, 15, 7]),
      } },
      { id: 'bordo-principali', type: 'line', source: 'italia', 'source-layer': 'transportation', minzoom: 6, filter: senzaGallerie(classe(...PRINCIPALI)), layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: {
        'line-color': ['match', ['get', 'class'], 'motorway', colori.bordoAutostrade, colori.bordoStrade],
        'line-width': larghezza([6, 1, 15, ['match', ['get', 'class'], 'motorway', 12, 10]]),
      } },
      { id: 'strade', type: 'line', source: 'italia', 'source-layer': 'transportation', minzoom: 12, filter: senzaGallerie(classe('minor', 'service')), layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: {
        'line-color': colori.strade, 'line-width': larghezza([12, 0.5, 15, 5]),
      } },
      { id: 'principali', type: 'line', source: 'italia', 'source-layer': 'transportation', minzoom: 7, filter: senzaGallerie(classe(...PRINCIPALI)), layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: {
        // Strade principali e autostrade in giallo chiaro, come sulle mappe di tutti i giorni: ci si orienta prima.
        'line-color': colori.principali, 'line-width': larghezza([7, 0.5, 15, ['match', ['get', 'class'], 'motorway', 9, 7.5]]),
      } },
      { id: 'nomi-strade', type: 'symbol', source: 'italia', 'source-layer': 'transportation_name', minzoom: 14, filter: classe(...PRINCIPALI, 'minor'), layout: {
        'symbol-placement': 'line', 'text-field': nome, 'text-font': ['Noto Sans Regular'], 'text-size': 11,
      }, paint: { 'text-color': colori.testoTenue, 'text-halo-color': colori.alone, 'text-halo-width': 1.5 } },
      { id: 'nomi-acqua', type: 'symbol', source: 'italia', 'source-layer': 'water_name', minzoom: 11, layout: {
        'text-field': nome, 'text-font': ['Noto Sans Regular'], 'text-size': 11,
      }, paint: { 'text-color': '#5f8196', 'text-halo-color': colori.alone, 'text-halo-width': 1.2 } },
      { id: 'paesi', type: 'symbol', source: 'italia', 'source-layer': 'place', filter: classe('city', 'town', 'village', 'hamlet'), layout: {
        'text-field': nome,
        'text-font': ['case', classe('city', 'town'), ['literal', ['Noto Sans Medium']], ['literal', ['Noto Sans Regular']]],
        'text-size': ['interpolate', ['linear'], ['zoom'], 6, ['match', ['get', 'class'], 'city', 13, 'town', 11, 10], 14, ['match', ['get', 'class'], 'city', 17, 'town', 15, 13]],
        // Prima le città, poi i paesi più grandi: con tutta l'Italia i nomi si contendono lo spazio.
        'symbol-sort-key': ['get', 'rank'],
        'text-max-width': 8,
        // Sotto il punto del paese: i segnaposti dei masi (sopra la cartina) coprono meno i nomi.
        'text-anchor': 'top',
        'text-offset': [0, 0.9],
      }, paint: { 'text-color': colori.testo, 'text-halo-color': colori.alone, 'text-halo-width': 1.6 } },
    ],
  }
}

/**
 * La cartina in "contenitore". cartina: { tessere, font, libreria, limiti } dal generatore.
 * prepara(elemento): chi la usa sistema la scheda aperta (i cuori dei preferiti).
 * Restituisce { mostra(lista, opzioni), posizione(punto), ridisegna() }.
 */
/**
 * I percorsi della cartina (relativi alla pagina) resi completi: MapLibre e i suoi worker li leggono da altri posti.
 * Le graffe dei caratteri si aggiungono dopo, perché new URL le cambierebbe in %7B.
 */
export function completa(cartina) {
  const pieno = (p) => new URL(p, location.href).href
  return { ...cartina, libreria: pieno(cartina.libreria), font: `${pieno(cartina.font)}{fontstack}/{range}.pbf` }
}

export async function creaCartina({ contenitore, cartina: dalGeneratore, c, prepara = () => {} }) {
  const T = c.T
  const cartina = completa(dalGeneratore)
  contenitore.innerHTML = `<div class="cartina-mappa"></div><p class="cartina-carica">${esc(T.mappaCarica)}</p>`
  const maplibregl = await caricaLibreria(cartina.libreria)
  if (!maplibregl.Map || !document.createElement('canvas').getContext('webgl2')) {
    contenitore.querySelector('.cartina-carica').textContent = T.mappaNo
    throw new Error('webgl')
  }
  const [o, s, e, n] = cartina.limiti
  const margine = 0.1
  const map = new maplibregl.Map({
    container: contenitore.querySelector('.cartina-mappa'),
    style: stile(cartina, c.lang),
    bounds: cartina.limiti,
    maxBounds: [o - (e - o) * margine, s - (n - s) * margine, e + (e - o) * margine, n + (n - s) * margine],
    // Da tutta l'Italia al singolo maso.
    minZoom: 4,
    maxZoom: 17,
    attributionControl: { compact: true },
    dragRotate: false,
    pitchWithRotate: false,
    touchPitch: false,
    // Con lo schermo piccolo lo zoom a due dita basta: la rotazione no.
    renderWorldCopies: false,
  })
  map.touchZoomRotate.disableRotation()
  map.keyboard.disableRotation()
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
  await new Promise((ok) => map.once('load', ok))
  contenitore.querySelector('.cartina-carica').remove()

  const segnaposti = new Map()
  // I gruppi: i masi troppo vicini sullo schermo diventano una pillola con il numero, che si apre avvicinando.
  let gruppi = []
  let livello = null
  let scelto = null
  let tu = null
  let lista = []
  let opzioni = {}

  function chiudiScheda() {
    contenitore.querySelector('.cartina-scheda')?.remove()
    if (scelto) segnaposti.get(scelto)?.bottone.setAttribute('aria-pressed', 'false')
    scelto = null
  }

  function apriScheda(f) {
    if (scelto) segnaposti.get(scelto)?.bottone.setAttribute('aria-pressed', 'false')
    scelto = f.slug
    segnaposti.get(f.slug)?.bottone.setAttribute('aria-pressed', 'true')
    const vecchia = contenitore.querySelector('.cartina-scheda')
    const nuova = document.createElement('div')
    nuova.className = 'cartina-scheda'
    nuova.innerHTML = `<ul class="farms list">${scheda(f, 0, c, opzioni)}</ul>
      <button class="icon-btn cartina-chiudi" type="button" aria-label="${esc(T.chiudi)}">${icona('x')}</button>`
    nuova.querySelector('.cartina-chiudi').addEventListener('click', chiudiScheda)
    prepara(nuova)
    if (vecchia) vecchia.replaceWith(nuova)
    else {
      contenitore.append(nuova)
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
        nuova.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 200, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' })
      }
    }
  }

  function segnaposto(f) {
    const bottone = document.createElement('button')
    bottone.type = 'button'
    bottone.className = 'cartina-pin'
    // L'icona della categoria del primo prodotto, come nell'app (farm.mainCategory); il pallino dice se è aperto.
    const cat = categoria(f.products?.[0]?.kind, c)
    bottone.innerHTML = icona(`cat-${cat}`)
    bottone.setAttribute('aria-pressed', 'false')
    bottone.addEventListener('click', (ev) => {
      ev.stopPropagation()
      const x = lista.find((y) => y.slug === f.slug)
      if (x) apriScheda(x)
    })
    const marker = new maplibregl.Marker({ element: document.createElement('div') })
    marker.getElement().append(bottone)
    marker.setLngLat([f.lng, f.lat]).addTo(map)
    return { marker, bottone }
  }

  // Toccando la cartina fuori dai masi la scheda si chiude.
  map.on('click', chiudiScheda)

  // Raggruppa in una griglia del mondo a quel livello di zoom (non dello schermo): spostando la cartina i gruppi
  // restano gli stessi, cambiano solo avvicinando o allontanando. Da vicino (zoom 14) ogni maso ha il suo segnaposto.
  const CELLA = 56
  function raggruppa() {
    const z = Math.floor(map.getZoom())
    livello = z
    for (const g of gruppi) g.remove()
    gruppi = []
    const celle = new Map()
    const mondo = 512 * 2 ** z
    for (const f of lista) {
      const x = ((f.lng + 180) / 360) * mondo
      const s = Math.sin((f.lat * Math.PI) / 180)
      const y = (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * mondo
      const chiave = z >= 14 ? f.slug : `${Math.floor(x / CELLA)}:${Math.floor(y / CELLA)}`
      if (!celle.has(chiave)) celle.set(chiave, [])
      celle.get(chiave).push(f)
    }
    for (const membri of celle.values()) {
      const soli = membri.length === 1
      for (const f of membri) segnaposti.get(f.slug).marker.getElement().hidden = !soli
      if (!soli) gruppi.push(gruppo(membri))
    }
  }

  function gruppo(membri) {
    const bottone = document.createElement('button')
    bottone.type = 'button'
    bottone.className = 'cartina-gruppo'
    bottone.classList.toggle('aperto', membri.some((f) => aperto(stato(f, c.ora))))
    bottone.textContent = membri.length
    bottone.setAttribute('aria-label', `${T.masi(membri.length)}: ${T.avvicina}`)
    bottone.addEventListener('click', (ev) => {
      ev.stopPropagation()
      const lon = membri.map((f) => f.lng)
      const lat = membri.map((f) => f.lat)
      const riduci = matchMedia('(prefers-reduced-motion: reduce)').matches
      // Tutti nello stesso punto: si avvicina di due livelli, poi ognuno ha il suo segnaposto.
      if (Math.max(...lon) - Math.min(...lon) < 1e-6 && Math.max(...lat) - Math.min(...lat) < 1e-6) {
        map.easeTo({ center: [lon[0], lat[0]], zoom: Math.max(14, map.getZoom() + 2), duration: riduci ? 0 : 300 })
        return
      }
      map.fitBounds([[Math.min(...lon), Math.min(...lat)], [Math.max(...lon), Math.max(...lat)]], {
        padding: 72, maxZoom: 15, duration: riduci ? 0 : 300,
      })
    })
    const el = document.createElement('div')
    el.append(bottone)
    const centro = [membri.reduce((t, f) => t + f.lng, 0) / membri.length, membri.reduce((t, f) => t + f.lat, 0) / membri.length]
    return new maplibregl.Marker({ element: el }).setLngLat(centro).addTo(map)
  }

  map.on('zoomend', () => { if (Math.floor(map.getZoom()) !== livello) raggruppa() })

  function inquadra({ anima }) {
    const punti = lista.map((f) => [f.lng, f.lat])
    if (!punti.length) return
    const basso = matchMedia('(max-width: 759px)').matches ? 190 : 48
    const lon = punti.map((p) => p[0])
    const lat = punti.map((p) => p[1])
    const riquadro = [[Math.min(...lon), Math.min(...lat)], [Math.max(...lon), Math.max(...lat)]]
    map.fitBounds(riquadro, { padding: { top: 56, right: 56, bottom: basso, left: 48 }, maxZoom: 13, duration: anima && !matchMedia('(prefers-reduced-motion: reduce)').matches ? 300 : 0 })
  }

  return {
    /** I masi da mostrare (quelli trovati dalla ricerca), con le opzioni della scheda come nell'elenco. */
    mostra(nuova, nuoveOpzioni = {}, { inquadra: rifai = true, anima = false } = {}) {
      lista = nuova
      opzioni = nuoveOpzioni
      const slugs = new Set(lista.map((f) => f.slug))
      for (const [slug, s] of segnaposti) if (!slugs.has(slug)) { s.marker.remove(); segnaposti.delete(slug) }
      for (const f of lista) {
        if (!segnaposti.has(f.slug)) segnaposti.set(f.slug, segnaposto(f))
        const { bottone } = segnaposti.get(f.slug)
        const si = aperto(stato(f, c.ora))
        bottone.classList.toggle('aperto', si)
        bottone.setAttribute('aria-label', `${f.name}, ${si ? T.aperto : T.chiuso}`)
      }
      raggruppa()
      if (scelto && !slugs.has(scelto)) chiudiScheda()
      else if (scelto) apriScheda(lista.find((f) => f.slug === scelto))
      if (rifai) inquadra({ anima })
    },
    /** La posizione di chi visita, quando l'ha data. */
    posizione(punto) {
      if (!punto) return
      if (!tu) {
        const el = document.createElement('div')
        el.className = 'cartina-tu'
        el.setAttribute('aria-hidden', 'true')
        tu = new maplibregl.Marker({ element: el }).setLngLat([punto.lng, punto.lat]).addTo(map)
      } else tu.setLngLat([punto.lng, punto.lat])
    },
    /** Dopo che il contenitore cambia misura (si apre la vista, si gira il telefono). */
    ridisegna() { map.resize() },
  }
}
