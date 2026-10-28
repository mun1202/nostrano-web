// Le parti della pagina, come HTML. Ogni testo che arriva dal database o dai clienti passa da esc().
import { CATEGORY_CODES, UNIT_CODES, categoryName, formatAmount, municipalityName, priceText, t, unitName } from './i18n.js'
import { WEEK, addDays, formatDay, formatInstant, openDays, toClock, todayRome, weekdayName } from './days.js'

export const esc = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1)

export function productName(s, kind) {
  const entry = s.catalog.find((k) => k.kind === kind)
  return entry ? (s.lang === 'de' ? entry.name_de : entry.name_it) : kind
}

function itemsText(s, items) {
  const names = items.map((kind) => productName(s, kind))
  return capitalize((s.lang === 'it' ? names.map((n) => n.toLowerCase()) : names).join(', '))
}

export function isWaiting(request) {
  return request.status === 'waiting' && request.day >= todayRome()
}

const confirmedToday = (farm) =>
  new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Rome' }).format(new Date(farm.last_checked_at)) === todayRome()

// Testata e conferma -------------------------------------------------------------------------

export function header(s) {
  const { farm } = s
  const status = farm.status === 'hidden' ? 'hiddenFarm' : farm.status === 'draft' ? (farm.ready_at ? 'inReview' : 'draft') : null
  return `
    ${s.appLink ? `
      <div class="card banner row">
        <span>${t(s.lang, 'appBanner')}</span>
        <a class="button secondary small" href="${esc(s.appLink)}">${t(s.lang, 'appBannerButton')}</a>
      </div>` : ''}
    <h1>${esc(farm.name)}</h1>
    <p class="muted">${esc(municipalityName(s.lang, farm.municipality))} · ${esc(farm.address)}</p>
    ${status ? `<p class="pill amber">${t(s.lang, status)}</p>` : ''}`
}

/** Per la scheda in bozza: cosa manca, il consenso e l'invio per la pubblicazione. */
export function onboarding(s) {
  const { farm } = s
  if (farm.status !== 'draft' || farm.ready_at) return ''
  const missing = new Set(farm.missing)
  const steps = [
    ['products', 'stepProducts', 's-products'],
    ...(farm.has_farm_shop ? [['hours', 'stepHours', 's-hours']] : []),
    ['description', 'stepDescription', 's-farm'],
    ['consent', 'stepConsent', 's-onboarding'],
  ]
  return `
    <div class="card soft-green">
      <h2>${t(s.lang, 'welcome')}</h2>
      <p>${t(s.lang, 'welcomeText')}</p>
      <ol class="checklist">
        ${steps.map(([key, label, anchor]) => `
          <li class="${missing.has(key) ? '' : 'done'}"><a href="#${anchor}">${t(s.lang, label)}</a></li>`).join('')}
      </ol>
      ${missing.has('consent') ? `
        <div class="consent">
          <p class="small">${t(s.lang, 'consentText')}</p>
          <button class="secondary" data-action="consent">✓ ${t(s.lang, 'giveConsent')}</button>
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
    <div class="card soft-green">
      <h2>${t(s.lang, 'allGood')}</h2>
      <p>${t(s.lang, 'allGoodText')}</p>
      <p class="muted small">${t(s.lang, 'lastChecked', formatInstant(s.farm.last_checked_at, s.lang))}</p>
      <button class="primary wide" data-action="confirm" ${done ? 'disabled' : ''}>
        ✓ ${t(s.lang, done ? 'confirmedToday' : 'confirm')}
      </button>
    </div>`
}

// Richieste ----------------------------------------------------------------------------------

function statusText(s, request) {
  if (request.status === 'waiting') return t(s.lang, 'status_expired')
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
        <div><strong>${esc(request.name)}</strong><br><span class="green">${esc(formatDay(request.day, s.lang))}</span></div>
        <button class="link danger small" data-action="block" data-id="${esc(request.id)}">${t(s.lang, 'block')}</button>
      </div>
      <p>${esc(itemsText(s, request.items))}</p>
      ${request.note ? `<p class="muted"><em>“${esc(request.note)}”</em></p>` : ''}
      ${s.proposing === request.id ? proposalForm(s, request) : `
        <div class="actions three">
          <button class="primary" data-action="answer" data-status="accepted" data-id="${esc(request.id)}">✓ ${t(s.lang, 'keep')}</button>
          <button class="secondary" data-action="answer" data-status="declined" data-id="${esc(request.id)}">✕ ${t(s.lang, 'dontHave')}</button>
          <button class="secondary" data-action="propose" data-id="${esc(request.id)}">${t(s.lang, 'otherDay')}</button>
        </div>`}
    </article>`
}

export function requests(s) {
  const { farm } = s
  if (!farm.has_farm_shop) return ''
  const waiting = s.requests.filter(isWaiting)
  const answered = s.requests.filter((r) => !isWaiting(r))
  return `
    <h2>${t(s.lang, 'requests')}${waiting.length ? ` <span class="count">${waiting.length}</span>` : ''}</h2>
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
    <h3>${t(s.lang, 'requestsWaiting')}</h3>
    ${waiting.length ? waiting.map((r) => requestCard(s, r)).join('') : `<p class="muted">${t(s.lang, 'requestsNone')}</p>`}
    ${answered.length ? `
      <h3>${t(s.lang, 'answered')}</h3>
      <div class="card list">
        ${answered.map((r) => `
          <div class="answered">
            <strong>${esc(r.name)} · ${esc(formatDay(r.day, s.lang))}</strong>
            <small class="muted">${esc(itemsText(s, r.items))}</small>
            <span class="pill">${esc(statusText(s, r))}</span>
          </div>`).join('')}
      </div>` : ''}`
}

// Numeri e domanda ---------------------------------------------------------------------------

const tile = (value, label, note = '') =>
  `<div class="tile"><strong>${value}</strong><span>${label}</span>${note ? `<small class="green">${note}</small>` : ''}</div>`

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
              <strong>${name}</strong>
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
    <details class="custom" ${s.customOpen ? 'open' : ''}>
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
    </details>
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
