// Le parti della pagina, come HTML. Ogni testo che arriva dal database o dai clienti passa da esc().
import { CATEGORY_CODES, UNIT_CODES, categoryName, formatAmount, municipalityName, priceText, t, unitName } from './i18n.js?v=d942f497f0'
import { WEEK, addDays, dayRanges, formatDay, formatInstant, minuteNowRome, openDays, toClock, todayRome, weekday, weekdayName } from './days.js?v=d942f497f0'

export const esc = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1)

export function productName(s, kind) {
  const entry = s.catalog.find((k) => k.kind === kind)
  return entry ? (s.lang === 'de' ? entry.name_de : entry.name_it) : kind
}

const quantityText = (value) => {
  const rounded = Math.round(Number(value) * 100) / 100
  return Number.isInteger(rounded) ? String(rounded) : String(rounded).replace('.', ',')
}

/** "12 uova", "2 kg mele": una riga della richiesta, con la quantità e l'unità copiate all'invio. */
function lineText(s, line) {
  const name = s.lang === 'de' ? line.name_de : line.name_it
  const shown = s.lang === 'it' ? name.toLowerCase() : name
  if (line.quantity === null || line.quantity === undefined) return shown
  const quantity = Number(line.quantity)
  return line.unit === 'pezzo'
    ? `${quantityText(quantity)} ${shown}`
    : `${quantityText(quantity)} ${unitName(s.lang, line.unit, quantity !== 1)} ${shown}`
}

function linesHtml(s, request) {
  if (!request.lines?.length) return ''
  return `<ul class="lines">${request.lines.map((l) => `<li>${esc(capitalize(lineText(s, l)))}</li>`).join('')}</ul>`
}

const linesSummary = (s, request) => capitalize(request.lines?.map((l) => lineText(s, l)).join(' · ') || request.note || '')

const pickupDay = (request) => (request.status === 'other_day' ? request.other_day : request.day)

/** Confermata e il giorno del ritiro è oggi o passato: il maso segna se il cliente è venuto. */
export const isToCollect = (request) =>
  ['accepted', 'other_day'].includes(request.status) && pickupDay(request) <= todayRome()

export function isWaiting(request) {
  return request.status === 'waiting' && request.day >= todayRome()
}

const confirmedToday = (farm) =>
  new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Rome' }).format(new Date(farm.last_checked_at)) === todayRome()

/**
 * La striscia in cima quando l'admin modifica la scheda di un maso ("Modifica come il maso"): si vede che non è il
 * maso a scrivere, e si torna alla sua scheda nel pannello. I prodotti nuovi per il catalogo si aggiungono da lì.
 */
export function adminBar(s, slug) {
  return `
    <div class="admin-bar">
      <span><strong>Modifica come admin</strong> · ${esc(s.farm.name)}. Le modifiche restano nella cronologia come "Admin".</span>
      <a class="button secondary small" href="${esc(window.NOSTRANO_ROOT ?? '/')}admin/#/maso/${encodeURIComponent(slug)}">Torna al pannello</a>
    </div>`
}

// Testata e conferma -------------------------------------------------------------------------

// I titoli delle pagine del menu, oltre alla panoramica.
const PAGE_TITLES = { richieste: 'requests', prodotti: 'products', orari: 'hoursPage', novita: 'notice', maso: 'farm' }

export function header(s) {
  const { farm } = s
  const status = farm.status === 'hidden' ? 'hiddenFarm' : farm.status === 'draft' ? (farm.ready_at ? 'inReview' : 'draft') : 'published'
  const title = PAGE_TITLES[s.route]
  return `
    ${s.appLink ? `
      <div class="card banner row">
        <span>${t(s.lang, 'appBanner')}</span>
        <a class="button secondary small" href="${esc(s.appLink)}">${t(s.lang, 'appBannerButton')}</a>
      </div>` : ''}
    <div class="page-title">
      <div>
        <p class="eyebrow">${title ? esc(farm.name) : `${esc(municipalityName(s.lang, farm.municipality))} · ${esc(farm.address)}`}</p>
        <h1>${title ? t(s.lang, title) : esc(farm.name)}</h1>
      </div>
      <span class="badge ${status === 'published' ? 'ok' : 'warn'}">${t(s.lang, status)}</span>
    </div>`
}

/** Per la scheda in bozza: cosa manca, il consenso e l'invio per la pubblicazione. */
export function onboarding(s) {
  const { farm } = s
  if (farm.status !== 'draft' || farm.ready_at) return ''
  const missing = new Set(farm.missing)
  const steps = [
    ['products', 'stepProducts', '/prodotti'],
    ...(farm.has_farm_shop ? [['hours', 'stepHours', '/orari']] : []),
    ['description', 'stepDescription', '/maso'],
    ['consent', 'stepConsent', '/'],
  ]
  return `
    <div class="card">
      <h2>${t(s.lang, 'welcome')}</h2>
      <p>${t(s.lang, 'welcomeText')}</p>
      <ol class="checklist">
        ${steps.map(([key, label, anchor]) => `
          <li class="${missing.has(key) ? '' : 'done'}"><a href="#${anchor}">${t(s.lang, label)}</a></li>`).join('')}
      </ol>
      ${missing.has('consent') ? `
        <div class="consent">
          <p class="small">${t(s.lang, 'consentText')}</p>
          <button class="secondary" data-action="consent">${t(s.lang, 'giveConsent')}</button>
        </div>` : ''}
      <button class="primary wide" data-action="request-publish" ${missing.size ? 'disabled' : ''}>${t(s.lang, 'requestPublish')}</button>
      ${missing.size ? `<p class="muted small">${t(s.lang, 'requestPublishMissing')}</p>` : ''}
    </div>`
}

/** Descrizione, pagamenti, negozio e distributore. */
export function farm(s) {
  const { farm: f } = s
  const own = s.lang === 'de' ? f.description_own_de : f.description_own_it
  const payments = new Set(f.payments)
  const toggle = (name, title, text, checked) => `
    <label class="row">
      <span><strong>${t(s.lang, title)}</strong><br><small class="muted">${t(s.lang, text)}</small></span>
      <input type="checkbox" class="switch" name="${name}" ${checked ? 'checked' : ''} aria-label="${esc(t(s.lang, title))}">
    </label>`
  return `
    <h2>${t(s.lang, 'farm')}</h2>
    <form data-form="farm" class="card stack">
      <label class="stack"><strong>${t(s.lang, 'description')}</strong>
        <small class="muted">${t(s.lang, 'descriptionHelp')}</small>
        <textarea name="description" rows="4" maxlength="1200" placeholder="${esc(t(s.lang, 'descriptionPlaceholder'))}">${esc(own)}</textarea>
      </label>
      <small class="muted">${t(s.lang, 'descriptionLang')}</small>
      <fieldset class="plain">
        <legend><strong>${t(s.lang, 'payments')}</strong></legend>
        <label class="inline"><input type="checkbox" name="cash" ${payments.has('cash') ? 'checked' : ''}> ${t(s.lang, 'cash')}</label>
        <label class="inline"><input type="checkbox" name="card" ${payments.has('card') ? 'checked' : ''}> ${t(s.lang, 'card')}</label>
      </fieldset>
      ${toggle('shop', 'shop', 'shopText', f.has_farm_shop)}
      ${toggle('vending', 'vending', 'vendingText', f.has_vending_24h)}
      <button type="submit" class="primary wide">${t(s.lang, 'saveFarm')}</button>
    </form>`
}

export function confirm(s) {
  if (s.farm.status !== 'published') return ''
  const done = confirmedToday(s.farm)
  return `
    <div class="card">
      <h2>${t(s.lang, 'allGood')}</h2>
      <p>${t(s.lang, 'allGoodText')}</p>
      <p class="muted small">${t(s.lang, 'lastChecked', formatInstant(s.farm.last_checked_at, s.lang))}</p>
      <button class="primary wide" data-action="confirm" ${done ? 'disabled' : ''}>
        ${t(s.lang, done ? 'confirmedToday' : 'confirm')}
      </button>
    </div>`
}

// Richieste ----------------------------------------------------------------------------------

function statusText(s, request) {
  if (request.status === 'waiting' || request.status === 'expired') return t(s.lang, 'status_expired')
  if (request.status === 'other_day') return t(s.lang, 'status_other_day', formatDay(request.other_day, s.lang))
  return t(s.lang, `status_${request.status}`)
}

function proposalForm(s, request) {
  const days = openDays(s.farm).filter((d) => d !== request.day)
  return `
    <form data-form="proposal" data-id="${esc(request.id)}" class="stack">
      <label class="stack">${t(s.lang, 'whichDay')}
        <select name="day" required>${days.map((d) => `<option value="${d}">${esc(capitalize(formatDay(d, s.lang)))}</option>`).join('')}</select>
      </label>
      <input name="reply" maxlength="140" placeholder="${esc(t(s.lang, 'replyPlaceholder'))}">
      <div class="actions">
        <button type="submit" class="primary">${t(s.lang, 'sendProposal')}</button>
        <button type="button" class="secondary" data-action="cancel-proposal">${t(s.lang, 'cancel')}</button>
      </div>
    </form>`
}

function requestCard(s, request) {
  return `
    <article class="card request">
      <div class="row">
        <div><strong>${esc(request.name)}</strong><br><span class="muted small">${esc(capitalize(formatDay(request.day, s.lang)))}</span></div>
        <button class="link danger small" data-action="block" data-id="${esc(request.id)}">${t(s.lang, 'block')}</button>
      </div>
      ${linesHtml(s, request)}
      ${request.note ? `<p class="muted"><em>“${esc(request.note)}”</em></p>` : ''}
      ${s.proposing === request.id ? proposalForm(s, request) : `
        <div class="actions three">
          <button class="primary yes" data-action="answer" data-status="accepted" data-id="${esc(request.id)}">${t(s.lang, 'keep')}</button>
          <button class="secondary" data-action="answer" data-status="declined" data-id="${esc(request.id)}">${t(s.lang, 'dontHave')}</button>
          <button class="secondary" data-action="propose" data-id="${esc(request.id)}">${t(s.lang, 'otherDay')}</button>
        </div>`}
    </article>`
}

function collectCard(s, request) {
  return `
    <article class="card collect">
      <strong>${esc(request.name)} · ${esc(formatDay(pickupDay(request), s.lang))}</strong>
      ${linesHtml(s, request)}
      ${request.note ? `<p class="muted"><em>“${esc(request.note)}”</em></p>` : ''}
      <div class="actions">
        <button class="primary yes" data-action="answer" data-status="picked_up" data-id="${esc(request.id)}">${t(s.lang, 'pickedUp')}</button>
        <button class="secondary" data-action="answer" data-status="no_show" data-id="${esc(request.id)}">${t(s.lang, 'noShow')}</button>
      </div>
    </article>`
}

/**
 * Il calendario delle richieste: un mese intero (lunedì-domenica) con quante richieste ci sono in ogni giorno (in
 * attesa o confermate per quel giorno). Il pallino ambra dice che qualcuna aspetta ancora una risposta; i giorni chiusi
 * e quelli passati sono più chiari. Toccando un giorno l'elenco mostra solo quello; di nuovo, tutti. Le frecce
 * cambiano mese.
 */
const OPEN = ['waiting', 'accepted', 'other_day']
const monthOf = (day) => day.slice(0, 7)

export function calendar(s) {
  if (!s.farm.has_farm_shop) return ''
  const today = todayRome()
  const month = s.month ?? monthOf(today)
  const first = `${month}-01`
  const lead = (weekday(first) + 5) % 7 // quanti giorni del mese prima stanno nella prima settimana (lunedì = 0)
  const days = []
  for (let d = first; monthOf(d) === month; d = addDays(d, 1)) days.push(d)
  const locale = s.lang === 'de' ? 'de-DE' : 'it-IT'
  const fmt = (day, options) => new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' }).format(new Date(`${day}T12:00:00Z`))
  const open = (r) => OPEN.includes(r.status) && !(r.status === 'waiting' && r.day < today)
  const onDay = (day) => s.requests.filter((r) => open(r) && pickupDay(r) === day)
  const heads = WEEK.map((wd) => `<span>${esc(weekdayName(wd, s.lang).slice(0, 3))}</span>`).join('')
  const cells = days.map((day) => {
    const list = onDay(day)
    const waiting = list.some((r) => r.status === 'waiting')
    const closed = dayRanges(s.farm, day).length === 0
    const classes = ['cal-cell', list.length && 'has', waiting && 'waiting', closed && 'closed', day < today && 'past', day === today && 'today'].filter(Boolean).join(' ')
    return `<button type="button" class="${classes}" data-action="day" data-day="${day}" aria-pressed="${s.day === day}"
      aria-label="${esc(capitalize(formatDay(day, s.lang)))}: ${list.length}">
      <span class="cal-n">${Number(day.slice(8))}</span>${list.length ? `<span class="cal-count">${list.length}</span>` : ''}
    </button>`
  }).join('')
  const total = s.requests.filter((r) => open(r) && monthOf(pickupDay(r)) === month).length
  const selected = s.day ? onDay(s.day) : []
  return `
    <div class="card month" role="group" aria-label="${esc(t(s.lang, 'calendar'))}">
      <div class="month-head">
        <button type="button" class="icon" data-action="month" data-delta="-1" aria-label="${esc(t(s.lang, 'prevMonth'))}">‹</button>
        <strong>${esc(capitalize(fmt(first, { month: 'long', year: 'numeric' })))}</strong>
        <button type="button" class="icon" data-action="month" data-delta="1" aria-label="${esc(t(s.lang, 'nextMonth'))}">›</button>
      </div>
      <div class="month-grid">
        ${heads}
        ${'<span></span>'.repeat(lead)}${cells}
      </div>
      <p class="muted small month-foot">${s.day
        ? `${esc(capitalize(formatDay(s.day, s.lang)))} · ${t(s.lang, 'requestsCount', selected.length)} · <button class="link small" data-action="day" data-day="${s.day}">${t(s.lang, 'allDays')}</button>`
        : t(s.lang, 'monthTotal', total)}</p>
      <p class="legend small"><span class="dot-waiting"></span>${t(s.lang, 'legendWaiting')} <span class="dot-closed"></span>${t(s.lang, 'legendClosed')}</p>
    </div>`
}

/** Accetto richieste, quante al giorno e le notifiche del browser. */
export function requestSettings(s) {
  const { farm } = s
  if (!farm.has_farm_shop) return ''
  return `
    <div class="card">
      <label class="row">
        <span><strong>${t(s.lang, 'acceptRequests')}</strong><br><small class="muted">${t(s.lang, 'acceptRequestsText')}</small></span>
        <input type="checkbox" class="switch" data-action="accepts" ${farm.accepts_requests ? 'checked' : ''}>
      </label>
      ${farm.accepts_requests ? `
        <div class="row">
          <span>${t(s.lang, 'maxPerDay')}</span>
          <span class="stepper">
            <button data-action="max" data-delta="-1" aria-label="−">−</button>
            <output>${farm.max_requests_per_day}</output>
            <button data-action="max" data-delta="1" aria-label="+">+</button>
          </span>
        </div>` : ''}
    </div>
    ${notifyCard(s)}`
}

export function requests(s) {
  const { farm } = s
  if (!farm.has_farm_shop) return ''
  const onDay = (r) => !s.day || pickupDay(r) === s.day
  const waiting = s.requests.filter(isWaiting).filter(onDay)
  const collecting = s.requests.filter(isToCollect).filter(onDay)
  const answered = s.requests.filter((r) => !isWaiting(r) && !isToCollect(r)).filter(onDay)
  return `
    <h2>${t(s.lang, 'requests')}</h2>
    ${s.day ? `<p class="day-filter">${esc(capitalize(formatDay(s.day, s.lang)))} <button class="link small" data-action="day" data-day="${s.day}">${t(s.lang, 'allDays')}</button></p>` : ''}
    <h3>${t(s.lang, 'requestsWaiting')}</h3>
    ${waiting.length ? waiting.map((r) => requestCard(s, r)).join('') : `<p class="muted">${t(s.lang, 'requestsNone')}</p>`}
    <p class="muted small">${t(s.lang, 'answerWithin')}</p>
    ${collecting.length ? `<h3>${t(s.lang, 'toCollect')}</h3>${collecting.map((r) => collectCard(s, r)).join('')}` : ''}
    ${answered.length ? `
      <h3>${t(s.lang, 'answered')}</h3>
      <div class="card list">
        ${answered.map((r) => `
          <div class="answered">
            <strong>${esc(r.name)} · ${esc(formatDay(r.day, s.lang))}</strong>
            <small class="muted">${esc(linesSummary(s, r))}</small>
            <span class="pill">${esc(statusText(s, r))}</span>
          </div>`).join('')}
      </div>` : ''}`
}

/** Notifiche del browser per le richieste nuove; s.push dice come stanno (vedi notify.js). */
function notifyCard(s) {
  if (!s.push || !s.farm.accepts_requests) return ''
  const steps = ['pushHome1', 'pushHome2', 'pushHome3']
  const body = {
    on: `
      <p class="green small">${t(s.lang, 'pushOn')}</p>
      <div class="actions">
        <button class="secondary small" data-action="push-test">${t(s.lang, 'pushTest')}</button>
        <button class="link danger small" data-action="push-off">${t(s.lang, 'pushOff')}</button>
      </div>`,
    off: `<button class="primary wide" data-action="push-on">${t(s.lang, 'pushEnable')}</button>`,
    denied: `<p class="amber-text small">${t(s.lang, 'pushBlocked')}</p>`,
    home: s.pushHelp
      ? `<ol class="steps small">${steps.map((k) => `<li>${t(s.lang, k)}</li>`).join('')}</ol>`
      : `<button class="secondary small" data-action="push-home">${t(s.lang, 'pushHomeHow')}</button>`,
    unsupported: `<p class="muted small">${t(s.lang, 'pushUnsupported')}</p>`,
  }[s.push]
  return `
    <div class="card stack">
      <span><strong>${t(s.lang, 'pushTitle')}</strong><br><small class="muted">${t(s.lang, 'pushText')}</small></span>
      ${body}
    </div>`
}

/** Nella panoramica: le richieste da rispondere (le prime tre) e quante sono da ritirare. */
export function inbox(s) {
  if (!s.farm.has_farm_shop) return ''
  const waiting = s.requests.filter(isWaiting)
  const collecting = s.requests.filter(isToCollect).length
  return `
    <div class="section-head">
      <h2>${t(s.lang, 'requestsWaiting')}</h2>
      <a class="more" href="#/richieste">${t(s.lang, 'seeAll')}</a>
    </div>
    ${!s.farm.accepts_requests ? `<p class="muted">${t(s.lang, 'requestsOffNote')}</p>`
      : waiting.length ? waiting.slice(0, 3).map((r) => requestCard(s, r)).join('') : `<div class="card empty"><p class="muted">${t(s.lang, 'requestsNone')}</p></div>`}
    ${waiting.length > 3 ? `<p class="small"><a class="more" href="#/richieste">${t(s.lang, 'moreRequests', waiting.length - 3)}</a></p>` : ''}
    ${collecting ? `<p class="small muted">${t(s.lang, 'toCollectCount', collecting)}</p>` : ''}`
}

// Numeri e domanda ---------------------------------------------------------------------------

const tile = (value, label, note = '') =>
  `<div class="tile"><span>${label}</span><strong>${value}</strong>${note ? `<small>${note}</small>` : ''}</div>`

export function stats(s) {
  if (s.farm.status !== 'published') return ''
  const { stats: n } = s.area
  const trend = `${n.views_trend >= 0 ? '+' : ''}${n.views_trend}%`
  return `
    <h2>${t(s.lang, 'week')}</h2>
    <div class="tiles">
      ${tile(n.views, t(s.lang, 'views'), t(s.lang, 'trend', trend))}
      ${tile(n.directions, t(s.lang, 'directions'))}
      ${tile(n.followers, t(s.lang, 'followers'))}
      ${tile(n.waiting, t(s.lang, 'waiting'))}
    </div>
    ${n.confirmations > 0 ? `<p class="green">${t(s.lang, 'confirmations', n.confirmations)}</p>` : ''}
    ${n.closed_reports > 0 ? `<p class="amber-text">${t(s.lang, 'closedReports', n.closed_reports)}</p>` : ''}
    <p class="muted small">${t(s.lang, 'anonymous')}</p>`
}

export function demand(s) {
  const items = s.area.demand
  return `
    <h2>${t(s.lang, 'demand')}</h2>
    <p class="muted small">${t(s.lang, 'demandText')}</p>
    ${items.length ? items.map((item) => `
      <div class="row demand">
        <div>
          <strong>${esc(productName(s, item.kind))}</strong><br>
          <small class="muted">${t(s.lang, 'searches', item.searches)} · ${item.suppliers === 0
            ? t(s.lang, 'suppliersNone') : t(s.lang, 'suppliers', item.suppliers)}</small>
        </div>
        <button class="secondary small" data-action="demand-add" data-kind="${esc(item.kind)}">${t(s.lang, 'iSellIt')}</button>
      </div>`).join('') : `<p class="muted">${t(s.lang, 'demandNone')}</p>`}`
}

// Prodotti -----------------------------------------------------------------------------------

const unitOptions = (lang, selected) =>
  UNIT_CODES.map((u) => `<option value="${u}" ${u === selected ? 'selected' : ''}>${esc(unitName(lang, u))}</option>`).join('')

const amountValue = (value) => (value === null || value === undefined ? '' : formatAmount(value))

/** Il modulo che si apre sotto un prodotto: dettaglio, prezzo da–a, quantità e unità. */
function productForm(s, p) {
  const name = esc(productName(s, p.kind))
  const unit = p.price_unit ?? defaultUnit(s, p.kind)
  return `
    <form data-form="product" data-kind="${esc(p.kind)}" class="stack editor">
      <label class="stack small">${t(s.lang, 'detail')}
        <input name="detail" maxlength="60" value="${esc(p.detail ?? '')}" placeholder="${esc(t(s.lang, 'detailPlaceholder'))}">
      </label>
      <div class="pair">
        <label class="stack small">${t(s.lang, 'priceFrom')}
          <input name="min" inputmode="decimal" autocomplete="off" value="${amountValue(p.price_min)}" placeholder="2,50" aria-label="${name}: ${esc(t(s.lang, 'priceFrom'))}">
        </label>
        <label class="stack small">${t(s.lang, 'priceTo')}
          <input name="max" inputmode="decimal" autocomplete="off" value="${amountValue(p.price_max)}" aria-label="${name}: ${esc(t(s.lang, 'priceTo'))}">
        </label>
      </div>
      <div class="pair">
        <label class="stack small">${t(s.lang, 'priceFor')}
          <input name="quantity" type="number" min="1" max="5000" step="1" value="${p.price_quantity ?? 1}">
        </label>
        <label class="stack small">${t(s.lang, 'unit')}
          <select name="unit">${unitOptions(s.lang, unit)}</select>
        </label>
      </div>
      <label class="inline small"><input type="checkbox" name="on_request" ${p.on_request ? 'checked' : ''}> ${t(s.lang, 'onRequest')}</label>
      <small class="muted">${t(s.lang, 'onRequestHelp')}</small>
      <p class="small green preview">${previewText(s, p)}</p>
      <p class="muted small">${t(s.lang, 'priceHelp')}</p>
      <div class="actions">
        <button type="submit" class="primary">${t(s.lang, 'save')}</button>
        <button type="button" class="secondary" data-action="cancel-edit">${t(s.lang, 'cancel')}</button>
      </div>
      <button type="button" class="link danger small" data-action="remove-product" data-kind="${esc(p.kind)}">${t(s.lang, 'removeFromFarm')}</button>
    </form>`
}

export function previewText(s, p) {
  return t(s.lang, 'pricePreview', priceText(s.lang, p) || t(s.lang, 'noPrice'))
}

export function defaultUnit(s, kind) {
  return s.catalog.find((k) => k.kind === kind)?.default_unit ?? 'pezzo'
}

export function products(s) {
  const sold = new Set(s.farm.products.map((p) => p.kind))
  const shared = s.catalog.filter((k) => k.shared && !sold.has(k.kind))
  const groups = [...new Set(shared.map((k) => k.category))]
  return `
    <h2>${t(s.lang, 'products')}</h2>
    <div class="card list">
      ${s.farm.products.length ? s.farm.products.map((p) => {
        const name = esc(productName(s, p.kind))
        const price = priceText(s.lang, p)
        return `
        <div>
          <div class="product">
            <div class="grow">
              <strong>${name}${p.on_request && p.available ? ` <span class="pill amber small">${t(s.lang, 'onRequest')}</span>` : ''}</strong>
              ${p.detail ? `<small class="muted">${esc(p.detail)}</small>` : ''}
              <small class="${price ? 'green' : 'muted'}">${esc(price || t(s.lang, 'noPrice'))}</small>
              ${!p.available && p.waiting > 0 ? `<small class="terracotta">${t(s.lang, 'waitingFor', p.waiting)}</small>` : ''}
            </div>
            <label class="availability">
              <small>${t(s.lang, p.available ? 'available' : 'finished')}</small>
              <input type="checkbox" class="switch" data-action="available" data-kind="${esc(p.kind)}" ${p.available ? 'checked' : ''}
                aria-label="${name}: ${t(s.lang, 'available')}">
            </label>
            ${s.editing === p.kind ? '' : `
              <button class="secondary small" data-action="edit-product" data-kind="${esc(p.kind)}" aria-label="${esc(t(s.lang, 'editProduct'))}: ${name}">${t(s.lang, 'editProduct')}</button>`}
          </div>
          ${s.editing === p.kind ? productForm(s, p) : ''}
        </div>`
      }).join('') : `<p class="muted">${t(s.lang, 'noProductsYet')}</p>`}
    </div>
    <div class="row add">
      <select data-ref="add-kind" aria-label="${esc(t(s.lang, 'chooseProduct'))}">
        <option value="">${t(s.lang, 'chooseProduct')}</option>
        ${groups.map((g) => `
          <optgroup label="${esc(categoryName(s.lang, g))}">
            ${shared.filter((k) => k.category === g)
              .map((k) => `<option value="${esc(k.kind)}">${esc(productName(s, k.kind))}</option>`).join('')}
          </optgroup>`).join('')}
      </select>
      <button class="secondary" data-action="add-product">${t(s.lang, 'add')}</button>
    </div>
    ${s.admin ? '' : `<details class="custom" ${s.customOpen ? 'open' : ''}>
      <summary>${t(s.lang, 'customProduct')}</summary>
      <form data-form="custom" class="stack">
        <label class="stack small">${t(s.lang, 'customName')}
          <input name="name" required minlength="2" maxlength="40" placeholder="${esc(t(s.lang, 'customNamePlaceholder'))}">
        </label>
        <div class="pair">
          <label class="stack small">${t(s.lang, 'category')}
            <select name="category">${CATEGORY_CODES.map((c) => `<option value="${c}" ${c === 'altro' ? 'selected' : ''}>${esc(categoryName(s.lang, c))}</option>`).join('')}</select>
          </label>
          <label class="stack small">${t(s.lang, 'unit')}
            <select name="unit">${unitOptions(s.lang, 'pezzo')}</select>
          </label>
        </div>
        <button type="submit" class="secondary">${t(s.lang, 'addCustom')}</button>
        <small class="muted">${t(s.lang, 'customNote')}</small>
      </form>
    </details>`}
    <p class="muted small">${t(s.lang, 'productsNote')}</p>`
}

// Orari e chiusure ---------------------------------------------------------------------------

function dayFieldset(s, day) {
  const ranges = s.farm.opening_hours[String(day)] ?? []
  const [first, second] = [ranges[0] ?? [480, 720], ranges[1] ?? [900, 1110]]
  const classes = `${ranges.length ? '' : 'is-closed'} ${ranges.length > 1 ? '' : 'no-split'}`
  const dayName = esc(capitalize(weekdayName(day, s.lang)))
  const time = (name, minutes, label) =>
    `<input type="time" step="300" name="${name}-${day}" value="${toClock(minutes)}" aria-label="${dayName} ${label}">`
  return `
    <fieldset class="day ${classes}">
      <legend class="sr-only">${dayName}</legend>
      <div class="row">
        <strong>${dayName}</strong>
        <label class="inline"><input type="checkbox" name="open-${day}" ${ranges.length ? 'checked' : ''}> ${t(s.lang, 'open')}</label>
      </div>
      <div class="times">${time('s1', first[0], '1 ▸')} – ${time('e1', first[1], '1 ◂')}</div>
      <label class="inline split small"><input type="checkbox" name="split-${day}" ${ranges.length > 1 ? 'checked' : ''}> ${t(s.lang, 'afternoon')}</label>
      <div class="times second">${time('s2', second[0], '2 ▸')} – ${time('e2', second[1], '2 ◂')}</div>
    </fieldset>`
}

export function hours(s) {
  const { farm } = s
  return `
    <h2>${t(s.lang, 'hours')}</h2>
    ${farm.has_vending_24h ? `<p class="green">${t(s.lang, 'vendingAlways')}</p>` : ''}
    ${farm.has_farm_shop ? `
      <form data-form="hours" class="card list">
        ${WEEK.map((day) => dayFieldset(s, day)).join('')}
        <button type="submit" class="primary wide">${t(s.lang, 'saveHours')}</button>
      </form>` : `<p class="muted">${t(s.lang, 'hoursNoShop')}</p>`}`
}

export function closures(s) {
  const { farm } = s
  const today = todayRome()
  const upcoming = farm.hours_exceptions.filter((e) => e.day >= today).sort((a, b) => a.day.localeCompare(b.day))
  const closedToday = upcoming.some((e) => e.day === today && e.ranges.length === 0)
  return `
    <h2>${t(s.lang, 'closures')}</h2>
    ${farm.has_farm_shop ? `
      <div class="card">
        <div class="row">
          <span><strong>${t(s.lang, closedToday ? 'reopenToday' : 'closedToday')}</strong><br><small class="muted">${t(s.lang, 'closedTodayText')}</small></span>
          <button class="secondary small" data-action="closed-today">${closedToday ? '🔓' : '🔒'}</button>
        </div>
      </div>` : ''}
    <div class="card list">
      ${upcoming.length ? upcoming.map((e) => `
        <div class="row">
          <span class="terracotta">${esc(capitalize(formatDay(e.day, s.lang)))} · ${esc(s.lang === 'de' ? e.reason_de : e.reason_it)}${e.ranges.length
            ? ` · ${e.ranges.map((r) => `${toClock(r[0])}–${toClock(r[1])}`).join(', ')}` : ''}</span>
          <button class="icon" data-action="remove-closure" data-day="${e.day}" aria-label="${t(s.lang, 'remove')}">✕</button>
        </div>`).join('') : `<p class="muted">${t(s.lang, 'closuresNone')}</p>`}
    </div>
    <form data-form="closure" class="row add">
      <input type="date" name="day" required min="${today}" max="${addDays(today, 90)}" value="${addDays(today, 1)}">
      <input name="reason" maxlength="60" placeholder="${esc(t(s.lang, 'closureReason'))}">
      <button type="submit" class="secondary">${t(s.lang, 'addClosure')}</button>
    </form>`
}

// Novità e fondo pagina ----------------------------------------------------------------------

export function notice(s) {
  const today = todayRome()
  const { notice_text: text, notice_until: until } = s.farm
  const active = text && until && until >= today
  return `
    <h2>${t(s.lang, 'notice')}</h2>
    <form data-form="notice" class="card stack">
      <textarea name="text" rows="3" maxlength="140" required placeholder="${esc(t(s.lang, 'noticePlaceholder'))}">${esc(active ? text : '')}</textarea>
      <small class="muted counter">${active ? text.length : 0}/140</small>
      <label class="row">${t(s.lang, 'noticeUntil')}
        <input type="date" name="until" required min="${today}" max="${addDays(today, 14)}" value="${active ? until : addDays(today, 7)}">
      </label>
      <p class="muted small">${t(s.lang, 'noticeHelp')}</p>
      <div class="actions">
        <button type="submit" class="primary">${t(s.lang, 'publish')}</button>
        ${active ? `<button type="button" class="secondary" data-action="remove-notice">${t(s.lang, 'removeNotice')}</button>` : ''}
      </div>
    </form>`
}

export function footer(s) {
  return `
    <p class="muted small">${t(s.lang, 'personal')}</p>
    <p class="muted small">${t(s.lang, 'appHint')}</p>
    <div class="stack">
      <button class="link danger" data-action="leave">${t(s.lang, 'leave')}</button>
      ${s.farm.is_demo ? `<button class="link" data-action="reset">${t(s.lang, 'reset')}</button>` : ''}
    </div>`
}

// Anteprime (colonna a destra sul computer): come i clienti vedono la parte della scheda che si sta modificando.

const photoUrl = (photo, width = 400) =>
  photo.startsWith('https://') ? photo : `https://images.unsplash.com/photo-${photo}?auto=format&fit=crop&w=${width}&q=70`

const previewCard = (s, title, body) => `
    <div class="card preview">
      <p class="eyebrow">${t(s.lang, 'previewTitle')}</p>
      <h2>${title}</h2>
      ${body}
    </div>`

export function hoursPreview(s) {
  const f = s.farm
  if (!f.has_farm_shop) return ''
  const today = todayRome()
  const now = minuteNowRome()
  const ranges = dayRanges(f, today)
  const openNow = ranges.find(([a, b]) => a <= now && now < b)
  const later = ranges.find(([a]) => a > now)
  // Chiuso adesso: quando riapre, oggi più tardi o nei prossimi giorni.
  let next = null
  for (let i = 1; i <= 7 && !later && !next; i++) {
    const day = addDays(today, i)
    const first = dayRanges(f, day)[0]
    if (first) next = t(s.lang, 'opensOn', i === 1 ? t(s.lang, 'tomorrow') : formatDay(day, s.lang).split(' ')[0], toClock(first[0]))
  }
  const status = openNow
    ? `<p class="status open"><span></span>${t(s.lang, 'openUntil', toClock(openNow[1]))}</p>`
    : `<p class="status"><span></span>${later ? t(s.lang, 'opensAt', toClock(later[0])) : next ?? t(s.lang, 'closedNow')}</p>`
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i)).map((day) => {
    const r = dayRanges(f, day)
    const exception = f.hours_exceptions.find((e) => e.day === day)
    return `<div class="row small${day === today ? ' today' : ''}"><span>${esc(capitalize(day === today ? t(s.lang, 'today') : formatDay(day, s.lang).split(' ')[0]))}</span>
      <span class="${r.length ? '' : 'muted'}">${r.length ? r.map(([a, b]) => `${toClock(a)}–${toClock(b)}`).join(', ') : t(s.lang, 'closed')}${exception ? ' *' : ''}</span></div>`
  }).join('')
  return previewCard(s, t(s.lang, 'previewHours'), `${status}<div class="list">${week}</div>
      ${f.hours_exceptions.some((e) => e.day >= today && e.day <= addDays(today, 6)) ? `<p class="muted small">* ${t(s.lang, 'specialDay')}</p>` : ''}`)
}

export function noticePreview(s) {
  const f = s.farm
  const today = todayRome()
  const active = f.notice_text && f.notice_until >= today
  return previewCard(s, t(s.lang, 'previewNotice'), `
      <div class="news-preview">
        ${f.photos?.[0] ? `<img src="${esc(photoUrl(f.photos[0], 160))}" alt="" width="64" height="64">` : '<span class="news-photo"></span>'}
        <div>
          <strong>${esc(f.name)}</strong>
          <p data-preview-notice>${esc(active ? f.notice_text : t(s.lang, 'noticePreviewEmpty'))}</p>
          <small class="muted" data-preview-until>${active ? t(s.lang, 'noticeUntilShort', formatDay(f.notice_until, s.lang)) : ''}</small>
        </div>
      </div>
      <p class="muted small">${t(s.lang, 'noticePreviewHelp')}</p>`)
}

export function productsPreview(s) {
  const sorted = [...s.farm.products].sort((a, b) => b.available - a.available
    || productName(s, a.kind).localeCompare(productName(s, b.kind), s.lang))
  return previewCard(s, t(s.lang, 'previewProducts'), sorted.length ? `<div class="list">${sorted.map((p) => `
      <div class="row small${p.available ? '' : ' muted'}"><span>${esc(capitalize(productName(s, p.kind)))}</span>
        <span>${p.available ? esc(priceText(s.lang, p) || '—') : t(s.lang, 'soldOut')}</span></div>`).join('')}</div>`
    : `<p class="muted small">${t(s.lang, 'productsPreviewEmpty')}</p>`)
}

export function farmPreview(s) {
  const f = s.farm
  const own = (s.lang === 'de' ? f.description_own_de : f.description_own_it) || f.description || ''
  const tags = [
    f.has_farm_shop && t(s.lang, 'shop'),
    f.has_vending_24h && t(s.lang, 'vending'),
    f.payments?.includes('card') ? t(s.lang, 'cashAndCard') : t(s.lang, 'cashOnly'),
  ].filter(Boolean)
  return previewCard(s, t(s.lang, 'previewFarm'), `
      ${f.photos?.[0] ? `<img class="preview-photo" src="${esc(photoUrl(f.photos[0], 640))}" alt="" width="640" height="360">` : ''}
      <strong class="preview-name">${esc(f.name)}</strong>
      <p class="muted small">${esc(f.address ?? '')}</p>
      <p class="preview-tags">${tags.map((x) => `<span class="pill">${esc(x)}</span>`).join('')}</p>
      ${own ? `<p class="small preview-desc">${esc(own)}</p>` : `<p class="muted small">${t(s.lang, 'descriptionPreviewEmpty')}</p>`}`)
}
