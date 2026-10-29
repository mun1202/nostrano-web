// Le schermate del pannello admin, come HTML. Solo in italiano: lo usa chi gestisce Il mio contadino.
import { esc } from './views.js?v=47e750b66f'
import { CATEGORY_CODES, MUNICIPALITY_CODES, UNIT_CODES, categoryName, municipalityName, priceText, unitName } from './i18n.js?v=47e750b66f'
import { WEEK, formatDay, toClock, todayRome, weekdayName } from './days.js?v=47e750b66f'
import { icon } from './icons.js?v=47e750b66f'

const ROOT = window.NOSTRANO_ROOT ?? '/'
const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1)

export const NAV = [
  ['', 'Panoramica', 'overview'],
  ['masi', 'Masi', 'list'],
  ['segnalazioni', 'Segnalazioni', 'flag'],
  ['suggeriti', 'Suggeriti', 'bulb'],
  ['prodotti', 'Prodotti', 'package'],
  ['accessi', 'Accessi', 'key'],
]

export function nav(a) {
  const counts = { segnalazioni: a.overview?.reports_open, suggeriti: a.overview?.suggestions_open, prodotti: a.overview?.custom_products }
  const current = a.route.name === 'maso' || a.route.name === 'nuovo' ? 'masi' : a.route.name
  return NAV.map(([name, label, symbol]) => `
    <a href="#/${name}" ${current === name ? 'aria-current="page"' : ''}>${icon(symbol)}<span>${label}</span>${counts[name] ? `<span class="count">${counts[name]}</span>` : ''}</a>`).join('')
}

// Date e piccoli pezzi ------------------------------------------------------------------------

export function dateText(instant, withTime = false) {
  if (!instant) return ''
  return new Intl.DateTimeFormat('it-IT', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Rome',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(new Date(instant))
}

export const daysSince = (instant) => Math.floor((Date.now() - new Date(instant).getTime()) / 86_400_000)

const MISSING = { products: 'prodotti', hours: 'orari', description: 'descrizione', consent: 'consenso' }
const missingText = (missing) => missing.map((m) => MISSING[m] ?? m).join(', ')

/** A che punto è un maso: da invitare, invitato, sta compilando, pronto, pubblicato. */
export function stage(f) {
  if (f.is_demo) return ['Demo', '']
  if (f.status === 'published') return ['Pubblicato', 'green']
  if (f.status === 'hidden') return ['Nascosto', '']
  if (f.ready_at) return ['Pronto da pubblicare', 'amber']
  if (f.linked) return ['Sta compilando', 'blue']
  if (f.invited_at) return ['Invitato', 'blue']
  return ['Da invitare', 'terracotta']
}

const pill = ([label, tone]) => `<span class="pill ${tone}">${esc(label)}</span>`

export const FILTERS = [
  ['all', 'Tutti', () => true],
  ['invite', 'Da invitare', (f) => f.status === 'draft' && !f.invited_at && !f.is_demo],
  ['waiting', 'Invitati', (f) => f.status === 'draft' && f.invited_at && !f.ready_at],
  ['ready', 'Pronti', (f) => f.status === 'draft' && f.ready_at],
  ['published', 'Pubblicati', (f) => f.status === 'published' && !f.is_demo],
  ['stale', 'Da ricontrollare', (f) => f.status === 'published' && !f.is_demo && daysSince(f.last_checked_at) > 60],
  ['hidden', 'Nascosti', (f) => f.status === 'hidden'],
  ['demo', 'Demo', (f) => f.is_demo],
]

function municipalityOptions() {
  return MUNICIPALITY_CODES.map((code) => `<option value="${esc(municipalityName('it', code))}"></option>`).join('')
}

function message(text) {
  return `<div class="message"><img src="${ROOT}assets/logo.svg" alt="" width="48" height="60"><h1>${text}</h1></div>`
}

export const loading = () => message('Caricamento…')

export function notAdmin() {
  return `
    <div class="message">
      <img src="${ROOT}assets/logo.svg" alt="" width="48" height="60">
      <h1>Questo browser non è abilitato</h1>
      <p class="muted">Apri il tuo link personale del pannello, quello che hai salvato nelle Note o nei preferiti: da lì questo browser resta abilitato.</p>
      <p class="muted small">Se non ce l'hai, crealo da un dispositivo già abilitato in «Accessi». Dal Mac c'è anche <code>npm run admin:link</code>.</p>
    </div>`
}

export const invalidLink = () => `
  <div class="message">
    <img src="${ROOT}assets/logo.svg" alt="" width="48" height="60">
    <h1>Link di accesso non valido</h1>
    <p class="muted">È già stato usato, è scaduto o è stato sostituito da un link personale nuovo. Usa il link personale più recente.</p>
  </div>`

// Panoramica ----------------------------------------------------------------------------------

const tile = (value, label, href, tone = '') => `
  <a class="tile ${tone}" href="${href}"><strong>${value}</strong><span>${label}</span></a>`

export function overview(a) {
  const o = a.overview
  // I conteggi dei masi vengono dall'elenco, come i filtri: le schede demo non contano.
  const farms = a.farms ?? []
  const count = (key) => farms.filter(FILTERS.find(([k]) => k === key)[2])
  const [ready, invite, waiting] = [count('ready'), count('invite'), count('waiting')]
  return `
    <div class="row">
      <h1>Panoramica</h1>
      <a class="button primary" href="#/nuovo">+ Nuovo maso</a>
    </div>
    <div class="tiles four">
      ${tile(count('published').length, 'Masi pubblicati', '#/masi?f=published', 'green')}
      ${tile(ready.length, 'Pronti da pubblicare', '#/masi?f=ready', ready.length ? 'amber' : '')}
      ${tile(invite.length, 'Da invitare', '#/masi?f=invite', invite.length ? 'terracotta' : '')}
      ${tile(waiting.length, 'Invitati, in attesa', '#/masi?f=waiting')}
      ${tile(count('stale').length, 'Da ricontrollare', '#/masi?f=stale')}
      ${tile(o.reports_open, 'Segnalazioni aperte', '#/segnalazioni', o.reports_open ? 'terracotta' : '')}
      ${tile(o.suggestions_open, 'Masi suggeriti', '#/suggeriti')}
      ${tile(o.custom_products, 'Prodotti nuovi dai masi', '#/prodotti')}
    </div>
    <p class="muted small">${o.requests_waiting} richieste «Tienimeli da parte» in attesa di risposta · ${o.phones} telefoni e browser · ${o.demo} schede demo</p>
    <h2>Da fare</h2>
    <div class="card list">
      ${ready.map((f) => todo(f, 'ha completato la scheda: controllala e pubblicala', 'Controlla')).join('')}
      ${invite.map((f) => todo(f, f.contact_phone ? 'è pronto per l\'invito su WhatsApp' : 'manca il numero WhatsApp per l\'invito', 'Invita')).join('')}
      ${waiting.filter((f) => daysSince(f.invited_at) >= 3).map((f) => todo(f, `invitato ${daysSince(f.invited_at)} giorni fa, manca: ${missingText(f.missing) || 'la richiesta di pubblicazione'}`, 'Apri')).join('')}
      ${!ready.length && !invite.length ? '<p class="muted">Niente di urgente. Aggiungi un maso nuovo o guarda i suggeriti.</p>' : ''}
    </div>`
}

const todo = (f, text, button) => `
  <div class="row">
    <span><strong>${esc(f.name)}</strong> <span class="muted">${esc(text)}</span></span>
    <a class="button secondary small" href="#/maso/${encodeURIComponent(f.slug)}">${button}</a>
  </div>`

// Elenco dei masi -----------------------------------------------------------------------------

export function farms(a) {
  const filter = FILTERS.find(([key]) => key === a.filter) ?? FILTERS[0]
  const query = a.search.trim().toLowerCase()
  const list = a.farms.filter(filter[2]).filter((f) => !query
    || `${f.name} ${municipalityName('it', f.municipality)} ${f.contact_name ?? ''}`.toLowerCase().includes(query))
  return `
    <div class="row">
      <h1>Masi</h1>
      <a class="button primary" href="#/nuovo">+ Nuovo maso</a>
    </div>
    <div class="filters">
      <input type="search" data-ref="search" value="${esc(a.search)}" placeholder="Cerca per nome, comune o contatto" aria-label="Cerca">
      <div class="chips">
        ${FILTERS.map(([key, label, test]) => `
          <a class="chip ${key === filter[0] ? 'on' : ''}" href="#/masi?f=${key}">${label} <small>${a.farms.filter(test).length}</small></a>`).join('')}
      </div>
    </div>
    <div class="farms">
      ${list.length ? list.map((f) => `
        <a class="farm-row card ${stage(f)[1] || 'plain'}" href="#/maso/${encodeURIComponent(f.slug)}">
          <span class="grow">
            <strong>${esc(f.name)}</strong>
            <small class="muted">${esc(municipalityName('it', f.municipality))}${f.contact_name ? ` · ${esc(f.contact_name)}` : ''}${f.contact_phone ? ` · ${esc(f.contact_phone)}` : ''}</small>
            ${f.status === 'draft' && f.missing.length ? `<small class="muted">Manca: ${esc(missingText(f.missing))}</small>` : ''}
            ${f.status === 'published' ? `<small class="muted">Ultimo controllo del maso: ${dateText(f.last_checked_at)}</small>` : ''}
          </span>
          <span class="side">
            ${pill(stage(f))}
            ${f.reports_open ? `<span class="pill terracotta">${f.reports_open} segnalazioni</span>` : ''}
            ${f.requests_waiting ? `<span class="pill">${f.requests_waiting} richieste</span>` : ''}
          </span>
        </a>`).join('') : '<p class="muted">Nessun maso qui.</p>'}
    </div>`
}

// Modulo della scheda -------------------------------------------------------------------------

const checked = (value) => (value ? 'checked' : '')

/** I campi della scheda: per il maso nuovo e per quello esistente. */
function farmFields(f, isNew) {
  const payments = new Set(f.payments ?? ['cash'])
  const coords = f.lat !== undefined && f.lat !== null ? `${f.lat}, ${f.lng}` : ''
  return `
    <fieldset class="plain grid">
      <legend>Il maso</legend>
      <label class="stack small wide">Nome del maso *
        <input name="name" required minlength="2" maxlength="80" value="${esc(f.name)}" placeholder="Per esempio: Maso Sonnenhof">
      </label>
      <label class="stack small">Comune *
        <input name="municipality" required list="municipalities" value="${esc(f.municipality ? municipalityName('it', f.municipality) : '')}" placeholder="Per esempio: Appiano">
      </label>
      <label class="stack small">Indirizzo *
        <input name="address" required maxlength="160" value="${esc(f.address)}" placeholder="Per esempio: Via Monte 12, Missiano">
      </label>
      <label class="stack small wide">Posizione * <span class="muted">— se sei al maso tocca «Sono al maso»; altrimenti su Google Maps tieni premuto sul maso e copia i numeri</span>
        <span class="row wrap">
          <input name="coordinates" required value="${esc(coords)}" placeholder="46.4983, 11.2611" class="grow-input">
          <button type="button" class="secondary small" data-action="here">📍 Sono al maso</button>
          ${coords ? `<a class="button secondary small" target="_blank" rel="noopener noreferrer" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coords.replace(' ', ''))}">Vedi sulla mappa</a>` : ''}
        </span>
      </label>
    </fieldset>
    <fieldset class="plain grid">
      <legend>Contatto per l'invito <span class="muted small">(privato, non compare nell'app)</span></legend>
      <label class="stack small">Nome
        <input name="contact_name" maxlength="80" value="${esc(f.contact_name)}" placeholder="Chi risponde su WhatsApp">
      </label>
      <label class="stack small">WhatsApp
        <input name="contact_phone" type="tel" maxlength="30" value="${esc(f.contact_phone)}" placeholder="+39 333 123 4567">
      </label>
      <label class="stack small">Lingua dei messaggi
        <select name="language">
          <option value="it" ${f.language !== 'de' ? 'selected' : ''}>Italiano</option>
          <option value="de" ${f.language === 'de' ? 'selected' : ''}>Tedesco</option>
        </select>
      </label>
      <label class="stack small wide">Note
        <textarea name="admin_notes" rows="2" maxlength="2000" placeholder="Per esempio: conosciuto al mercato, preferisce messaggi la sera">${esc(f.admin_notes)}</textarea>
      </label>
    </fieldset>
    <details class="custom" ${isNew ? '' : 'open'}>
      <summary>${isNew ? 'Altri dati (li può completare il maso)' : 'Altri dati della scheda'}</summary>
      <fieldset class="plain grid">
        <label class="stack small">Telefono pubblico
          <input name="phone" type="tel" maxlength="30" value="${esc(f.phone)}" placeholder="+39 0471 123456">
        </label>
        <label class="stack small">Sito
          <input name="website" type="url" maxlength="200" value="${esc(f.website)}" placeholder="https://">
        </label>
        <div class="wide checks">
          <label class="inline"><input type="checkbox" name="has_farm_shop" ${checked(f.has_farm_shop ?? true)}> Negozio al maso</label>
          <label class="inline"><input type="checkbox" name="has_vending_24h" ${checked(f.has_vending_24h)}> Distributore sempre aperto</label>
          <label class="inline"><input type="checkbox" name="is_organic" ${checked(f.is_organic)}> Biologico certificato</label>
          <label class="inline"><input type="checkbox" name="cash" ${checked(payments.has('cash'))}> Contanti</label>
          <label class="inline"><input type="checkbox" name="card" ${checked(payments.has('card'))}> Carta</label>
        </div>
        <label class="stack small wide">Descrizione in italiano
          <textarea name="description_it" rows="3" maxlength="1200">${esc(f.description_it)}</textarea>
        </label>
        <label class="stack small wide">Descrizione in tedesco <span class="muted">— se manca, l'app mostra quella italiana</span>
          <textarea name="description_de" rows="3" maxlength="1200">${esc(f.description_de)}</textarea>
        </label>
      </fieldset>
    </details>
    <datalist id="municipalities">${municipalityOptions()}</datalist>`
}

export function newFarm(a) {
  const s = a.fromSuggestion
  const draft = s ? { name: s.name, admin_notes: [s.place && `Zona: ${s.place}`, s.products && `Prodotti: ${s.products}`, s.contact && `Contatto dal suggerimento: ${s.contact}`].filter(Boolean).join('\n') } : {}
  return `
    <a class="back" href="#/masi">← Masi</a>
    <h1>Nuovo maso</h1>
    <p class="muted">La scheda nasce in bozza e non compare nell'app. Poi mandi il link su WhatsApp: il maso completa prodotti, prezzi e orari e ti chiede di pubblicarla.</p>
    ${s ? `<p class="pill amber">Dal suggerimento: ${esc(s.name)}${s.place ? ` · ${esc(s.place)}` : ''}</p>` : ''}
    <form data-form="new-farm" class="card stack">
      ${farmFields(draft, true)}
      <button type="submit" class="primary wide">Crea la bozza</button>
    </form>`
}

// Scheda di un maso ---------------------------------------------------------------------------

function inviteBox(a, f) {
  const invite = a.invite?.slug === f.slug ? a.invite : null
  const never = !f.invited_at
  return `
    <div class="card stack">
      <h2>Invito</h2>
      <p class="small">
        ${never ? 'Non ancora invitato.' : `Ultimo link mandato il ${dateText(f.invited_at, true)}.`}
        ${f.linked ? ' <span class="green">Il maso ha aperto il link.</span>' : f.invited_at ? ' Il maso non ha ancora aperto il link.' : ''}
      </p>
      <p class="small muted">${f.contact_name ? esc(f.contact_name) : 'Nessun contatto'}${f.contact_phone ? ` · ${esc(f.contact_phone)}` : ' · manca il numero WhatsApp'} · ${f.language === 'de' ? 'tedesco' : 'italiano'}</p>
      ${invite ? `
        <label class="stack small">Messaggio
          <textarea data-ref="invite-message" rows="9">${esc(invite.message)}</textarea>
        </label>
        <div class="actions">
          <a class="button primary" data-ref="wa-link" target="_blank" rel="noopener noreferrer" href="${esc(invite.whatsapp)}">Apri WhatsApp</a>
          <button class="secondary" data-action="copy" data-text="${esc(invite.link)}">Copia il link</button>
          <button class="secondary" data-action="copy-message">Copia il messaggio</button>
        </div>
        <p class="muted small">Il link si vede solo adesso: se chiudi la pagina ne crei uno nuovo.</p>` : `
        <button class="${never ? 'primary' : 'secondary'}" data-action="invite">${never ? 'Prepara l\'invito su WhatsApp' : 'Manda un link nuovo'}</button>
        ${never ? '' : '<p class="muted small">Il link di prima smette di funzionare e il maso deve aprire quello nuovo.</p>'}`}
    </div>`
}

function publishBox(f) {
  const consent = f.has_consent
  return `
    <div class="card stack">
      <h2>Pubblicazione</h2>
      <p class="small">${consent
        ? `<span class="green">✓ Consenso</span> del ${dateText(f.consent_at)}${f.consent_note ? ` — ${esc(f.consent_note)}` : ''}`
        : '<span class="terracotta">Manca il consenso a comparire su Il mio contadino.</span>'}</p>
      ${f.status === 'draft' ? `
        <p class="small">${f.missing.length ? `Manca ancora: <strong>${esc(missingText(f.missing))}</strong>.` : '<span class="green">La scheda è completa.</span>'}
          ${f.ready_at ? ` Il maso ha chiesto la pubblicazione il ${dateText(f.ready_at, true)}.` : ''}</p>` : ''}
      ${consent ? '' : `
        <form data-form="consent" class="row add">
          <input name="note" required maxlength="300" placeholder="Come l'hai avuto: telefonata del 27/10, visita…">
          <button type="submit" class="secondary">Segna il consenso</button>
        </form>`}
      <div class="actions">
        ${f.status !== 'published' ? `<button class="primary" data-action="status" data-status="published" ${consent ? '' : 'disabled'}>Pubblica nell'app</button>` : ''}
        ${f.status === 'published' ? '<button class="secondary" data-action="status" data-status="hidden">Nascondi</button>' : ''}
        ${f.status === 'hidden' ? '<button class="secondary" data-action="status" data-status="draft">Rimetti in bozza</button>' : ''}
        ${f.status !== 'published' && !f.is_demo ? '<button class="link danger" data-action="delete-farm">Elimina la scheda</button>' : ''}
      </div>
    </div>`
}

/** Le foto di prova sono codici Unsplash; quelle caricate sono indirizzi completi. */
export const photoUrl = (photo, width = 400) =>
  photo.startsWith('https://') ? photo : `https://images.unsplash.com/photo-${photo}?w=${width}&q=70`

function photosBox(a, f) {
  return `
    <div class="card stack">
      <h2>Foto</h2>
      ${f.photos.length ? `
        <div class="photos">
          ${f.photos.map((photo, i) => `
            <figure>
              <img src="${esc(photoUrl(photo))}" alt="">
              <figcaption>
                ${i === 0 ? '<small class="pill green">Copertina</small>' : `<button class="link small" data-action="photo-first" data-index="${i}">Copertina</button>`}
                <button class="icon" data-action="photo-remove" data-index="${i}" aria-label="Togli la foto ${i + 1}">✕</button>
              </figcaption>
            </figure>`).join('')}
        </div>` : '<p class="muted small">Nessuna foto: l\'app mostra un segnaposto verde.</p>'}
      <label class="button secondary upload">
        ${a.uploading ? 'Caricamento…' : '+ Aggiungi foto'}
        <input type="file" accept="image/*" multiple data-ref="photos" ${a.uploading ? 'disabled' : ''} hidden>
      </label>
      <p class="muted small">Si rimpiccioliscono da sole prima del caricamento. Al massimo 10.</p>
    </div>`
}

function productsBox(a, f) {
  return `
    <div class="card">
      <h2>Prodotti <small class="muted">${f.products.length}</small></h2>
      ${f.products.length ? `<div class="list">${f.products.map((p) => {
        const entry = a.catalog.find((k) => k.kind === p.kind)
        return `
        <div class="row small">
          <span><strong>${esc(entry?.name_it ?? p.kind)}</strong>${entry && !entry.shared ? ' <span class="pill amber">nuovo</span>' : ''}${p.detail ? ` <span class="muted">· ${esc(p.detail)}</span>` : ''}</span>
          <span class="${p.available ? 'green' : 'muted'}">${esc(priceText('it', p) || '—')}${p.available ? '' : ' · finito'}</span>
        </div>`
      }).join('')}</div>` : '<p class="muted small">Nessun prodotto: li inserisce il maso dal suo link.</p>'}
    </div>`
}

function hoursBox(f) {
  const today = todayRome()
  const closures = f.hours_exceptions.filter((e) => e.day >= today)
  return `
    <div class="card">
      <h2>Orari</h2>
      ${f.has_vending_24h ? '<p class="small green">Distributore sempre aperto</p>' : ''}
      ${f.has_farm_shop ? `<div class="list">${WEEK.map((day) => {
        const ranges = f.opening_hours[String(day)] ?? []
        return `<div class="row small"><span>${esc(capitalize(weekdayName(day, 'it')))}</span><span class="${ranges.length ? '' : 'muted'}">${ranges.length ? ranges.map((r) => `${toClock(r[0])}–${toClock(r[1])}`).join(', ') : 'chiuso'}</span></div>`
      }).join('')}</div>` : '<p class="muted small">Nessun negozio al maso.</p>'}
      ${closures.length ? `<p class="small terracotta">${closures.map((e) => `${esc(formatDay(e.day, 'it'))}: ${esc(e.reason_it)}`).join('<br>')}</p>` : ''}
      ${f.notice_text && f.notice_until >= today ? `<p class="small"><strong>Novità</strong> fino al ${esc(formatDay(f.notice_until, 'it'))}: ${esc(f.notice_text)}</p>` : ''}
    </div>`
}

const CHANGE_NAMES = {
  opening_hours: 'orari', hours_exceptions: 'chiusure', notice_text: 'novità', notice_until: 'novità', products: 'prodotti',
  accepts_requests: 'richieste', max_requests_per_day: 'richieste', payments: 'pagamenti', has_farm_shop: 'negozio',
  has_vending_24h: 'distributore', description_it: 'descrizione', description_de: 'descrizione',
}
const WHO = { producer_link: 'Il maso', admin: 'Admin', demo_reset: 'Ripristino demo' }

function changeSummary(entry) {
  const { before, after } = entry.changes ?? {}
  if (!before || !after) return 'scheda ripristinata'
  const keys = Object.keys(after).filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]))
  const names = [...new Set(keys.map((key) => CHANGE_NAMES[key] ?? key))]
  if (names.length) return `ha cambiato ${names.join(', ')}`
  // Il registro tiene solo le parti che cambia il maso: nome, indirizzo e contatto li cambia l'admin.
  return entry.changed_by === 'admin' ? 'ha aggiornato i dati della scheda' : 'ha confermato che è tutto giusto'
}

// Le prime sei si vedono subito; le altre restano chiuse, per non allungare la colonna.
function historyBox(f) {
  const row = (h) => `
    <div class="small"><strong>${esc(WHO[h.changed_by] ?? h.changed_by)}</strong> ${esc(changeSummary(h))}<br>
      <span class="muted">${dateText(h.created_at, true)}</span></div>`
  const [first, rest] = [f.history.slice(0, 6), f.history.slice(6)]
  return `
    <div class="card">
      <h2>Modifiche recenti</h2>
      ${f.history.length ? `<div class="list">${first.map(row).join('')}</div>` : '<p class="muted small">Ancora nessuna modifica.</p>'}
      ${rest.length ? `
        <details class="more">
          <summary>Le altre ${rest.length}</summary>
          <div class="list">${rest.map(row).join('')}</div>
        </details>` : ''}
    </div>`
}

function reportsBox(f) {
  if (!f.reports.length) return ''
  return `
    <div class="card">
      <h2>Segnalazioni</h2>
      <div class="list">${f.reports.map((r) => reportRow(r, false)).join('')}</div>
    </div>`
}

export function farm(a) {
  const f = a.farm
  return `
    <a class="back" href="#/masi">← Masi</a>
    <div class="page-head row wrap">
      <div>
        <h1>${esc(f.name)}</h1>
        <p class="muted">${esc(municipalityName('it', f.municipality))} · ${esc(f.address)}</p>
      </div>
      <div class="side">${pill(stage(f))}${f.is_organic ? '<span class="pill green">Bio</span>' : ''}</div>
    </div>
    <div class="columns">
      <div>
        ${inviteBox(a, f)}
        ${publishBox(f)}
        <form data-form="farm" class="card stack">
          <h2>Dati della scheda</h2>
          ${farmFields(f, false)}
          <button type="submit" class="primary wide">Salva i dati</button>
          <p class="muted small">Prodotti, prezzi, orari e novità li aggiorna il maso dal suo link.</p>
        </form>
        ${photosBox(a, f)}
      </div>
      <div>
        ${productsBox(a, f)}
        ${hoursBox(f)}
        ${reportsBox(f)}
        ${historyBox(f)}
      </div>
    </div>`
}

// Segnalazioni e suggeriti --------------------------------------------------------------------

function reportRow(r, withFarm = true) {
  return `
    <div class="stack ${r.status === 'open' ? '' : 'faded'}">
      <div class="row">
        <span class="small">${withFarm && r.farm ? `<a href="#/maso/${encodeURIComponent(r.farm)}"><strong>${esc(r.farm_name)}</strong></a> · ` : withFarm ? '<strong>Senza maso</strong> · ' : ''}<span class="muted">${dateText(r.created_at, true)}</span></span>
        <button class="secondary small" data-action="report" data-id="${r.id}" data-status="${r.status === 'open' ? 'handled' : 'open'}">${r.status === 'open' ? '✓ Gestita' : 'Riapri'}</button>
      </div>
      <p>${esc(r.message)}</p>
      ${r.contact ? `<p class="small muted">Contatto: ${esc(r.contact)}</p>` : ''}
    </div>`
}

export function reports(a) {
  return `
    <h1>Segnalazioni</h1>
    <p class="muted">Quello che le persone scrivono da «Segnala un problema» nella scheda di un maso.</p>
    <div class="card list">${a.reports.length ? a.reports.map((r) => reportRow(r)).join('') : '<p class="muted">Nessuna segnalazione.</p>'}</div>`
}

const SUGGESTION_STATUS = [['open', 'Da guardare'], ['contacted', 'Contattato'], ['published', 'Pubblicato'], ['declined', 'Non adatto']]

export function suggestions(a) {
  return `
    <h1>Masi suggeriti</h1>
    <p class="muted">Arrivano da «Conosci un maso?» nell'app. Da qui crei la bozza con un tocco.</p>
    <div class="card list">${a.suggestions.length ? a.suggestions.map((s) => `
      <div class="stack ${s.status === 'open' ? '' : 'faded'}">
        <div class="row wrap">
          <span><strong>${esc(s.name)}</strong>${s.place ? ` · ${esc(s.place)}` : ''} <span class="muted small">${dateText(s.created_at)}</span></span>
          <span class="actions tight">
            <select data-action="suggestion" data-id="${s.id}" aria-label="Stato di ${esc(s.name)}">
              ${SUGGESTION_STATUS.map(([value, label]) => `<option value="${value}" ${value === s.status ? 'selected' : ''}>${label}</option>`).join('')}
            </select>
            <a class="button secondary small" href="#/nuovo?s=${s.id}">Crea la bozza</a>
          </span>
        </div>
        ${s.products ? `<p class="small">${esc(s.products)}</p>` : ''}
        ${s.contact ? `<p class="small muted">Contatto: ${esc(s.contact)}</p>` : ''}
      </div>`).join('') : '<p class="muted">Nessun suggerimento.</p>'}</div>`
}

// Prodotti e catalogo -------------------------------------------------------------------------

const categoryOptions = (selected) =>
  CATEGORY_CODES.map((c) => `<option value="${c}" ${c === selected ? 'selected' : ''}>${esc(categoryName('it', c))}</option>`).join('')
const unitOptions = (selected) =>
  UNIT_CODES.map((u) => `<option value="${u}" ${u === selected ? 'selected' : ''}>${esc(unitName('it', u))}</option>`).join('')

export function products(a) {
  const shared = a.catalog.filter((k) => k.shared)
  const groups = CATEGORY_CODES.filter((c) => shared.some((k) => k.category === c))
  return `
    <h1>Prodotti</h1>
    <h2>Aggiunti dai masi <small class="muted">${a.custom.length}</small></h2>
    <p class="muted small">Il maso li usa subito sulla sua scheda. Mettili nel catalogo comune (così li trovano anche gli altri e si possono cercare nell'app) o uniscili a un prodotto che c'è già.</p>
    <div class="card list">${a.custom.length ? a.custom.map((c) => `
      <div class="stack">
        <div class="small"><strong>${esc(c.name)}</strong> · <a href="#/maso/${encodeURIComponent(c.farm)}">${esc(c.farm_name)}</a> <span class="muted">· ${dateText(c.created_at)}</span></div>
        <form data-form="approve" data-kind="${esc(c.kind)}" class="inline-form">
          <input name="name_it" required value="${esc(c.name)}" aria-label="Nome in italiano">
          <input name="name_de" placeholder="Nome in tedesco" aria-label="Nome in tedesco">
          <select name="category" aria-label="Categoria">${categoryOptions(c.category)}</select>
          <select name="unit" aria-label="Unità">${unitOptions(c.default_unit)}</select>
          <button type="submit" class="primary small">Nel catalogo</button>
        </form>
        <form data-form="merge" data-kind="${esc(c.kind)}" class="inline-form">
          <select name="into" required aria-label="Unisci a">
            <option value="">Oppure è lo stesso di…</option>
            ${shared.map((k) => `<option value="${esc(k.kind)}">${esc(k.name_it)}</option>`).join('')}
          </select>
          <button type="submit" class="secondary small">Unisci</button>
        </form>
      </div>`).join('') : '<p class="muted">Nessun prodotto nuovo da controllare.</p>'}</div>

    <h2>Catalogo comune <small class="muted">${shared.length}</small></h2>
    <form data-form="catalog-add" class="card inline-form">
      <input name="name_it" required minlength="2" placeholder="Nome in italiano" aria-label="Nome in italiano">
      <input name="name_de" placeholder="Nome in tedesco" aria-label="Nome in tedesco">
      <select name="category" aria-label="Categoria">${categoryOptions('verdura')}</select>
      <select name="unit" aria-label="Unità">${unitOptions('kg')}</select>
      <button type="submit" class="primary small">Aggiungi</button>
    </form>
    <div class="catalog">
      ${groups.map((g) => `
        <div class="card">
          <h3>${esc(categoryName('it', g))}</h3>
          ${shared.filter((k) => k.category === g).map((k) => `
            <div class="row small"><span>${esc(k.name_it)}${k.name_de !== k.name_it ? ` <span class="muted">· ${esc(k.name_de)}</span>` : ''}</span><span class="muted">${esc(unitName('it', k.default_unit))}</span></div>`).join('')}
        </div>`).join('')}
    </div>`
}

// Accessi -------------------------------------------------------------------------------------

export function devices(a) {
  return `
    <h1>Accessi</h1>
    <p class="muted">I browser che possono usare questo pannello. Niente password: ognuno è entrato con il link personale o con un link valido una volta sola.</p>
    <div class="card list">${a.devices.map((d) => `
      <div class="row">
        <span><strong>${esc(d.label || 'Senza nome')}</strong>${d.me ? ' <span class="pill green">questo browser</span>' : ''}<br><small class="muted">dal ${dateText(d.created_at)}</small></span>
        <button class="link danger small" data-action="device-remove" data-id="${esc(d.user_id)}" data-me="${d.me}">Togli</button>
      </div>`).join('')}</div>
    <h2>Link personale</h2>
    <div class="card stack">
      <p class="small">Un link solo tuo che apre il pannello su qualsiasi dispositivo, tutte le volte che serve. Salvalo nelle Note o nei preferiti e non mandarlo a nessuno: chi lo ha entra nel pannello.</p>
      ${a.personalLink ? `
        <pre class="code">${esc(a.personalLink)}</pre>
        <button class="primary" data-action="copy" data-text="${esc(a.personalLink)}">Copia il link personale</button>
        <p class="muted small">Si vede solo adesso. Se lo perdi ne crei uno nuovo da qui.</p>` : `
        <button class="secondary" data-action="personal-link">Crea un link personale nuovo</button>
        <p class="muted small">Quello di prima smette di funzionare; i dispositivi qui sopra restano abilitati.</p>`}
    </div>
    <h2>Aggiungi un dispositivo, una volta sola</h2>
    <form data-form="device" class="card row add">
      <input name="label" required maxlength="60" placeholder="Per esempio: iPhone di Anna">
      <button type="submit" class="secondary">Crea il link</button>
    </form>
    ${a.newCode ? `
      <div class="card stack soft-green">
        <p><strong>Link per ${esc(a.newCode.label)}</strong> — aprilo su quel dispositivo entro 24 ore. Funziona una volta sola.</p>
        <pre class="code">${esc(a.newCode.link)}</pre>
        <button class="secondary" data-action="copy" data-text="${esc(a.newCode.link)}">Copia il link</button>
      </div>` : ''}`
}
