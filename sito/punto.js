// La piccola mappa per confermare dove sta un maso: il segnaposto parte dall'indirizzo trovato e si trascina (o si
// tocca la mappa) fin sul maso vero. Stessa mappa della vista "Mappa" (cartina.js); la usano il pannello admin e
// "Chiedi il tuo link". cartina: { tessere, font, libreria } come dal generatore; sposta({ lat, lng }) a ogni cambio.
import { caricaLibreria, completa, stile } from './cartina.js?v=8dc1905cd3'

export async function mappaPunto({ contenitore, cartina: data, lang = 'it', punto, sposta = () => {} }) {
  const cartina = completa(data)
  const maplibregl = await caricaLibreria(cartina.libreria)
  if (!maplibregl.Map || !document.createElement('canvas').getContext('webgl2')) throw new Error('webgl')
  const map = new maplibregl.Map({
    container: contenitore,
    style: stile(cartina, lang),
    center: [punto.lng, punto.lat],
    zoom: 16,
    minZoom: 5,
    maxZoom: 18,
    attributionControl: { compact: true },
    dragRotate: false,
    pitchWithRotate: false,
    touchPitch: false,
  })
  map.touchZoomRotate.disableRotation()
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
  // Il verde del marchio: è il punto giusto, o lo diventa.
  const segno = new maplibregl.Marker({ color: '#2f6b3a', draggable: true }).setLngLat([punto.lng, punto.lat]).addTo(map)
  const avvisa = () => {
    const { lng, lat } = segno.getLngLat()
    sposta({ lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) })
  }
  segno.on('dragend', avvisa)
  map.on('click', (e) => {
    segno.setLngLat(e.lngLat)
    avvisa()
  })
  return {
    /** Un altro punto (un altro risultato della ricerca): segnaposto e mappa ci vanno. */
    vai(nuovo) {
      segno.setLngLat([nuovo.lng, nuovo.lat])
      map.jumpTo({ center: [nuovo.lng, nuovo.lat], zoom: 16 })
    },
    togli() { map.remove() },
  }
}
