// Pezzi di pagina del sito pubblico, uguali al prototipo (docs/prototipo-sito/home.js e maso.js).
// Il generatore li mette nell'HTML già pronto; il browser li rifà quando cambiano i filtri o l'ora.
import {
  CATEGORIE, DISTANZE, QUANDO, aperto, categoria, categoriePresenti, comune, comuneInTutteLeLingue, comuniPresenti,
  dataEstesa, esc, fasce, fasceTesto, filtriAttivi, foto, giorniA, giorniDa, giorno, icona, linkMaso, maiuscola, nomeProdotto,
  normalizza, novita, oraScelta, orario, prezzo, prodottiPresenti, riassunto, riassuntoCosa, riassuntoDove,
  riassuntoQuando, stato, titolo,
} from './comune.js?v=4c1a21cc08'

// Home ---------------------------------------------------------------------------------------------

export const chip = (attr, testo, premuto, prima = '') =>
  `<button class="chip" type="button" ${attr} aria-pressed="${premuto}">${prima}${esc(testo)}</button>`

// Filtri veloci: scorciatoie della stessa ricerca (Aperti ora = Quando: Aperto ora, le categorie = Cosa).
// "Preferiti" c'è solo se nel browser ce n'è almeno uno, e porta alla pagina dei preferiti (non è più un filtro).
export function chips(r, c, { preferiti = 0 } = {}) {
  const n = filtriAttivi(r)
  const testo = r.q.trim()
    ? `<button class="chip product" type="button" data-togli-testo aria-label="${esc(c.T.togliRicerca)}">${esc(c.T.virgolette(r.q.trim()))} ${icona('x')}</button>`
    : ''
  const prodotti = r.prodotti.map((k) => {
    const nome = nomeProdotto(k, c)
    return `<button class="chip product" type="button" data-togli-prodotto="${esc(k)}" aria-label="${esc(c.T.togli(nome))}">${esc(nome)} ${icona('x')}</button>`
  }).join('')
  return `<button class="chip" type="button" id="apri-filtri" aria-haspopup="dialog">${icona('sliders')}${esc(c.T.filtri)}${n ? `<span class="count">${n}</span>` : ''}</button>` +
    testo + prodotti +
    (preferiti ? `<a class="chip" href="${esc(`${c.base}preferiti/`)}">${icona('heart')}${esc(c.T.preferiti)}<small>${preferiti}</small></a>` : '') +
    chip('data-veloce="ora"', c.T.apertiOra, r.quando === 'ora', '<span class="dot"></span>') +
    chip('data-veloce="bio"', c.T.bio, r.bio) +
    chip('data-veloce="h24"', c.T.distributore, r.h24) +
    '<span class="sep" aria-hidden="true"></span>' +
    CATEGORIE.map((k) => chip(`data-categoria="${k}"`, c.T.categorie[k], r.categorie.includes(k))).join('')
}

// Il pannello Filtri tiene quello che non sta in Dove, Quando e Cosa.
export function pannello(r, c) {
  const si = [['bio', c.T.soloBio], ['h24', c.T.conDistributore], ['carta', c.T.carta], ['negozio', c.T.puntoVendita], ['disponibili', c.T.disponibili]]
  return `
    <fieldset><legend>${esc(c.T.mostraSolo)}</legend><div class="chip-row">
      ${si.map(([k, t]) => chip(`data-solo="${k}"`, t, r[k])).join('')}
    </div></fieldset>
    <fieldset><legend>${esc(c.T.ordina)}</legend><div class="chip-row">
      ${Object.entries(c.T.ordini).map(([k, t]) => chip(`data-ordine="${k}"`, t, r.ordine === k)).join('')}
    </div></fieldset>`
}

export const conteggio = (trovati, totale, apertiOra, c) =>
  trovati === totale ? c.T.contaTutti(trovati, apertiOra) : c.T.contaFiltrati(trovati, totale)

/** La riga sopra l'elenco: da dove si misurano le distanze. */
export function daDove(r, posizioneVera, c) {
  if (r.comune) return `${icona('pin')} ${esc(c.T.dalCentroDi(comune(r.comune, c.lang)))}`
  return posizioneVera
    ? `${icona('locate')} ${esc(c.T.dallaPosizione)}`
    : `${icona('pin')} ${esc(c.T.dalCentro)} · <button class="link-btn" type="button" id="posizione">${esc(c.T.usaPosizione)}</button>`
}

// Ricerca in tre passi ---------------------------------------------------------------------------

const PASSI = ['dove', 'quando', 'cosa']
const scelto = (r, passo) => (passo === 'dove' ? r.comune || r.km : passo === 'quando' ? r.quando !== 'sempre'
  : r.prodotti.length || r.categorie.length || r.q.trim() || r.bio || r.h24)
const valore = (r, passo, c) => (passo === 'dove' ? riassuntoDove(r, c) : passo === 'quando' ? riassuntoQuando(r, c) : riassuntoCosa(r, c))

const ICONE = { dove: 'pin', quando: 'clock', cosa: 'basket' }

/**
 * Il riquadro della ricerca: i tre campi (in fila sul computer, uno sotto l'altro sul telefono) e "Cerca".
 * Ogni campo apre la finestra della ricerca su quel passo.
 */
export const riquadroRicerca = (r, c) => `<div class="search-box" id="barra" role="search" aria-label="${esc(c.T.ricercaTitolo)}">
        ${PASSI.map((p) => `<button class="sb-field" type="button" data-passo="${p}" aria-haspopup="dialog">
          ${icona(ICONE[p])}<span class="sb-text"><span class="sb-label">${esc(c.T[p])}</span><span class="sb-value${scelto(r, p) ? ' set' : ''}" data-valore="${p}">${esc(valore(r, p, c))}</span></span>${icona('chevron-right')}
        </button>`).join('')}
        <button class="btn primary sb-go" type="button" id="cerca-vai" data-passo="dove" aria-haspopup="dialog">${icona('search')}${esc(c.T.cercaBottone)}</button>
      </div>`

/** Nell'intestazione, quando il riquadro è scivolato via scorrendo: apre la stessa finestra. */
export const capsulaCompatta = (r, c) => `<button class="mini-search" type="button" id="mini-ricerca" tabindex="-1" aria-hidden="true" aria-haspopup="dialog" aria-label="${esc(`${c.T.ricercaTitolo}: ${riassunto(r, c)}`)}">
        ${icona('search')}<span class="mini-riassunto" data-valore="riassunto">${esc(riassunto(r, c))}</span><span class="mini-breve">${esc(c.T.cercaBottone)}</span>
      </button>`

/**
 * Sul computer, a sinistra nella finestra: i tre passi con la scelta attuale. Si cambia con il mouse o le frecce.
 * Lo sfondo bianco del passo scelto è un elemento solo, che il browser fa scorrere al passo nuovo.
 */
export const passiFinestra = (aperto, r, c) => `<div class="sd-steps" role="tablist" aria-orientation="vertical" aria-label="${esc(c.T.ricercaTitolo)}">
          <span class="sd-indicatore" data-tieni aria-hidden="true"></span>
          ${PASSI.map((p) => `<button class="sd-step" type="button" role="tab" id="passo-${p}" data-k="passo-${p}" data-passo="${p}" aria-selected="${p === aperto}" aria-controls="sd-scelte" tabindex="${p === aperto ? 0 : -1}">
            ${icona(ICONE[p])}<span class="sb-text"><span class="sb-label">${esc(c.T[p])}</span><span class="sb-value${scelto(r, p) ? ' set' : ''}" data-riassunto="${p}">${esc(valore(r, p, c))}</span></span>
          </button>`).join('')}
        </div>`

/** A destra nella finestra: le scelte del passo aperto. "entra" la fa comparire con una dissolvenza. */
export const scelteFinestra = (passo, r, c, farms, ui, entra = false) => `<div class="sd-pane${entra ? ' entra' : ''}" id="sd-scelte" role="tabpanel" aria-labelledby="passo-${passo}">
          <h3 class="sd-domanda">${esc(c.T[`${passo}Domanda`])}</h3>${contenutoPasso(passo, r, c, farms, ui)}
        </div>`

/**
 * Il contenuto di un passo. "ui" tiene quello che non è ricerca: il testo per filtrare i comuni e se
 * l'elenco dei prodotti è aperto. Ogni comando ha data-k, così dopo un aggiornamento il fuoco torna al suo posto.
 */
export function contenutoPasso(passo, r, c, farms, ui = {}) {
  if (passo === 'dove') {
    return `
          <label class="field">${icona('search')}<span class="sr">${esc(c.T.cercaComune)}</span>
            <input type="search" data-k="cerca-comune" placeholder="${esc(c.T.cercaComune)}" value="${esc(ui.comune ?? '')}" autocomplete="off" enterkeyhint="search"></label>
          <div class="chip-row"><button class="chip" type="button" data-k="vicino" data-dove="vicino" aria-pressed="${!r.comune}">${icona('locate')}${esc(c.T.vicinoATe)}</button></div>
          <div class="towns" data-elenco="comuni">${ui.comune ? elencoDove(farms, r, c, ui.comune) : ''}</div>
          <h3 class="step-sub">${esc(c.T.distanzaMassima)}</h3>
          <div class="segmented" role="group" aria-label="${esc(c.T.distanzaMassima)}">
            ${[0, ...DISTANZE].map((km) => `<button type="button" data-k="km-${km}" data-km="${km}" aria-pressed="${r.km === km}">${esc(km ? `${km} km` : c.T.tutte)}</button>`).join('')}
          </div>`
  }
  if (passo === 'quando') {
    let giorni = ''
    if (r.quando === 'giorno') {
      const scelta = oraScelta(r, c.ora)
      const iso = `${scelta.y}-${String(scelta.m).padStart(2, '0')}-${String(scelta.d).padStart(2, '0')}`
      const breve = new Intl.DateTimeFormat(c.T.locale, { weekday: 'short', day: 'numeric', timeZone: 'UTC' })
      giorni = `
          <h3 class="step-sub">${esc(c.T.giornoTitolo)}</h3>
          <div class="days">${Array.from({ length: 7 }, (_, i) => {
            const g = giorno(c.ora, i)
            const nome = i === 0 ? c.T.oggiBreve : i === 1 ? c.T.domaniBreve : breve.format(g.data)
            return `<button class="chip" type="button" data-k="giorno-${g.iso}" data-giorno="${g.iso}" aria-pressed="${g.iso === iso}">${esc(nome)}</button>`
          }).join('')}</div>
          <label class="time-field"><span>${esc(c.T.oraTitolo)}</span>
            <select data-k="ora-scelta" data-minuto>${Array.from({ length: 48 }, (_, i) => i * 30)
              .map((m) => `<option value="${m}"${m === scelta.min ? ' selected' : ''}>${String(Math.floor(m / 60)).padStart(2, '0')}:${m % 60 ? '30' : '00'}</option>`).join('')}</select></label>`
    }
    return `
          <div class="when">${QUANDO.map((q) => `<button class="chip" type="button" data-k="quando-${q}" data-quando="${q}" aria-pressed="${r.quando === q}">${esc(c.T.quandoOpzioni[q])}</button>`).join('')}</div>${giorni}`
  }
  // Cosa: testo, categorie a riquadri, prodotti precisi. Con una categoria scelta si vedono solo i suoi prodotti.
  const tutti = prodottiPresenti(farms, c)
  const mostrati = r.categorie.length ? tutti.filter(({ kind }) => r.categorie.includes(categoria(kind, c))) : tutti
  const chiusi = 12
  const visibili = ui.tutti || mostrati.length <= chiusi
    ? mostrati
    : mostrati.filter(({ kind }, i) => i < chiusi || r.prodotti.includes(kind))
  return `
          <label class="field">${icona('search')}<span class="sr">${esc(c.T.testoSegnaposto)}</span>
            <input type="search" data-k="testo" placeholder="${esc(c.T.testoSegnaposto)}" value="${esc(r.q)}" autocomplete="off" enterkeyhint="search"></label>
          <div class="tiles">${categoriePresenti(farms, c).map((k) => `<button class="tile" type="button" data-k="cat-${k}" data-categoria="${k}" aria-pressed="${r.categorie.includes(k)}">${icona(`cat-${k}`)}<span>${esc(c.T.categorie[k])}</span></button>`).join('')}</div>
          <div class="step-head"><h3 class="step-sub">${esc(c.T.prodottiTitolo)}</h3>${r.prodotti.length ? `<button class="link-btn" type="button" data-k="nessuno" data-nessuno>${esc(c.T.nessuno)}</button>` : ''}</div>
          <div class="chip-row products">${visibili.map(({ kind, n }) => `<button class="chip" type="button" data-k="prod-${esc(kind)}" data-prodotto="${esc(kind)}" aria-pressed="${r.prodotti.includes(kind)}">${r.prodotti.includes(kind) ? icona('check') : ''}${esc(nomeProdotto(kind, c))}<small>${n}</small></button>`).join('')}</div>
          ${mostrati.length > chiusi ? `<button class="link-btn more" type="button" data-k="tutti" data-tutti aria-expanded="${!!ui.tutti}">${esc(ui.tutti ? c.T.mostraMeno : c.T.tuttiNProdotti(mostrati.length))}${icona(ui.tutti ? 'chevron-up' : 'chevron-down')}</button>` : ''}`
}

/** I comuni dei masi, filtrati con il nome italiano o tedesco scritto nel campo. */
export function comuniDi(farms, c, testo = '') {
  const cercato = normalizza(testo.trim())
  return comuniPresenti(farms, c).filter(({ codice }) => !cercato || comuneInTutteLeLingue(codice).some((n) => normalizza(n).includes(cercato)))
}

/** I masi con quel nome (almeno due lettere), i primi sei in ordine alfabetico. */
export function masiDiNome(farms, c, testo = '') {
  const cercato = normalizza(testo.trim())
  if (cercato.length < 2) return []
  return farms.filter((f) => normalizza(f.name).includes(cercato))
    .sort((a, b) => a.name.localeCompare(b.name, c.lang))
    .slice(0, 6)
}

/** Sotto il campo di Dove: i comuni con quel nome, poi i masi con quel nome (un tocco apre la loro pagina). */
export function elencoDove(farms, r, c, testo) {
  const comuni = comuniDi(farms, c, testo)
  const masi = masiDiNome(farms, c, testo)
  if (!comuni.length && !masi.length) return `<p class="muted">${esc(c.T.nessunComune)}</p>`
  return comuni.map(({ codice, n }) => `<button class="chip town" type="button" data-k="comune-${esc(codice)}" data-comune="${esc(codice)}" aria-pressed="${r.comune === codice}">${esc(comune(codice, c.lang))}<small>${n}</small></button>`).join('')
    + (masi.length ? `<div class="dove-masi"><h3 class="step-sub">${esc(c.T.masiConNome)}</h3>${masi.map((f) => `<a class="chip town" href="${esc(linkMaso(f.slug, c))}">${icona('store')}${esc(f.name)}<small>${esc(comune(f.municipality, c.lang))}</small></a>`).join('')}</div>` : '')
}

/**
 * Il telefono: i tre passi uno sotto l'altro. Ogni riquadro ha la riga del riassunto e le scelte: aperto, le scelte
 * crescono in altezza e la riga si dissolve nel titolo; chiuso, il contrario. Quello che non si vede è inerte.
 */
export const passiTelefono = (aperto, r, c, farms, ui) => PASSI.map((p) => {
  const si = p === aperto
  return `<section class="step-card${si ? ' open' : ''}" data-passo="${p}" aria-labelledby="${si ? `domanda-${p}` : `riga-${p}`}">
          <div class="step-riga"${si ? ' inert' : ''}><button class="step-closed" type="button" id="riga-${p}" data-k="apri-${p}" data-apri="${p}">${icona(ICONE[p])}<span>${esc(c.T[p])}</span><strong data-riassunto="${p}">${esc(valore(r, p, c))}</strong></button></div>
          <div class="step-espandi"${si ? '' : ' inert'}><div class="step-dentro"><h2 id="domanda-${p}">${esc(c.T[`${p}Domanda`])}</h2>${contenutoPasso(p, r, c, farms, ui)}</div></div>
        </section>`
}).join('')

export const vistaBottoni = (c) =>
  `<button type="button" data-vista="list" aria-label="${esc(c.T.elenco)}" aria-pressed="true">${icona('list')}<span>${esc(c.T.elenco)}</span></button>` +
  `<button type="button" data-vista="grid" aria-label="${esc(c.T.fotoGrandi)}" aria-pressed="false">${icona('grid')}<span>${esc(c.T.foto)}</span></button>` +
  // La mappa c'è solo se il sito la ha (mappa in impostazioni.mjs).
  (c.sito?.mappa ? `<button type="button" data-vista="mappa" aria-label="${esc(c.T.mappa)}" aria-pressed="false">${icona('map')}<span>${esc(c.T.mappa)}</span></button>` : '')

export const promesse = (c) => c.T.promesse.map((t) => `<li>${icona('check')}${esc(t)}</li>`).join('')

// Home: novità dai masi e prodotti di stagione ---------------------------------------------------

/** Una novità nella fila: foto piccola del maso, nome, la novità (al massimo tre righe) e fino a quando vale. */
export function voceNovita({ f, n }, c, href) {
  const fino = giorno(c.ora, giorniA(n.until, c.ora))
  const immagine = f.photos?.length
    ? `<img src="${esc(foto(f.photos[0], 240))}" alt="" width="120" height="120" loading="lazy" decoding="async">`
    : `<span class="no-photo">${icona('store')}</span>`
  return `<li class="news-item" data-fino="${esc(n.until)}">
        <a href="${esc(href)}">
          ${immagine}
          <span class="news-text"><strong>${esc(f.name)}</strong><span class="news-notice">${esc(n.text)}</span><small>${esc(c.T.finoA(dataEstesa(fino, c)))}</small></span>
        </a>
      </li>`
}

/** I prodotti di stagione come pillole con quanti masi li hanno; portano alla pagina del prodotto o alla ricerca. */
export const pillolaStagione = ({ kind, n }, c, href) =>
  `<a class="chip" href="${esc(href)}">${esc(nomeProdotto(kind, c))}<small>${n}</small></a>`

// Mercati, ordinati dal prossimo: fra quanti giorni c'è, e come lo si scrive.
export function traMercato(m, ora) {
  const d = (m.weekday - giorno(ora).wd + 7) % 7
  return d === 0 && ora.min >= m.closes_at ? 7 : d
}

export function quandoMercato(m, c) {
  const d = traMercato(m, c.ora)
  return d === 0
    ? `<span class="today">${esc(c.ora.min >= m.opens_at ? c.T.oggiFino(orario(m.closes_at)) : c.T.oggiDalle(orario(m.opens_at)))}</span>`
    : `${esc(d === 1 ? c.T.domani : maiuscola(c.T.giorni[m.weekday]))} · ${orario(m.opens_at)}–${orario(m.closes_at)}`
}

export const nomeMercato = (m, c) => (c.lang === 'de' ? m.name_de : m.name_it) || m.name_it

export const ordinaMercati = (markets, ora) => [...markets].sort((a, b) => traMercato(a, ora) - traMercato(b, ora))

export const mercato = (m, c, href = null) => `<li class="market" data-slug="${esc(m.slug)}">
      ${m.photo ? `<img src="${esc(foto(m.photo, 160))}" alt="" loading="lazy" width="64" height="64">` : ''}
      <div><h3>${href ? `<a href="${esc(href)}">${esc(nomeMercato(m, c))}</a>` : esc(nomeMercato(m, c))}</h3><p data-quando>${quandoMercato(m, c)}</p><p>${esc(m.place)}${m.farms.length ? ` · ${esc(c.T.masi(m.farms.length))}` : ''}</p></div>
    </li>`

// Pagina del maso ------------------------------------------------------------------------------

export const pillStato = (f, c) => {
  const s = stato(f, c.ora)
  return `<p class="pill-status${aperto(s) ? ' open' : ''}" id="stato"><span class="dot"></span>${esc(titolo(s, c))}</p>`
}

export const tagsMaso = (f, c) => [
  f.is_organic && `<li class="bio">${icona('leaf')}${esc(c.T.bio)}</li>`,
  f.has_farm_shop && `<li>${icona('store')}${esc(c.T.puntoVendita)}</li>`,
  f.has_vending_24h && `<li>${icona('box')}${esc(c.T.distributore)}</li>`,
  `<li>${icona('card')}${esc(f.payments?.includes('card') ? c.T.contantiCarta : c.T.soloContanti)}</li>`,
].filter(Boolean).join('')

export function boxNovita(f, c) {
  const n = novita(f, c.ora)
  if (!n) return ''
  const fino = giorno(c.ora, giorniA(n.until, c.ora))
  return `<div class="notice-box" id="novita">${icona('megaphone')}<div><p>${esc(n.text)}</p><small>${esc(c.T.novitaFino(dataEstesa(fino, c)))}</small></div></div>`
}

/** I prodotti, prima quelli che ci sono. */
// Prima quelli disponibili, poi i finiti; dentro, in ordine alfabetico.
export const prodottiOrdinati = (f, c) => [...f.products]
  .sort((a, b) => b.available - a.available || nomeProdotto(a.kind, c).localeCompare(nomeProdotto(b.kind, c), c.lang))

export function quandoPrezzi(f, c) {
  const date = f.products.map((p) => p.price_updated_at).filter(Boolean)
  if (!date.length) return ''
  return c.T.prezziIndicati(c.T.fa(Math.min(...date.map((d) => giorniDa(d, c.ora)))))
}

// Un prezzo lungo va a capo solo tra la cifra e la quantità: "6,50–7,90 €" / "/ 370 vasetti".
const prezzoACapo = (testo) => testo.split(' / ').map((parte, i) => `<span>${i ? '/ ' : ''}${esc(parte)}</span>`).join(' ')

/** "link" dà l'indirizzo della pagina di un prodotto, se c'è: il nome diventa un link. */
/**
 * "Cosa trovi": i prodotti con il prezzo, il tag solo per "Finito" o "Su richiesta". Con le richieste accese
 * ogni prodotto disponibile ha il "+" di "Tienimeli da parte" (nascosto finché il JavaScript non lo prepara) e sotto
 * c'è "Non trovi quello che cerchi? Chiedi al maso".
 */
export function bloccoProdotti(f, c, link = () => null, { richieste = false } = {}) {
  // Senza prodotti la sezione c'è lo stesso e lo dice, come gli orari: se no sembrerebbe che manchi un pezzo.
  if (!f.products.length) {
    return `<section class="block" aria-labelledby="t-prodotti" id="prodotti">
          <h2 id="t-prodotti">${esc(c.T.cosaTrovi)}</h2>
          <p class="sub">${esc(c.T.prodottiMancanti)}</p>
        </section>`
  }
  const sotto = quandoPrezzi(f, c)
  const lista = prodottiOrdinati(f, c).map((p) => {
    const nome = nomeProdotto(p.kind, c)
    const piu = richieste && p.available
      ? `<span class="qty" data-qty="${esc(p.kind)}" hidden><button class="qty-btn qty-plus" type="button" data-piu="${esc(p.kind)}" aria-label="${esc(c.T.piuDi(nome))}">${icona('plus')}</button></span>`
      : ''
    return `<li class="${p.available ? '' : 'out'}"${richieste && p.available ? ` data-kind="${esc(p.kind)}"` : ''}>
      <span class="name">${link(p.kind) ? `<a href="${esc(link(p.kind))}">${esc(nome)}</a>` : esc(nome)}${p.available && p.on_request ? ` <span class="tag-small">${esc(c.T.suRichiesta)}</span>` : ''}</span>
      <span class="price">${p.available ? prezzoACapo(prezzo(p, c)) : esc(c.T.finito)}</span>${piu}
    </li>`
  }).join('')
  return `<section class="block" aria-labelledby="t-prodotti" id="prodotti">
          <h2 id="t-prodotti">${esc(c.T.cosaTrovi)}</h2>
          ${sotto ? `<p class="sub" id="prezzi-quando">${esc(sotto)}</p>` : ''}
          ${lista ? `<ul class="product-list${richieste ? ' with-qty' : ''}">${lista}</ul>` : ''}
          ${richieste ? `<p class="ask-farm" id="chiedi-maso" hidden>${esc(c.T.nonTrovi)} <button class="link-btn" type="button" data-chiedi aria-haspopup="dialog">${esc(c.T.chiediAlMaso)}</button></p>` : ''}
        </section>`
}

// Il contenuto del blocco Orari: oggi evidenziato ed eccezioni dei prossimi tre settimane.
export function orariMaso(f, c) {
  const oggi = giorno(c.ora).wd
  const righe = [2, 3, 4, 5, 6, 7, 1].map((wd) => {
    const r = f.opening_hours?.[wd] ?? []
    return `<tr class="${wd === oggi ? 'today' : ''}"><th scope="row">${esc(maiuscola(c.T.giorni[wd]))}${wd === oggi ? `<span class="today-tag">${esc(c.T.oggiTag)}</span>` : ''}</th>
      <td class="${r.length ? '' : 'closed'}">${r.length ? r.map(([a, b]) => `<span class="fascia">${orario(a)}–${orario(b)}</span>`).join(', ') : esc(c.T.chiusoFasce)}</td></tr>`
  }).join('')
  const eccezioni = (f.hours_exceptions ?? [])
    .map((e) => ({ e, tra: giorniA(e.day, c.ora) }))
    .filter(({ tra }) => tra >= 0 && tra <= 21)
    .sort((a, b) => a.tra - b.tra)
    .map(({ e, tra }) => {
      const motivo = c.lang === 'de' ? e.reason_de || e.reason_it : e.reason_it
      const perche = motivo ? ` (${esc(motivo)})` : ''
      const r = e.ranges ?? []
      return `<li>${icona('calendar')}<span>${esc(maiuscola(dataEstesa(giorno(c.ora, tra), c)))}: ${esc(r.length ? fasceTesto(r, c) : c.T.chiusoEccezione)}${perche}</span></li>`
    }).join('')
  const settimana = Object.values(f.opening_hours ?? {}).some((r) => r?.length)
  return `
          <h2 id="t-orari">${esc(c.T.orari)}</h2>
          ${f.has_vending_24h ? `<p class="sub">${esc(c.T.distributoreSempre)}</p>` : ''}
          ${!f.has_vending_24h && !settimana && !eccezioni ? `<p class="sub">${esc(c.T.orariMancanti)}</p>` : ''}
          ${Object.keys(f.opening_hours ?? {}).length ? `<table class="hours">${righe}</table>` : ''}
          ${eccezioni ? `<ul class="exceptions">${eccezioni}</ul>` : ''}
        `
}

export function bloccoMercati(f, markets, c, link = () => null) {
  const righe = markets.filter((m) => m.farms.includes(f.slug)).map((m) => `<div class="market-row">
      ${m.photo ? `<img src="${esc(foto(m.photo, 120))}" alt="" width="52" height="52" loading="lazy">` : ''}
      <p><strong>${link(m.slug) ? `<a href="${esc(link(m.slug))}">${esc(nomeMercato(m, c))}</a>` : esc(nomeMercato(m, c))}</strong>${esc(maiuscola(c.T.giorni[m.weekday]))} · ${orario(m.opens_at)}–${orario(m.closes_at)} · ${esc(m.place)}</p>
    </div>`).join('')
  return righe ? `<section class="block" aria-labelledby="t-mercati"><h2 id="t-mercati">${esc(c.T.alMercato)}</h2>${righe}</section>` : ''
}

export function aggiornata(f, c) {
  const giorni = giorniDa(f.last_checked_at, c.ora)
  const vecchia = giorni > 60
  return `<span id="aggiornata"${vecchia ? ' class="stale"' : ''}>${icona(vecchia ? 'clock' : 'check')}${esc(vecchia ? c.T.vecchia : c.T.aggiornata(c.T.fa(giorni)))}</span>`
}

export const oggiMaso = (f, c) =>
  `<li id="oggi">${icona('clock')}<div><strong>${esc(c.T.oggi)}</strong>${esc(f.has_vending_24h ? c.T.sempreAperto : fasceTesto(fasce(f, giorno(c.ora)), c))}</div></li>`
