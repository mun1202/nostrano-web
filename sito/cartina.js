// La vista "Mappa" della home e delle pagine dei paesi e dei prodotti: MapLibre (in sito/vendor/maplibre, caricato
// solo quando si apre la vista) con le tessere di mappa/zona.pmtiles lette a pezzi dal nostro sito. Niente servizi di
// mappe e niente account: i dati sono di OpenStreetMap, ritagliati da npm run mappa:prepara.
// Colori naturali e vivi (boschi verdi, acqua azzurra, strade principali gialle): i segnaposti bianchi restano in primo piano.
import { aperto, categoria, esc, icona, scheda, stato } from './comune.js?v=1e72ab56fe'
import { GZIP, archivio } from './pmtiles.js?v=1e72ab56fe'

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
function caricaLibreria(cartella) {
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

// Il file della cartina letto a pezzi. Se il server non sa rispondere a pezzi (Range), lo si scarica intero una volta.
function archivioDa(url) {
  let intero = null
  const leggi = async (offset, length) => {
    if (intero) return new Uint8Array(await intero, offset, length)
    const r = await fetch(url, { headers: { Range: `bytes=${offset}-${offset + length - 1}` } })
    if (r.status === 206) return new Uint8Array(await r.arrayBuffer())
    if (!r.ok) throw new Error(`cartina ${r.status}`)
    intero = r.arrayBuffer()
    return new Uint8Array(await intero, offset, length)
  }
  const decomprimi = async (byte, compressione) => {
    if (compressione !== GZIP) return byte
    const flusso = new Blob([byte]).stream().pipeThrough(new DecompressionStream('gzip'))
    return new Uint8Array(await new Response(flusso).arrayBuffer())
  }
  return archivio(leggi, decomprimi)
}

/** Lo stile della cartina: pochi livelli, i nomi nella lingua della pagina. */
function stile(cartina, lang, colori = CHIARO) {
  const nome = ['coalesce', ['get', `name:${lang}`], ['get', 'name']]
  const tipo = (...k) => ['in', ['get', 'kind'], ['literal', k]]
  const larghezza = (pezzi) => ['interpolate', ['exponential', 1.6], ['zoom'], ...pezzi]
  return {
    version: 8,
    glyphs: cartina.font,
    sources: {
      zona: {
        type: 'vector',
        tiles: ['nostrano://zona/{z}/{x}/{y}'],
        minzoom: 0,
        maxzoom: cartina.maxZoom,
        bounds: cartina.limiti,
        attribution: '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap</a> · <a href="https://protomaps.com" target="_blank" rel="noopener">Protomaps</a>',
      },
    },
    layers: [
      { id: 'sfondo', type: 'background', paint: { 'background-color': colori.terra } },
      { id: 'terra', type: 'fill', source: 'zona', 'source-layer': 'earth', paint: { 'fill-color': colori.terra } },
      { id: 'copertura', type: 'fill', source: 'zona', 'source-layer': 'landcover', paint: {
        'fill-color': ['match', ['get', 'kind'], ['forest', 'scrub'], colori.bosco, 'glacier', colori.ghiaccio, 'urban_area', colori.citta, colori.campi],
      } },
      { id: 'boschi', type: 'fill', source: 'zona', 'source-layer': 'landuse', filter: tipo('forest', 'wood', 'scrub', 'nature_reserve', 'national_park', 'protected_area', 'park'), paint: { 'fill-color': colori.bosco } },
      { id: 'campi', type: 'fill', source: 'zona', 'source-layer': 'landuse', filter: tipo('farmland', 'orchard', 'vineyard', 'meadow', 'grassland', 'allotments'), paint: { 'fill-color': colori.campi } },
      { id: 'abitato', type: 'fill', source: 'zona', 'source-layer': 'landuse', filter: tipo('residential', 'industrial', 'commercial', 'retail', 'railway', 'military'), paint: { 'fill-color': colori.citta } },
      { id: 'ghiacciai', type: 'fill', source: 'zona', 'source-layer': 'landuse', filter: tipo('glacier'), paint: { 'fill-color': colori.ghiaccio } },
      { id: 'acqua', type: 'fill', source: 'zona', 'source-layer': 'water', filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'fill-color': colori.acqua } },
      { id: 'fiumi', type: 'line', source: 'zona', 'source-layer': 'water', filter: ['==', ['geometry-type'], 'LineString'], paint: {
        'line-color': colori.acqua, 'line-width': larghezza([9, 0.5, 14, ['match', ['get', 'kind'], 'river', 4, 1.5]]),
      } },
      { id: 'edifici', type: 'fill', source: 'zona', 'source-layer': 'buildings', minzoom: 13, paint: { 'fill-color': colori.edifici, 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 13, 0, 14, 1] } },
      { id: 'confini', type: 'line', source: 'zona', 'source-layer': 'boundaries', filter: tipo('country', 'region'), paint: {
        'line-color': colori.confini, 'line-width': ['match', ['get', 'kind'], 'country', 1.4, 0.9], 'line-dasharray': [3, 2],
      } },
      { id: 'sentieri', type: 'line', source: 'zona', 'source-layer': 'roads', minzoom: 13, filter: tipo('path'), paint: {
        'line-color': colori.sentieri, 'line-width': 0.8, 'line-dasharray': [2, 1.5],
      } },
      { id: 'ferrovia', type: 'line', source: 'zona', 'source-layer': 'roads', minzoom: 10, filter: tipo('rail'), paint: {
        'line-color': colori.ferrovia, 'line-width': 1, 'line-dasharray': [3, 2],
      } },
      { id: 'bordo-strade', type: 'line', source: 'zona', 'source-layer': 'roads', minzoom: 11, filter: tipo('minor_road', 'other'), layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: {
        'line-color': colori.bordoStrade, 'line-width': larghezza([11, 0.5, 15, 7]),
      } },
      { id: 'bordo-principali', type: 'line', source: 'zona', 'source-layer': 'roads', minzoom: 7, filter: tipo('major_road', 'highway'), layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: {
        'line-color': ['match', ['get', 'kind'], 'highway', colori.bordoAutostrade, colori.bordoStrade],
        'line-width': larghezza([7, 1, 15, ['match', ['get', 'kind'], 'highway', 12, 10]]),
      } },
      { id: 'strade', type: 'line', source: 'zona', 'source-layer': 'roads', minzoom: 12, filter: tipo('minor_road', 'other'), layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: {
        'line-color': colori.strade, 'line-width': larghezza([12, 0.5, 15, 5]),
      } },
      { id: 'principali', type: 'line', source: 'zona', 'source-layer': 'roads', minzoom: 8, filter: tipo('major_road', 'highway'), layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: {
        // Strade principali e autostrade in giallo chiaro, come sulle mappe di tutti i giorni: ci si orienta prima.
        'line-color': colori.principali, 'line-width': larghezza([8, 0.5, 15, ['match', ['get', 'kind'], 'highway', 9, 7.5]]),
      } },
      { id: 'nomi-strade', type: 'symbol', source: 'zona', 'source-layer': 'roads', minzoom: 14, filter: tipo('major_road', 'minor_road'), layout: {
        'symbol-placement': 'line', 'text-field': nome, 'text-font': ['Noto Sans Regular'], 'text-size': 11,
      }, paint: { 'text-color': colori.testoTenue, 'text-halo-color': colori.alone, 'text-halo-width': 1.5 } },
      { id: 'nomi-acqua', type: 'symbol', source: 'zona', 'source-layer': 'water', minzoom: 11, filter: ['==', ['geometry-type'], 'Point'], layout: {
        'text-field': nome, 'text-font': ['Noto Sans Regular'], 'text-size': 11,
      }, paint: { 'text-color': '#5f8196', 'text-halo-color': colori.alone, 'text-halo-width': 1.2 } },
      { id: 'paesi', type: 'symbol', source: 'zona', 'source-layer': 'places', filter: tipo('locality'), layout: {
        'text-field': nome,
        'text-font': ['case', ['in', ['get', 'kind_detail'], ['literal', ['city', 'town']]], ['literal', ['Noto Sans Medium']], ['literal', ['Noto Sans Regular']]],
        'text-size': ['interpolate', ['linear'], ['zoom'], 8, ['match', ['get', 'kind_detail'], 'city', 13, 'town', 12, 10.5], 14, ['match', ['get', 'kind_detail'], 'city', 17, 'town', 15, 13]],
        'symbol-sort-key': ['get', 'min_zoom'],
        'text-max-width': 8,
        // Sotto il punto del paese: i segnaposti dei masi (sopra la cartina) coprono meno i nomi.
        'text-anchor': 'top',
        'text-offset': [0, 0.9],
      }, paint: { 'text-color': colori.testo, 'text-halo-color': colori.alone, 'text-halo-width': 1.6 } },
    ],
  }
}

/**
 * La cartina in "contenitore". cartina: { file, font, libreria, limiti, maxZoom } dal generatore.
 * prepara(elemento): chi la usa sistema la scheda aperta (i cuori dei preferiti).
 * Restituisce { mostra(lista, opzioni), posizione(punto), ridisegna() }.
 */
export async function creaCartina({ contenitore, cartina: dalGeneratore, c, prepara = () => {} }) {
  const T = c.T
  // Percorsi relativi alla pagina, resi completi: MapLibre e i suoi worker li leggono da altri posti. Le graffe dei
  // caratteri si aggiungono dopo, perché new URL le cambierebbe in %7B.
  const pieno = (p) => new URL(p, location.href).href
  const cartina = {
    ...dalGeneratore,
    file: pieno(dalGeneratore.file),
    libreria: pieno(dalGeneratore.libreria),
    font: `${pieno(dalGeneratore.font)}{fontstack}/{range}.pbf`,
  }
  contenitore.innerHTML = `<div class="cartina-mappa"></div><p class="cartina-carica">${esc(T.mappaCarica)}</p>`
  const maplibregl = await caricaLibreria(cartina.libreria)
  if (!maplibregl.Map || !document.createElement('canvas').getContext('webgl2')) {
    contenitore.querySelector('.cartina-carica').textContent = T.mappaNo
    throw new Error('webgl')
  }
  const zona = archivioDa(cartina.file)
  maplibregl.addProtocol('nostrano', async ({ url }) => {
    const [z, x, y] = url.split('/').slice(-3).map(Number)
    return { data: (await zona.tessera(z, x, y)) ?? new Uint8Array(0) }
  })

  const [o, s, e, n] = cartina.limiti
  const margine = 0.15
  const map = new maplibregl.Map({
    container: contenitore.querySelector('.cartina-mappa'),
    style: stile(cartina, c.lang),
    bounds: cartina.limiti,
    maxBounds: [o - (e - o) * margine, s - (n - s) * margine, e + (e - o) * margine, n + (n - s) * margine],
    minZoom: 8,
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
