// Regole del sito pubblico, le stesse del prototipo (docs/prototipo-sito/comune.js) e dell'app
// (nostrano/Model/OpenStatus.swift): stato di apertura, prezzi, distanze, foto, la scheda di un maso e le icone.
// Le usano il generatore delle pagine (Node) e il browser: niente DOM e niente dati qui dentro.
//
// I masi arrivano come li dà get_directory: orari per giorno (1 = domenica … 7 = sabato) in minuti, giorni
// speciali in hours_exceptions con la data, novità con notice_text e notice_until.
// "c" è il contesto della pagina: { lang, T (i testi), kinds (il catalogo), ora, base (prefisso verso la home) }.

const COMUNI = {
  bolzano: ['Bolzano', 'Bozen'], appiano: ['Appiano', 'Eppan'], caldaro: ['Caldaro', 'Kaltern'],
  terlano: ['Terlano', 'Terlan'], renon: ['Renon', 'Ritten'], sanGenesio: ['San Genesio', 'Jenesien'],
  laives: ['Laives', 'Leifers'], merano: ['Merano', 'Meran'], lana: ['Lana', 'Lana'],
  nalles: ['Nalles', 'Nals'], vadena: ['Vadena', 'Pfatten'], cornedo: ['Cornedo', 'Karneid'],
}
// Un comune nuovo inserito dall'admin si mostra com'è scritto, come nell'app.
export const comune = (slug, lang) => COMUNI[slug]?.[lang === 'de' ? 1 : 0] ?? slug
export const comuneInTutteLeLingue = (slug) => COMUNI[slug] ?? [slug]

export const CATEGORIE = ['frutta', 'verdura', 'uova', 'latticini', 'carne', 'miele', 'vino', 'pane']

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

export const normalizza = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')

// Ora di Roma di un istante: anno, mese, giorno e minuti dalla mezzanotte. Intl conosce l'ora legale.
const parti = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
})
export function oraDi(istante = new Date()) {
  const p = Object.fromEntries(parti.formatToParts(istante).map((x) => [x.type, x.value]))
  return { y: +p.year, m: +p.month, d: +p.day, min: +p.hour * 60 + +p.minute }
}

// Un giorno a partire da oggi, contato sul calendario di Roma. Giorni della settimana: 1 = domenica … 7 = sabato.
export function giorno(ora, offset = 0) {
  const t = new Date(Date.UTC(ora.y, ora.m - 1, ora.d + offset, 12))
  return { iso: t.toISOString().slice(0, 10), wd: t.getUTCDay() + 1, data: t }
}

/** Giorni di calendario (a Roma) tra un istante passato e oggi: 0 = oggi. */
export function giorniDa(istante, ora) {
  const g = oraDi(new Date(istante))
  return Math.max(0, Math.round((Date.UTC(ora.y, ora.m - 1, ora.d) - Date.UTC(g.y, g.m - 1, g.d)) / 86_400_000))
}

/** Giorni da oggi a una data "2026-11-03": negativo se è passata. */
export const giorniA = (iso, ora) => Math.round((Date.parse(`${iso}T12:00:00Z`) - giorno(ora).data.getTime()) / 86_400_000)

export const dataEstesa = (g, c) => c.T.dataEstesa(c.T.giorni[g.wd], g.data.getUTCDate(), c.T.mesi[g.data.getUTCMonth()])
export const maiuscola = (t) => t[0].toUpperCase() + t.slice(1)

// Fasce di un giorno: prima i giorni speciali, poi l'orario della settimana.
export function fasce(f, g) {
  const eccezione = f.hours_exceptions?.find((e) => e.day === g.iso)
  if (eccezione) return eccezione.ranges ?? []
  return f.opening_hours?.[g.wd] ?? []
}

export function stato(f, ora) {
  if (f.has_vending_24h) return { tipo: 'sempre' }
  const oggi = fasce(f, giorno(ora))
  const aperta = oggi.find(([da, a]) => ora.min >= da && ora.min < a)
  if (aperta) return { tipo: 'aperto', fino: aperta[1] }
  const dopo = oggi.find(([da]) => da > ora.min)
  if (dopo) return { tipo: 'apre', offset: 0, alle: dopo[0] }
  for (let k = 1; k <= 7; k++) {
    const g = giorno(ora, k)
    const r = fasce(f, g)
    if (r.length) return { tipo: 'apre', offset: k, alle: r[0][0], wd: g.wd }
  }
  return { tipo: 'chiuso' }
}

export const aperto = (s) => s.tipo === 'sempre' || s.tipo === 'aperto'
export const orario = (min) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`
export const fasceTesto = (r, c) => (r.length ? r.map(([a, b]) => `${orario(a)}–${orario(b)}`).join(', ') : c.T.chiusoFasce)

// Riga sotto il nome nell'elenco.
export function riga(s, c) {
  if (s.tipo === 'sempre') return c.T.sempreAperto
  if (s.tipo === 'aperto') return c.T.apertoFino(orario(s.fino))
  if (s.tipo === 'apre') return c.T.apre(s.offset, c.T.giorni[s.wd], orario(s.alle))
  return c.T.chiusoPerOra
}

// Titolo nella pagina del maso.
export function titolo(s, c) {
  if (s.tipo === 'sempre') return c.T.titoloSempre
  if (s.tipo === 'aperto') return c.T.titoloAperto(orario(s.fino))
  if (s.tipo === 'apre') return c.T.titoloApre(s.offset, c.T.giorni[s.wd], orario(s.alle))
  return c.T.titoloChiuso
}

/** La novità del maso se è ancora valida oggi (come activeNotice nell'app). */
export function novita(f, ora) {
  if (!f.notice_text || !f.notice_until || giorniA(f.notice_until, ora) < 0) return null
  return { text: f.notice_text, until: f.notice_until }
}

export function prezzo(p, c) {
  if (p.price_min == null) return ''
  const decimali = p.price_min % 1 || (p.price_max ?? 0) % 1 ? 2 : 0
  const euro = (n) => n.toLocaleString(c.T.locale, { minimumFractionDigits: decimali, maximumFractionDigits: 2 })
  const valore = p.price_max && p.price_max !== p.price_min ? `${euro(p.price_min)}–${euro(p.price_max)} €` : `${euro(p.price_min)} €`
  // Senza unità resta il solo prezzo, invece di "undefined".
  if (!p.price_unit) return valore
  const q = p.price_quantity ?? 1
  const [uno, tanti] = c.T.unita[p.price_unit] ?? [p.price_unit, p.price_unit]
  return `${valore} / ${q === 1 ? uno : `${q} ${tanti}`}`
}

// Con la maiuscola anche se l'admin l'ha scritto minuscolo ("arance" → "Arance").
export const nomeProdotto = (kind, c) => {
  const nome = c.kinds[kind]?.[c.lang] ?? kind
  return nome.charAt(0).toLocaleUpperCase(c.lang) + nome.slice(1)
}

export function prodottiInBreve(f, c) {
  const nomi = f.products.filter((p) => p.available).map((p) => nomeProdotto(p.kind, c))
  if (!nomi.length) return c.T.nienteDisponibile
  const testo = nomi.slice(0, 4).map((n, i) => (i && c.T.minuscole ? n.toLowerCase() : n)).join(', ')
  return nomi.length > 4 ? `${testo}${c.T.eAltro}` : testo
}

export function distanza(da, f) {
  const r = Math.PI / 180
  const a = Math.sin(((f.lat - da.lat) * r) / 2) ** 2 +
    Math.cos(da.lat * r) * Math.cos(f.lat * r) * Math.sin(((f.lng - da.lng) * r) / 2) ** 2
  return 12742 * Math.asin(Math.sqrt(a))
}
// Sotto il chilometro a 100 m (mai "0 m"); da 950 m in su si scrive già "1 km", non "1000 m".
export function km(d, c) {
  const m = Math.max(100, Math.round(d * 10) * 100)
  if (m < 1000) return `${m} m`
  return d < 10 ? `${d.toLocaleString(c.T.locale, { maximumFractionDigits: 1 })} km` : `${Math.round(d)} km`
}

// Codici Unsplash per i masi di prova, indirizzi completi per le foto caricate dall'admin.
export const foto = (id, w) =>
  /^https?:\/\//.test(id) ? id : `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=75`

export const linkMaso = (slug, c) => `${c.base}produttori/${encodeURIComponent(slug)}/`

/** Un nome da usare in un indirizzo: "sanGenesio" → "san-genesio", "Sarentino" → "sarentino". */
export const slugDi = (s) => String(s ?? '').replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
  .normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

// Ricerca in tre passi come nell'app (nostrano/Model/SearchFilters.swift): Dove, Quando, Cosa. ---------------
// "r" è la ricerca: { comune, km, quando, giorno, minuto, q, prodotti, categorie, bio, h24, carta, negozio,
// disponibili, ordine }. Le stesse regole servono al generatore (pagine dei paesi e dei prodotti) e al browser.

// Le categorie nell'ordine dell'app (ProductCategory.allCases); i filtri veloci usano CATEGORIE.
export const ORDINE_CATEGORIE = ['verdura', 'frutta', 'uova', 'carne', 'latticini', 'miele', 'vino', 'pane', 'altro']
export const DISTANZE = [2, 5, 10, 25]
export const QUANDO = ['sempre', 'ora', 'oggi', 'domani', 'giorno']
export const ORDINI = ['vicini', 'aperti', 'nome', 'aggiornati']
const SI_NO = ['bio', 'h24', 'carta', 'negozio', 'disponibili']

export const RICERCA_VUOTA = Object.freeze({
  comune: '', km: 0, quando: 'sempre', giorno: '', minuto: 600, q: '', prodotti: [], categorie: [],
  bio: false, h24: false, carta: false, negozio: false, disponibili: false, preferiti: false, ordine: 'vicini',
})
export const nuovaRicerca = (r = {}) => ({ ...RICERCA_VUOTA, prodotti: [], categorie: [], ...r })
export const stessaRicerca = (a, b) => JSON.stringify(nuovaRicerca(a)) === JSON.stringify(nuovaRicerca(b))

export const categoria = (kind, c) => c.kinds[kind]?.cat ?? 'altro'

/** Aperto adesso o più tardi oggi (isOpenLater nell'app). */
export const apertoPiuTardi = (f, ora) => f.has_vending_24h || fasce(f, giorno(ora)).some(([, a]) => a > ora.min)

/** Aperto almeno un po' nel giorno indicato (isOpen(onDayOf:) nell'app). */
export const apertoIlGiorno = (f, g) => f.has_vending_24h || fasce(f, g).length > 0

/** Il momento di "Scegli giorno e ora": senza una scelta, domani alle 10 come nell'app. */
export function oraScelta(r, ora) {
  const [y, m, d] = (r.giorno || giorno(ora, 1).iso).split('-').map(Number)
  return { y, m, d, min: r.minuto ?? 600 }
}

/**
 * Il giorno che la ricerca guarda, quando Quando è oggi, domani o un giorno e un'ora: le schede dicono allora gli
 * orari di quel giorno invece dello stato di adesso. Con "Quando vuoi" o "Aperto ora" è null.
 * tra: 0 oggi, 1 domani, oltre il giorno con la data.
 */
export function giornoCercato(r, ora) {
  if (r.quando === 'oggi') return { g: giorno(ora), tra: 0 }
  if (r.quando === 'domani') return { g: giorno(ora, 1), tra: 1 }
  if (r.quando !== 'giorno') return null
  const scelta = oraScelta(r, ora)
  const g = giorno(scelta)
  return { g, tra: giorniA(g.iso, ora), scelta }
}

/**
 * Riga e bollino di una scheda per il giorno cercato: "Domani 8:00–12:00", "Venerdì 30: chiuso"; sul bollino
 * "Aperto domani". Verde se il maso è aperto quel giorno (o, con un'ora scelta, a quell'ora).
 */
export function statoDelGiorno(f, cercato, c) {
  const { g, tra, scelta } = cercato
  const T = c.T
  const etichetta = tra === 0 ? T.oggiBreve : tra === 1 ? T.domaniBreve : T.giornoData(T.giorni[g.wd], g.data.getUTCDate())
  const breve = tra === 0 ? T.oggiMinuscolo : tra === 1 ? T.domaniMinuscolo : T.giornoBreve(g.wd, g.data.getUTCDate())
  const fasceGiorno = fasce(f, g)
  const si = scelta ? aperto(stato(f, scelta)) : tra === 0 ? apertoPiuTardi(f, c.ora) : apertoIlGiorno(f, g)
  const testo = f.has_vending_24h ? T.sempreAperto
    : T.orariDelGiorno(etichetta, fasceGiorno.length ? fasceTesto(fasceGiorno, c) : T.chiusoMinuscolo, tra <= 1)
  return { aperto: si, testo, bollino: f.has_vending_24h ? T.aperto : T.bollinoGiorno(si, breve) }
}

export function passaQuando(f, r, ora) {
  if (r.quando === 'ora') return aperto(stato(f, ora))
  if (r.quando === 'oggi') return apertoPiuTardi(f, ora)
  if (r.quando === 'domani') return apertoIlGiorno(f, giorno(ora, 1))
  if (r.quando === 'giorno') return aperto(stato(f, oraScelta(r, ora)))
  return true
}

// Nome del maso, comune e prodotti nelle due lingue, come matchesText nell'app; qui anche senza accenti.
function passaTesto(f, q, c) {
  const testo = normalizza(String(q ?? '').trim())
  if (!testo) return true
  const pagliaio = [f.name, ...comuneInTutteLeLingue(f.municipality)]
  for (const p of f.products) pagliaio.push(c.kinds[p.kind]?.it ?? p.kind, c.kinds[p.kind]?.de ?? p.kind, p.detail ?? '')
  return pagliaio.some((x) => normalizza(x).includes(testo))
}

/**
 * Se il maso passa la ricerca. "da" è il punto da cui si misurano le distanze. I preferiti stanno solo nel browser
 * (c.preferiti, un Set di slug): senza, "Preferiti" non lascia passare nessuno.
 */
export function passa(f, r, c, da) {
  if (r.comune && f.municipality !== r.comune) return false
  if (r.preferiti && !c.preferiti?.has(f.slug)) return false
  if (r.bio && !f.is_organic) return false
  if (r.h24 && !f.has_vending_24h) return false
  if (r.carta && !f.payments?.includes('card')) return false
  if (r.negozio && !f.has_farm_shop) return false
  if (r.km && distanza(da, f) > r.km) return false
  // "Solo prodotti disponibili adesso": contano soltanto quelli che il maso ha in questo momento.
  const prodotti = r.disponibili ? f.products.filter((p) => p.available) : f.products
  if (r.disponibili && !prodotti.length) return false
  // Con prodotti precisi valgono loro al posto delle categorie, come nell'app.
  if (r.prodotti.length) {
    if (!prodotti.some((p) => r.prodotti.includes(p.kind))) return false
  } else if (r.categorie.length && !prodotti.some((p) => r.categorie.includes(categoria(p.kind, c)))) {
    return false
  }
  return passaTesto(f, r.q, c) && passaQuando(f, r, c.ora)
}

/** Il centro di un comune: la media delle coordinate dei suoi masi. */
export function centroComune(farms, comuneScelto) {
  const suoi = farms.filter((f) => f.municipality === comuneScelto)
  if (!suoi.length) return null
  return { lat: suoi.reduce((s, f) => s + f.lat, 0) / suoi.length, lng: suoi.reduce((s, f) => s + f.lng, 0) / suoi.length }
}

/** Da dove si misurano le distanze: il comune scelto, la posizione di chi visita o il centro della zona. */
export const origine = (r, farms, posizione, zona) => (r.comune && centroComune(farms, r.comune)) || posizione || zona

export function ordina(elenco, r, c, da) {
  const vicino = (a, b) => distanza(da, a) - distanza(da, b)
  const per = {
    vicini: vicino,
    aperti: (a, b) => aperto(stato(b, c.ora)) - aperto(stato(a, c.ora)) || vicino(a, b),
    nome: (a, b) => a.name.localeCompare(b.name, c.lang),
    aggiornati: (a, b) => Date.parse(b.last_checked_at) - Date.parse(a.last_checked_at),
  }
  return [...elenco].sort(per[r.ordine] ?? vicino)
}

/**
 * Le novità ancora valide oggi, le più recenti prima. Il database non tiene la data della novità: vale quella
 * dell'ultimo aggiornamento della scheda (last_checked_at), poi chi scade prima.
 */
export function novitaDeiMasi(farms, ora) {
  return farms.map((f) => ({ f, n: novita(f, ora) })).filter((x) => x.n)
    .sort((a, b) => (Date.parse(b.f.last_checked_at) || 0) - (Date.parse(a.f.last_checked_at) || 0)
      || a.n.until.localeCompare(b.n.until) || a.f.name.localeCompare(b.f.name))
}

/** "Di stagione adesso": i prodotti disponibili adesso nel maggior numero di masi, al massimo "quanti". */
export function prodottiDiStagione(farms, c, quanti = 8) {
  const conti = new Map()
  for (const f of farms) {
    for (const kind of new Set(f.products.filter((p) => p.available).map((p) => p.kind))) conti.set(kind, (conti.get(kind) ?? 0) + 1)
  }
  return [...conti].map(([kind, n]) => ({ kind, n }))
    .sort((a, b) => b.n - a.n || nomeProdotto(a.kind, c).localeCompare(nomeProdotto(b.kind, c), c.lang))
    .slice(0, quanti)
}

/** I prodotti che almeno un maso ha, nell'ordine dell'app (categoria, poi nome), con quanti masi li hanno. */
export function prodottiPresenti(farms, c) {
  const conti = new Map()
  for (const f of farms) for (const kind of new Set(f.products.map((p) => p.kind))) conti.set(kind, (conti.get(kind) ?? 0) + 1)
  // In ordine alfabetico, nella lingua della pagina.
  return [...conti].map(([kind, n]) => ({ kind, n }))
    .sort((a, b) => nomeProdotto(a.kind, c).localeCompare(nomeProdotto(b.kind, c), c.lang))
}

export const categoriePresenti = (farms, c) =>
  ORDINE_CATEGORIE.filter((k) => farms.some((f) => f.products.some((p) => categoria(p.kind, c) === k)))

/** I comuni dove c'è almeno un maso, in ordine di nome nella lingua della pagina, con quanti masi hanno. */
export function comuniPresenti(farms, c) {
  const conti = new Map()
  for (const f of farms) conti.set(f.municipality, (conti.get(f.municipality) ?? 0) + 1)
  return [...conti].map(([codice, n]) => ({ codice, n }))
    .sort((a, b) => comune(a.codice, c.lang).localeCompare(comune(b.codice, c.lang), c.lang))
}

// Riassunti delle tre parti, come whereLabel, whenLabel e whatLabel nell'app.
export function riassuntoDove(r, c) {
  if (r.comune) return comune(r.comune, c.lang)
  return r.km ? c.T.entroKm(r.km) : c.T.vicinoATe
}

export function riassuntoQuando(r, c) {
  if (r.quando !== 'giorno') return c.T.quandoOpzioni[r.quando] ?? c.T.quandoOpzioni.sempre
  const o = oraScelta(r, c.ora)
  return new Intl.DateTimeFormat(c.T.locale, {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'UTC',
  }).format(new Date(Date.UTC(o.y, o.m - 1, o.d, Math.floor(o.min / 60), o.min % 60)))
}

export function riassuntoCosa(r, c) {
  const nomi = r.prodotti.map((k) => nomeProdotto(k, c)).sort((a, b) => a.localeCompare(b, c.lang))
  const parti = nomi.length
    ? nomi.length > 3 ? [...nomi.slice(0, 2), `+${nomi.length - 2}`] : nomi
    : ORDINE_CATEGORIE.filter((k) => r.categorie.includes(k)).map((k) => c.T.categorie[k])
  if (r.bio) parti.push(c.T.bio)
  if (r.h24) parti.push(c.T.distributore24h)
  if (r.q.trim()) parti.unshift(c.T.virgolette(r.q.trim()))
  return parti.length ? parti.join(', ') : c.T.tuttiIProdotti
}

export const riassunto = (r, c) => [riassuntoDove(r, c), riassuntoQuando(r, c), riassuntoCosa(r, c)].join(' · ')

/** Quanti filtri del pannello Filtri sono accesi (il numero sul pulsante). */
export const filtriAttivi = (r) => SI_NO.filter((k) => r[k]).length + (r.ordine !== 'vicini' ? 1 : 0)

/**
 * La ricerca dall'indirizzo. Valgono anche i parametri di prima (q, prodotto, categoria, aperti, bio, h24, carta,
 * ordine): "aperti" diventa Quando: Aperto ora. "comuni" sono i codici dei comuni dei masi.
 */
export function leggiRicerca(params, comuni = []) {
  const r = nuovaRicerca()
  const scelto = params.get('comune')
  if (scelto) r.comune = comuni.find((m) => slugDi(m) === scelto || m === scelto) ?? ''
  const km = Number(params.get('km'))
  if (DISTANZE.includes(km)) r.km = km
  const quando = params.get('quando') ?? (params.has('aperti') ? 'ora' : '')
  const giornoOra = quando.match(/^(\d{4}-\d\d-\d\d)T(\d\d):(\d\d)$/)
  if (['ora', 'oggi', 'domani'].includes(quando)) r.quando = quando
  else if (giornoOra) Object.assign(r, { quando: 'giorno', giorno: giornoOra[1], minuto: +giornoOra[2] * 60 + +giornoOra[3] })
  r.q = params.get('q') ?? ''
  const tutti = (nome) => [...new Set(params.getAll(nome).flatMap((v) => v.split(',')).map((v) => v.trim()).filter(Boolean))]
  r.prodotti = tutti('prodotto')
  r.categorie = tutti('categoria').filter((k) => ORDINE_CATEGORIE.includes(k))
  for (const k of SI_NO) r[k] = params.has(k)
  r.preferiti = params.has('preferiti')
  if (ORDINI.includes(params.get('ordine'))) r.ordine = params.get('ordine')
  return r
}

/** La ricerca nell'indirizzo, così si può condividere. */
export function scriviRicerca(r) {
  const u = new URLSearchParams()
  if (r.comune) u.set('comune', slugDi(r.comune))
  if (r.km) u.set('km', String(r.km))
  if (r.quando === 'giorno' && r.giorno) {
    const ore = String(Math.floor(r.minuto / 60)).padStart(2, '0')
    u.set('quando', `${r.giorno}T${ore}:${String(r.minuto % 60).padStart(2, '0')}`)
  } else if (r.quando !== 'sempre') u.set('quando', r.quando)
  if (r.q.trim()) u.set('q', r.q.trim())
  for (const k of r.prodotti) u.append('prodotto', k)
  for (const k of r.categorie) u.append('categoria', k)
  for (const k of SI_NO) if (r[k]) u.set(k, '1')
  if (r.preferiti) u.set('preferiti', '1')
  if (r.ordine !== 'vicini') u.set('ordine', r.ordine)
  return u
}

// Una scheda dell'elenco. La stessa per l'elenco compatto e per le schede con la foto grande: cambia solo il CSS.
export function scheda(f, i, c, { da, prodotto = '', entra = false, ricerca = null }) {
  const ora = statoScheda(f, c, ricerca)
  const cercato = prodotto && f.products.find((p) => p.kind === prodotto)
  const avviso = novita(f, c.ora)
  let ultima
  if (cercato) {
    ultima = `<p class="farm-line"><strong>${esc(nomeProdotto(cercato.kind, c))}</strong> ${
      cercato.available ? esc(prezzo(cercato, c)) : `<span class="muted">${esc(c.T.finitoPerOra)}</span>`}</p>`
  } else if (avviso) {
    ultima = `<p class="farm-line notice-line">${icona('megaphone')}<span>${esc(avviso.text)}</span></p>`
  } else {
    ultima = `<p class="farm-line">${esc(prodottiInBreve(f, c))}</p>`
  }
  const immagine = f.photos?.length
    ? `<img src="${esc(foto(f.photos[0], 560))}" alt="" width="560" height="420" loading="${i < 6 ? 'eager' : 'lazy'}" decoding="async"
          style="view-transition-name: foto-${esc(f.slug)}" onload="this.classList.add('ok')">`
    : `<span class="no-photo">${icona('store')}</span>`
  return `<li class="farm${entra ? ' enter' : ''}" style="--i:${Math.min(i, 9)}" data-slug="${esc(f.slug)}">
    <a class="farm-link" href="${esc(linkMaso(f.slug, c))}">
      <div class="farm-photo">
        ${immagine}
        ${ora.bollino}
      </div>
      <div class="farm-body">
        <h3><span class="farm-name">${esc(f.name)}</span>${f.is_organic ? `<span class="tag bio">${esc(c.T.bio)}</span>` : ''}</h3>
        ${ora.riga}
        <p class="meta">${esc(comune(f.municipality, c.lang))} · ${km(distanza(da, f), c)}${
          f.last_checked_at && giorniDa(f.last_checked_at, c.ora) > 60 ? ` · <span class="stale">${esc(c.T.daVerificare)}</span>` : ''}</p>
        ${ultima}
      </div>
    </a>
    ${cuore(f, c)}
  </li>`
}

/**
 * Il cuore dei preferiti: fuori dal link (un bottone dentro un link non vale), sopra la foto. Resta nascosto
 * finché il browser non dice che può ricordarlo (localStorage): senza, non compare.
 */
export const cuore = (f, c, classe = 'fav') =>
  `<button class="${classe}" type="button" data-preferito="${esc(f.slug)}" aria-pressed="false" aria-label="${esc(c.T.preferito(f.name))}" hidden>${icona('heart')}</button>`

// Le due parti della scheda che cambiano con l'ora: il browser le ricalcola senza toccare il resto.
export const badge = (s, c) =>
  `<span class="photo-status${aperto(s) ? ' open' : ''}"><span class="dot"></span>${esc(aperto(s) ? c.T.aperto : c.T.chiuso)}</span>`
export const rigaStato = (s, c) =>
  `<p class="status${aperto(s) ? ' open' : ''}"><span class="dot"></span>${esc(riga(s, c))}</p>`

/** Riga e bollino di una scheda: lo stato di adesso, o gli orari del giorno che la ricerca guarda. */
export function statoScheda(f, c, ricerca = null) {
  const cercato = ricerca && giornoCercato(ricerca, c.ora)
  if (!cercato) {
    const s = stato(f, c.ora)
    return { riga: rigaStato(s, c), bollino: badge(s, c) }
  }
  const d = statoDelGiorno(f, cercato, c)
  return {
    riga: `<p class="status${d.aperto ? ' open' : ''}"><span class="dot"></span>${esc(d.testo)}</p>`,
    bollino: `<span class="photo-status${d.aperto ? ' open' : ''}"><span class="dot"></span>${esc(d.bollino)}</span>`,
  }
}

// "Tienimeli da parte" ------------------------------------------------------------------------------
// Le stesse regole dell'app (AppState+Requests.swift, Requests.swift, Product.requestStep): le richieste solo ai
// masi con il negozio e le richieste accese; il "+" aggiunge una confezione nell'unità del prodotto; i giorni sono
// i prossimi sette in cui il negozio è aperto, con le chiusure (oggi solo se non ha già chiuso). Il server
// ricontrolla tutto (request_create).

export const accettaRichieste = (f) => !!(f.has_farm_shop && f.accepts_requests)

/** L'unità in cui si chiede un prodotto: quella del prezzo, o quella solita del catalogo. */
export const unitaDi = (p, c) => p.price_unit ?? c.kinds[p.kind]?.unit ?? 'pezzo'

/** Un "+": la confezione del prezzo (almeno 1); a grammi senza confezione, 250 g. */
export function passo(p, c) {
  const q = p.price_quantity ?? 1
  return unitaDi(p, c) === 'g' ? (q > 1 ? q : 250) : Math.max(q, 1)
}

const cifre = (n, c) => n.toLocaleString(c.T.locale, { maximumFractionDigits: 2 })

/** "1 pezzo", "12 pezzi", "2 kg", "500 g", "3 l": come PriceUnit.amount nell'app. */
export function quantita(n, unit, c) {
  if (unit === 'l') return `${cifre(n, c)} l`
  const [uno, tanti] = c.T.unita[unit] ?? [unit, unit]
  return `${cifre(n, c)} ${n === 1 ? uno : tanti}`
}

/** Il nome di una riga di una richiesta: quello copiato all'invio, nella lingua della pagina. */
export const nomeRiga = (r, c) => (c.lang === 'de' ? r.name_de || r.name_it : r.name_it) || nomeProdotto(r.kind, c)

/** "12 uova", "2 kg mele", "1 vasetto confetture": come RequestLine.summary. */
export function rigaInBreve(r, c) {
  const nome = c.T.minuscole ? nomeRiga(r, c).toLowerCase() : nomeRiga(r, c)
  const q = Number(r.quantity)
  return r.unit === 'pezzo' ? `${cifre(q, c)} ${nome}` : `${quantita(q, r.unit, c)} ${nome}`
}

/** "12 uova · 2 kg mele", oppure la nota tra virgolette se non ci sono prodotti. */
export const richiestaInBreve = (r, c) =>
  (r.lines?.length ? r.lines.map((x) => rigaInBreve(x, c)).join(' · ') : c.T.virgolette(r.note ?? ''))

/** I prossimi sette giorni in cui si può passare: negozio aperto, con le chiusure; oggi solo se non ha già chiuso. */
export function giorniRichiesta(f, ora) {
  return Array.from({ length: 7 }, (_, i) => giorno(ora, i)).filter((g, i) => {
    const r = fasce(f, g)
    return r.length > 0 && (i > 0 || f.has_vending_24h || r.some(([, fine]) => fine > ora.min))
  })
}

/** Il giorno di una data "2026-10-30", come giorno(): per scriverlo con dataEstesa. */
export function giornoDellaData(iso) {
  const t = new Date(`${iso}T12:00:00Z`)
  return { iso, wd: t.getUTCDay() + 1, data: t }
}

/** "venerdì 30 ottobre alle 10:24": un istante (invio, risposta, scadenza) nell'ora di Roma. */
export function istanteEsteso(istante, c) {
  const o = oraDi(new Date(istante))
  return c.T.dataOra(dataEstesa(giorno(o), c), orario(o.min))
}

/** Lo stato di adesso: in attesa oltre la scadenza, o con il giorno passato, vale già come scaduta. */
export function statoRichiesta(r, istante = Date.now(), ora = oraDi(new Date(istante))) {
  if (r.status !== 'waiting') return r.status
  return (r.expires_at && Date.parse(r.expires_at) <= istante) || giorniA(r.day, ora) < 0 ? 'expired' : 'waiting'
}

/** Il giorno in cui passare: quello proposto dal maso, se ne ha proposto un altro. */
export const giornoRitiro = (r) => (r.status === 'other_day' && r.other_day ? r.other_day : r.day)

/** In quale scheda di "Le mie richieste" sta: da ritirare, in attesa o storico. */
export function gruppoRichiesta(r, istante = Date.now()) {
  const ora = oraDi(new Date(istante))
  const s = statoRichiesta(r, istante, ora)
  if (s === 'waiting') return 'attesa'
  if ((s === 'accepted' || s === 'other_day') && giorniA(giornoRitiro(r), ora) >= 0) return 'ritirare'
  return 'storico'
}

/** Si annulla finché è in attesa o da ritirare. */
export const siPuoAnnullare = (r, istante = Date.now()) => gruppoRichiesta(r, istante) !== 'storico'

/** Le richieste di una scheda, nell'ordine dell'app: da ritirare dal giorno più vicino, in attesa per giorno,
 * lo storico dal più recente. */
export function richiesteDi(gruppo, richieste, istante = Date.now()) {
  const tutte = richieste.filter((r) => gruppoRichiesta(r, istante) === gruppo)
  const giornoDi = gruppo === 'ritirare' ? giornoRitiro : (r) => r.day
  return tutte.sort((a, b) => (gruppo === 'storico'
    ? giornoRitiro(b).localeCompare(giornoRitiro(a)) || b.created_at.localeCompare(a.created_at)
    : giornoDi(a).localeCompare(giornoDi(b)) || a.created_at.localeCompare(b.created_at)))
}

export const LOGO = `<svg viewBox="0 0 40 50" aria-hidden="true"><path d="M20 49 L5.3 31 A19 19 0 1 1 34.7 31 Z" fill="#3E6B3A"/><rect x="18.8" y="15" width="2.4" height="13" rx="1.2" fill="#fff"/><ellipse cx="14.6" cy="16.4" rx="5" ry="2.9" transform="rotate(32 14.6 16.4)" fill="#fff"/><ellipse cx="25.6" cy="13.6" rx="5.8" ry="3.4" transform="rotate(-32 25.6 13.6)" fill="#fff"/></svg>`

// Icone a linea, come quelle della pagina del maso (web/assets/icons.js).
const PATHS = {
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  sliders: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><rect x="3" y="4.5" width="3" height="3" rx="0.6"/><rect x="3" y="10.5" width="3" height="3" rx="0.6"/><rect x="3" y="16.5" width="3" height="3" rx="0.6"/>',
  map: '<path d="m9 4-5.5 2v14L9 18l6 2 5.5-2V4L15 6 9 4z"/><path d="M9 4v14M15 6v14"/>',
  grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
  locate: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2"/>',
  pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  route: '<path d="m3 11 18-8-8 18-2-8-8-2z"/>',
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  megaphone: '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
  card: '<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M2.5 10h19"/>',
  store: '<path d="M3 9.5 4.5 4h15L21 9.5"/><path d="M4 10v10h16V10"/><path d="M9.5 20v-6h5v6"/><path d="M3 9.5a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/>',
  box: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h8M12 15v2"/>',
  leaf: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10z"/><path d="M2 21c0-3 1.9-5.4 5.1-6"/>',
  back: '<path d="m15 18-6-6 6-6"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  calendar: '<rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>',
  bag: '<path d="M6 7h12l1 13H5L6 7z"/><path d="M9 10V6a3 3 0 0 1 6 0v4"/>',
  flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  'chevron-down': '<path d="m6 9 6 6 6-6"/>',
  'chevron-right': '<path d="m9 6 6 6-6 6"/>',
  heart: '<path d="M12 20.3s-7.4-4.5-9.1-9.3C1.7 7.5 4 4.6 7.2 4.6c2 0 3.7 1.1 4.8 2.8 1.1-1.7 2.8-2.8 4.8-2.8 3.2 0 5.5 2.9 4.3 6.4-1.7 4.8-9.1 9.3-9.1 9.3z"/>',
  share: '<path d="M12 3.5v11M7.5 8 12 3.5 16.5 8"/><path d="M5 12.5v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/>',
  basket: '<path d="M3.5 10h17l-1.7 8.7a1.6 1.6 0 0 1-1.6 1.3H6.8a1.6 1.6 0 0 1-1.6-1.3z"/><path d="m8.5 10 2.5-6M15.5 10 13 4M9.5 13.5v3.5M14.5 13.5v3.5"/>',
  'chevron-up': '<path d="m18 15-6-6-6 6"/>',
  // Account e "Tienimeli da parte".
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c1.2-3.8 4-5.8 7.5-5.8s6.3 2 7.5 5.8"/>',
  logout: '<path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/><path d="M9 16l-4-4 4-4M5 12h11"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/>',
  repeat: '<path d="M4 12a8 8 0 0 1 13.7-5.6L20 9"/><path d="M20 4v5h-5"/><path d="M20 12a8 8 0 0 1-13.7 5.6L4 15"/><path d="M4 20v-5h5"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6"/><path d="M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  // Le categorie, come i simboli dell'app (ProductCategory.symbol).
  'cat-verdura': '<path d="M4 20c3-7 6-10.5 8.5-12.3a2.7 2.7 0 0 1 3.8 3.8C14.5 14 11 17 4 20z"/><path d="M15.5 8.5 19 5M15.5 8.5h4.5M15.5 8.5V4"/>',
  'cat-frutta': '<path d="M12 7.5c-2-1.6-6.2-1.3-7 2.3-.8 3.6 1.2 8.3 4 10 1.2.7 2 .4 3 0 1 .4 1.8.7 3 0 2.8-1.7 4.8-6.4 4-10-.8-3.6-5-3.9-7-2.3z"/><path d="M12 7.5c0-2 1-3.4 2.6-4"/>',
  'cat-uova': '<path d="M12 3c3.6 0 6.5 5.6 6.5 10a6.5 6.5 0 0 1-13 0C5.5 8.6 8.4 3 12 3z"/>',
  'cat-carne': '<path d="M5 3v4a2 2 0 0 0 4 0V3M7 9v12"/><path d="M17 21V3c-2 1.5-3 4-3 7v3h3"/>',
  'cat-latticini': '<path d="M9 3h6M10 3v3L8 9.5V20a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V9.5L14 6V3"/><path d="M8 13.5h8"/>',
  'cat-miele': '<path d="M12 3 19.5 7.5v9L12 21l-7.5-4.5v-9z"/><path d="M12 9.2l2.8 1.6v3.4L12 15.8l-2.8-1.6v-3.4z"/>',
  'cat-vino': '<path d="M8 3h8l-.4 5.2a3.6 3.6 0 0 1-7.2 0z"/><path d="M12 11.8V20M8.5 20h7"/>',
  'cat-pane': '<path d="M4 13c0-4 3.6-7 8-7s8 3 8 7v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><path d="m9 9.5 1 3M13 9l.4 3.2M16.6 10l-.6 2.6"/>',
  'cat-altro': '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10z"/><path d="M2 21c0-3 1.9-5.4 5.1-6"/>',
}
export function icona(nome) {
  return `<svg class="icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[nome] ?? ''}</svg>`
}
