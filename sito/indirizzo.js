// Cercare un indirizzo in Italia e scriverlo come lo scriviamo noi ("Via Monte 12, San Michele"), con la posizione:
// Photon (Komoot, dati di OpenStreetMap), senza account né chiavi, e solo quando si tocca "Cerca". Lo usano il pannello
// admin (Nuovo maso) e "Chiedi il tuo link" del sito. Niente DOM in questo file, così le prove lo usano da Node.
//
// Photon non ha l'italiano: in Alto Adige il nome è nelle due lingue ("Bergweg - Via Monte"). Con una seconda ricerca
// in tedesco si sa quale metà è tedesca, e si tiene l'altra (o quella, sulle pagine in tedesco). Dove manca il nome
// tedesco (spesso le frazioni) vale l'ordine delle altre parti dello stesso indirizzo. La lingua si chiede sempre
// ("default": i nomi locali), se no Photon userebbe quella del browser ("South Tyrol").
export const PHOTON = 'https://photon.komoot.io'
// Ovest, sud, est, nord: come i limiti della mappa in web/genera/impostazioni.mjs.
const ITALIA = '6.6,35.4,18.6,47.1'

/** Quale metà di un nome doppio è tedesca (0 o 1), o -1 se non si sa. */
function metaTedesca(nome, tedesco) {
  const parti = String(nome ?? '').split(' - ').map((s) => s.trim())
  return parti.length === 2 && tedesco ? parti.indexOf(tedesco.trim()) : -1
}

/**
 * La metà di un nome doppio nella lingua della pagina; il nome com'è se non è doppio. ordine: quale metà è tedesca
 * nelle altre parti dello stesso indirizzo, per quando questa non ha il nome tedesco.
 */
export function nellaLingua(nome, tedesco, lang, ordine = -1) {
  if (!nome) return ''
  const parti = nome.split(' - ').map((s) => s.trim())
  if (parti.length !== 2) return nome
  const meta = metaTedesca(nome, tedesco) >= 0 ? metaTedesca(nome, tedesco) : ordine
  if (meta < 0) return nome
  return lang === 'de' ? parti[meta] : parti[1 - meta]
}

/**
 * Un risultato di Photon (con lo stesso luogo cercato in tedesco, se c'è) come lo usiamo noi:
 * { indirizzo, comune, comuni (tutti i nomi, per riconoscerlo nell'elenco), provincia, nome, etichetta, lat, lng }.
 */
export function leggiLuogo(luogo, inTedesco, lang = 'it') {
  const p = luogo.properties ?? {}
  const d = inTedesco?.properties ?? {}
  const comuneDoppio = p.city ?? p.town ?? p.village ?? ''
  const comuneTedesco = d.city ?? d.town ?? d.village
  // L'ordine delle lingue di questo indirizzo, da via o comune, per le parti senza nome tedesco.
  const ordine = [metaTedesca(p.street, d.street), metaTedesca(comuneDoppio, comuneTedesco), metaTedesca(p.name, d.name)].find((m) => m >= 0) ?? -1
  const scegli = (k) => nellaLingua(p[k], d[k], lang, ordine)
  const comune = nellaLingua(comuneDoppio, comuneTedesco, lang, ordine)
  const frazione = scegli('district') || scegli('locality')
  const via = scegli('street')
  // Un maso cercato per nome: il nome è il luogo, la via (se c'è) l'indirizzo.
  const nome = p.name && p.type !== 'street' ? scegli('name') : ''
  const strada = via ? [via, p.housenumber].filter(Boolean).join(' ') : (p.type === 'street' ? scegli('name') : '')
  const indirizzo = [strada || (nome && !frazione ? nome : ''), frazione && frazione !== comune ? frazione : ''].filter(Boolean).join(', ')
  const provincia = nellaLingua(p.county ?? '', d.county, lang, ordine)
  const [lng, lat] = luogo.geometry?.coordinates ?? []
  return {
    indirizzo,
    comune,
    comuni: [...new Set(comuneDoppio.split(' - ').map((s) => s.trim()).filter(Boolean))],
    provincia,
    nome,
    etichetta: [nome, indirizzo, comune, provincia && provincia !== comune ? provincia : ''].filter(Boolean).join(', '),
    lat,
    lng,
  }
}

async function leggi(url, chiedi) {
  let r
  try { r = await chiedi(url) } catch { throw new Error('network') }
  if (!r.ok) throw new Error(r.status === 429 ? 'too_many' : 'failed')
  return (await r.json()).features ?? []
}

const chiave = (f) => `${f.properties?.osm_type}${f.properties?.osm_id}`

/** Fino a sei luoghi in Italia per "testo". Errore 'network', 'too_many' (troppe ricerche di fila) o 'failed'. */
export async function cercaIndirizzo(testo, lang = 'it', chiedi = fetch) {
  const q = String(testo ?? '').trim()
  if (q.length < 3) return []
  const indirizzo = (tedesco) => `${PHOTON}/api/?q=${encodeURIComponent(q)}&limit=6&bbox=${ITALIA}&lang=${tedesco ? 'de' : 'default'}`
  const [luoghi, inTedesco] = await Promise.all([leggi(indirizzo(false), chiedi), leggi(indirizzo(true), chiedi).catch(() => [])])
  const tedeschi = new Map(inTedesco.map((f) => [chiave(f), f]))
  return luoghi
    .filter((f) => f.properties?.countrycode === 'IT')
    .map((f) => leggiLuogo(f, tedeschi.get(chiave(f)), lang))
    .filter((x) => Number.isFinite(x.lat) && Number.isFinite(x.lng))
}

/** Il luogo di un punto messo a mano sulla mappa ("Metti il punto sulla mappa"), con il punto com'è; null se non c'è. */
export async function luogoDelPunto({ lat, lng }, lang = 'it', chiedi = fetch) {
  const indirizzo = (tedesco) => `${PHOTON}/reverse?lon=${lng}&lat=${lat}&lang=${tedesco ? 'de' : 'default'}`
  const [luoghi, inTedesco] = await Promise.all([leggi(indirizzo(false), chiedi), leggi(indirizzo(true), chiedi).catch(() => [])])
  const f = luoghi.find((x) => x.properties?.countrycode === 'IT')
  return f ? { ...leggiLuogo(f, inTedesco.find((x) => chiave(x) === chiave(f)), lang), lat, lng } : null
}
