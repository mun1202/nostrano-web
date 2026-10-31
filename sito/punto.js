// La piccola mappa di "Indirizzo del maso" (luogo.js), nel pannello admin e in "Chiedi il tuo link": sempre visibile
// mentre si cerca. Il segnaposto compare sul luogo scelto dall'elenco, oppure dove si tocca la mappa, e si trascina
// fin sul maso vero. Stessa mappa della vista "Mappa" (cartina.js); cartina: { tessere, font, libreria } come dal
// generatore. sposta({ lat, lng }) quando lo si sposta con il dito o il mouse.
import { caricaLibreria, completa, stile } from './cartina.js?v=de8833acec'

// Il centro dell'Alto Adige, quando non c'è ancora un punto.
const PARTENZA = { lat: 46.62, lng: 11.33 }

export async function mappaPunto({ contenitore, cartina: data, lang = 'it', punto = null, sposta = () => {} }) {
  const cartina = completa(data)
  const maplibregl = await caricaLibreria(cartina.libreria)
  if (!maplibregl.Map || !document.createElement('canvas').getContext('webgl2')) throw new Error('webgl')
  const centro = punto ?? PARTENZA
  const map = new maplibregl.Map({
    container: contenitore,
    style: stile(cartina, lang),
    center: [centro.lng, centro.lat],
    zoom: punto ? 16 : 8.5,
    minZoom: 5,
    maxZoom: 18,
    attributionControl: { compact: true },
    dragRotate: false,
    pitchWithRotate: false,
    touchPitch: false,
  })
  map.touchZoomRotate.disableRotation()
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
  // Il verde del marchio: è il punto giusto, o lo diventa. Senza punto non c'è ancora.
  const segno = new maplibregl.Marker({ color: '#2f6b3a', draggable: true })
  if (punto) segno.setLngLat([punto.lng, punto.lat]).addTo(map)
  const avvisa = () => {
    const { lng, lat } = segno.getLngLat()
    sposta({ lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) })
  }
  segno.on('dragend', avvisa)
  map.on('click', (e) => {
    segno.setLngLat(e.lngLat).addTo(map)
    avvisa()
  })
  // Con "Riduci movimento" la mappa salta subito al luogo, senza scorrere.
  const anima = !matchMedia('(prefers-reduced-motion: reduce)').matches
  return {
    /** Il luogo scelto dall'elenco: segnaposto e mappa ci vanno. */
    vai(nuovo) {
      segno.setLngLat([nuovo.lng, nuovo.lat]).addTo(map)
      map.easeTo({ center: [nuovo.lng, nuovo.lat], zoom: 16, duration: anima ? 280 : 0 })
    },
    /** Il centro della mappa adesso: la ricerca preferisce i luoghi intorno. */
    centro() {
      const { lng, lat } = map.getCenter()
      return { lat, lng }
    },
    /** Dopo che il contenitore cambia misura. */
    ridisegna() { map.resize() },
    togli() { map.remove() },
  }
}
