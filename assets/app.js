// Pagina del produttore: si apre dal link personale https://nostrano.app/modifica/<token>.
// Fa le stesse cose dell'area produttore dell'app, con le stesse funzioni del database.
import { ROOT, linkCode, rpc } from './api.js'
import { errorText, initialLanguage, parseAmount, rememberLanguage, t } from './i18n.js'
import { WEEK, fromClock, todayRome } from './days.js'
import * as views from './views.js'

const root = document.querySelector('#app')
const languageSelect = document.querySelector('#lang')
// La bozza segue l'ordine di chi compila la scheda; quella pubblicata mette davanti richieste e numeri.
const DRAFT = ['header', 'onboarding', 'products', 'hours', 'farm', 'demand', 'closures', 'notice', 'requests', 'footer']
const PUBLISHED = ['header', 'requests', 'confirm', 'stats', 'demand', 'products', 'hours', 'closures', 'notice', 'farm', 'footer']
const sections = () => (s.farm.status === 'draft' ? DRAFT : PUBLISHED)

const s = {
  lang: initialLanguage(), farm: null, area: null, requests: [], catalog: [],
  proposing: null, editing: null, customOpen: false, appLink: null, busy: false, message: null,
}

// Disegno ------------------------------------------------------------------------------------

/** «Non c'è nell'elenco?» resta aperto o chiuso com'era anche quando la pagina si ridisegna. */
function rememberOpen() {
  const details = root.querySelector('details.custom')
  if (details) s.customOpen = details.open
}

function render() {
  s.message = null
  rememberOpen()
  root.innerHTML = sections().map((name) => `<section id="s-${name}">${views[name](s)}</section>`).join('')
}

function renderSection(name) {
  rememberOpen()
  const section = root.querySelector(`#s-${name}`)
  if (section) section.innerHTML = views[name](s)
}

/** Schermata con un solo messaggio: caricamento, link non valido, telefono non collegato. */
function showMessage(titleKey, textKey) {
  s.message = { titleKey, textKey }
  root.innerHTML = `
    <div class="message">
      <img src="${ROOT}assets/logo.svg" alt="" width="48" height="60">
      <h1>${t(s.lang, titleKey)}</h1>
      ${textKey ? `<p class="muted">${t(s.lang, textKey)}</p>` : ''}
    </div>`
}

let toastTimer
function toast(text, isError = false) {
  const element = document.querySelector('#toast')
  element.textContent = text
  element.classList.toggle('error', isError)
  element.classList.add('show')
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => element.classList.remove('show'), 2600)
}

function applyLanguage() {
  document.documentElement.lang = s.lang
  document.title = `Nostrano · ${t(s.lang, 'title')}`
  languageSelect.value = s.lang
  languageSelect.setAttribute('aria-label', t(s.lang, 'language'))
}

// Dati ---------------------------------------------------------------------------------------

async function reload() {
  const [farm, area, requests] = await Promise.all([rpc('producer_farm'), rpc('producer_area'), rpc('producer_requests')])
  Object.assign(s, { farm, area, requests })
}

/** Un'azione verso il server: poi ricarica tutto, così la pagina mostra quello che c'è davvero. */
async function act(action, success) {
  if (s.busy) return
  s.busy = true
  document.body.classList.add('busy')
  try {
    await action()
    await reload()
    render()
    if (success) toast(success)
  } catch (error) {
    toast(errorText(s.lang, error), true)
    if (error.code === 'not_member') showMessage('openLink', 'openLinkText')
  } finally {
    s.busy = false
    document.body.classList.remove('busy')
  }
}

const save = (patch, success) => act(() => rpc('producer_save', { p_data: patch }), success)

const PRODUCT_FIELDS = ['kind', 'available', 'price_min', 'price_max', 'price_quantity', 'price_unit', 'detail']
const productList = () => s.farm.products.map((p) => Object.fromEntries(PRODUCT_FIELDS.map((f) => [f, p[f] ?? null])))

/** Aggiunge un prodotto con l'unità solita del catalogo e apre subito il prezzo. */
async function addProduct(kind) {
  if (!kind || s.farm.products.some((p) => p.kind === kind)) return
  const product = { kind, available: true, price_min: null, price_max: null, price_quantity: 1, price_unit: views.defaultUnit(s, kind), detail: null }
  await save({ products: [...productList(), product] }, t(s.lang, 'saved'))
  if (s.farm.products.some((p) => p.kind === kind)) openEditor(kind)
}

function openEditor(kind) {
  s.editing = kind
  renderSection('products')
  const form = root.querySelector(`form[data-form="product"][data-kind="${CSS.escape(kind)}"]`)
  form?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  form?.elements.min.focus({ preventScroll: true })
}

/** Legge il modulo del prezzo; null se il prezzo non va bene. */
function productFromForm(form) {
  const min = parseAmount(form.elements.min.value)
  const max = parseAmount(form.elements.max.value)
  const quantity = Math.round(Number(form.elements.quantity.value) || 1)
  if (Number.isNaN(min) || Number.isNaN(max) || (max !== null && (min === null || max < min)) || quantity < 1 || quantity > 5000) return null
  return {
    price_min: min,
    price_max: max !== null && max > min ? max : null,
    price_quantity: quantity,
    price_unit: form.elements.unit.value,
    detail: form.elements.detail.value.trim() || null,
  }
}

/** I giorni speciali passati non servono più: si mandano solo quelli da oggi in poi. */
const upcomingExceptions = () => s.farm.hours_exceptions.filter((e) => e.day >= todayRome())

function validRanges(ranges) {
  return ranges.every(([start, end]) => start !== null && end !== null && end > start)
    && (ranges.length < 2 || ranges[1][0] >= ranges[0][1])
}

function saveHours(form) {
  const hours = {}
  for (const day of WEEK) {
    if (!form.elements[`open-${day}`].checked) continue
    const value = (name) => fromClock(form.elements[`${name}-${day}`].value)
    const ranges = [[value('s1'), value('e1')]]
    if (form.elements[`split-${day}`].checked) ranges.push([value('s2'), value('e2')])
    if (!validRanges(ranges)) {
      toast(t(s.lang, 'badHours'), true)
      return
    }
    hours[day] = ranges
  }
  save({ opening_hours: hours }, t(s.lang, 'hoursSaved'))
}

function toggleClosedToday() {
  const today = todayRome()
  const closed = s.farm.hours_exceptions.some((e) => e.day === today && e.ranges.length === 0)
  const others = upcomingExceptions().filter((e) => e.day !== today)
  const next = closed ? others : [...others, { day: today, ranges: [], reason_it: 'Chiuso oggi', reason_de: 'Heute geschlossen' }]
  save({ hours_exceptions: next }, t(s.lang, closed ? 'reopenTodayDone' : 'closedTodayDone'))
}

/** Prodotto che non è nel catalogo: il server lo crea per questo maso e restituisce il codice. */
async function addCustom(name, category, unit) {
  let kind
  await act(async () => {
    kind = await rpc('producer_add_product', { p_name: name, p_category: category, p_unit: unit })
    s.catalog = await rpc('product_catalog')
  })
  if (!kind) return
  root.querySelector('details.custom')?.removeAttribute('open')
  if (s.farm.products.some((p) => p.kind === kind)) return openEditor(kind)
  const product = { kind, available: true, price_min: null, price_max: null, price_quantity: 1, price_unit: unit, detail: null }
  await save({ products: [...productList(), product] }, t(s.lang, 'saved'))
  if (s.farm.products.some((p) => p.kind === kind)) openEditor(kind)
}

// Tocchi e moduli ----------------------------------------------------------------------------

root.addEventListener('click', (event) => {
  const element = event.target.closest('button[data-action]')
  if (!element) return
  const { action, id, kind, status, day, delta } = element.dataset
  switch (action) {
    case 'confirm':
      return save({}, t(s.lang, 'confirmedToast'))
    case 'answer':
      return act(() => rpc('producer_answer', { p_id: id, p_status: status }), t(s.lang, 'answerSent'))
    case 'propose':
      s.proposing = id
      return renderSection('requests')
    case 'cancel-proposal':
      s.proposing = null
      return renderSection('requests')
    case 'block':
      if (window.confirm(t(s.lang, 'blockConfirm'))) act(() => rpc('producer_block', { p_id: id }), t(s.lang, 'blocked'))
      return
    case 'max': {
      const next = Math.min(30, Math.max(1, s.farm.max_requests_per_day + Number(delta)))
      if (next !== s.farm.max_requests_per_day) save({ max_requests_per_day: next })
      return
    }
    case 'demand-add':
      return addProduct(kind)
    case 'add-product':
      return addProduct(root.querySelector('[data-ref="add-kind"]').value)
    case 'edit-product':
      return openEditor(kind)
    case 'cancel-edit':
      s.editing = null
      return renderSection('products')
    case 'remove-product':
      if (window.confirm(t(s.lang, 'removeConfirm', views.productName(s, kind)))) {
        s.editing = null
        save({ products: productList().filter((p) => p.kind !== kind) }, t(s.lang, 'saved'))
      }
      return
    case 'consent':
      return act(() => rpc('producer_consent'), t(s.lang, 'consentGiven'))
    case 'request-publish':
      return act(() => rpc('producer_request_publish'), t(s.lang, 'publishRequested'))
    case 'remove-closure':
      return save({ hours_exceptions: upcomingExceptions().filter((e) => e.day !== day) }, t(s.lang, 'closureRemoved'))
    case 'closed-today':
      return toggleClosedToday()
    case 'remove-notice':
      return save({ notice_text: null, notice_until: null }, t(s.lang, 'noticeRemoved'))
    case 'leave':
      if (window.confirm(t(s.lang, 'leaveConfirm'))) {
        rpc('producer_leave').finally(() => {
          s.farm = null
          toast(t(s.lang, 'left'))
          showMessage('openLink', 'openLinkText')
        })
      }
      return
    case 'reset':
      return act(() => rpc('demo_reset'), t(s.lang, 'resetDone'))
  }
})

root.addEventListener('change', (event) => {
  const element = event.target
  const { action, kind } = element.dataset
  if (action === 'accepts') {
    save({ accepts_requests: element.checked }, t(s.lang, element.checked ? 'requestsOn' : 'requestsOff'))
  } else if (action === 'available') {
    save({ products: productList().map((p) => (p.kind === kind ? { ...p, available: element.checked } : p)) }, t(s.lang, 'saved'))
  } else if (element.name === 'unit' && element.form?.dataset.form === 'product') {
    // "1 g" non ha senso: per i grammi si parte da 250.
    const quantity = element.form.elements.quantity
    if (element.value === 'g' && Number(quantity.value) <= 1) quantity.value = 250
    if (element.value !== 'g' && Number(quantity.value) >= 50) quantity.value = 1
    updatePreview(element.form)
  } else if (/^(open|split)-/.test(element.name)) {
    const fieldset = element.closest('fieldset')
    const [day] = element.name.split('-').slice(1)
    fieldset.classList.toggle('is-closed', !fieldset.querySelector(`[name="open-${day}"]`).checked)
    fieldset.classList.toggle('no-split', !fieldset.querySelector(`[name="split-${day}"]`).checked)
  }
})

function updatePreview(form) {
  const product = productFromForm(form)
  form.querySelector('.preview').textContent = product
    ? views.previewText(s, { kind: form.dataset.kind, ...product })
    : t(s.lang, 'badPrice')
}

root.addEventListener('input', (event) => {
  const { form, name } = event.target
  if (name === 'text') {
    form.querySelector('.counter').textContent = `${event.target.value.length}/140`
  } else if (form?.dataset.form === 'product') {
    updatePreview(form)
  }
})



root.addEventListener('submit', (event) => {
  event.preventDefault()
  const form = event.target
  const data = new FormData(form)
  switch (form.dataset.form) {
    case 'proposal':
      return act(async () => {
        const reply = String(data.get('reply') ?? '').trim()
        await rpc('producer_answer', {
          p_id: form.dataset.id, p_status: 'other_day', p_other_day: data.get('day'), p_reply: reply || null,
        })
        s.proposing = null
      }, t(s.lang, 'answerSent'))
    case 'hours':
      return saveHours(form)
    case 'closure': {
      const day = data.get('day')
      const reason = String(data.get('reason') ?? '').trim()
      const closure = {
        day, ranges: [],
        reason_it: reason || t('it', 'defaultReason'),
        reason_de: reason || t('de', 'defaultReason'),
      }
      return save({ hours_exceptions: [...upcomingExceptions().filter((e) => e.day !== day), closure] }, t(s.lang, 'closureAdded'))
    }
    case 'notice':
      return save({ notice_text: String(data.get('text')).trim(), notice_until: data.get('until') }, t(s.lang, 'noticePublished'))
    case 'product': {
      const product = productFromForm(form)
      if (!product) return toast(t(s.lang, 'badPrice'), true)
      const kind = form.dataset.kind
      s.editing = null
      return save({ products: productList().map((p) => (p.kind === kind ? { ...p, ...product } : p)) }, t(s.lang, 'saved'))
    }
    case 'custom':
      return addCustom(String(data.get('name') ?? '').trim(), data.get('category'), data.get('unit'))
    case 'farm':
      return save({
        description: String(data.get('description') ?? '').trim(),
        description_lang: s.lang,
        payments: ['cash', 'card'].filter((p) => data.get(p)),
        has_farm_shop: Boolean(data.get('shop')),
        has_vending_24h: Boolean(data.get('vending')),
      }, t(s.lang, 'farmSaved'))
  }
})

languageSelect.addEventListener('change', () => {
  s.lang = languageSelect.value
  rememberLanguage(s.lang)
  applyLanguage()
  if (s.message) showMessage(s.message.titleKey, s.message.textKey)
  else if (s.farm) render()
})

// Richieste nuove: ogni 30 secondi, e tutto da capo quando si torna sulla pagina.
setInterval(async () => {
  if (!s.farm || s.busy || s.proposing || s.editing || document.visibilityState !== 'visible') return
  try {
    s.requests = await rpc('producer_requests')
    renderSection('requests')
  } catch { /* riprova al prossimo giro */ }
}, 30_000)

document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState !== 'visible' || !s.farm || s.busy || s.editing) return
  try {
    await reload()
    render()
  } catch { /* resta la pagina di prima */ }
})

const TOKEN_KEY = 'nostrano.token'

/** Su iPhone e iPad, il link che apre la stessa scheda nell'app (se è installata). */
function appLink() {
  const apple = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  if (!apple) return null
  let token = null
  try { token = sessionStorage.getItem(TOKEN_KEY) } catch { /* navigazione privata */ }
  return token ? `nostrano://produttore/${encodeURIComponent(token)}` : null
}

// Avvio --------------------------------------------------------------------------------------

async function boot() {
  applyLanguage()
  showMessage('loading')
  const token = linkCode()
  try {
    if (token) {
      await rpc('producer_claim', { p_token: token })
      // Il link resta su WhatsApp: qui non serve più, e non deve finire in cronologia o schermate.
      history.replaceState(null, '', `${ROOT}modifica/`)
      // Per "Apri nell'app" serve ancora, ma solo finché resta aperta questa scheda del browser.
      try { sessionStorage.setItem(TOKEN_KEY, token) } catch { /* navigazione privata */ }
    }
    s.appLink = appLink()
    s.catalog = await rpc('product_catalog')
    await reload()
    render()
  } catch (error) {
    if (error.code === 'invalid_link') showMessage('invalidLink')
    else if (error.code === 'not_member') showMessage('openLink', 'openLinkText')
    else showMessage('error_generic')
  }
}

boot()
