// Pannello admin: si apre con un link di accesso (https://nostrano.app/admin/<codice>), poi il browser resta abilitato.
// Da qui si creano le schede in bozza, si invitano i masi su WhatsApp e si pubblica.
import { ROOT, linkCode, removeUploaded, rpc, upload } from './api.js?v=mvrq5ht4'
import { MUNICIPALITY_CODES, municipalityName } from './i18n.js?v=mvrq5ht4'
import * as views from './admin-views.js?v=mvrq5ht4'

const root = document.querySelector('#app')
const navigation = document.querySelector('#nav')
const config = window.NOSTRANO_CONFIG
/** Dove si aprono i link per i masi: il sito pubblicato o, in prova, il Mac sulla rete Wi-Fi. */
const publicUrl = (config.publicUrl ?? location.origin + ROOT).replace(/\/$/, '')

const a = {
  route: { name: '', param: null, query: new URLSearchParams() },
  overview: null, farms: [], farm: null, reports: [], suggestions: [], custom: [], catalog: [], devices: [],
  filter: 'all', search: '', invite: null, newCode: null, personalLink: null, fromSuggestion: null, uploading: false, busy: false,
}

// Disegno e messaggi --------------------------------------------------------------------------

const SCREENS = {
  '': views.overview, masi: views.farms, maso: views.farm, nuovo: views.newFarm,
  segnalazioni: views.reports, suggeriti: views.suggestions, prodotti: views.products, accessi: views.devices,
}

function render() {
  navigation.innerHTML = views.nav(a)
  root.innerHTML = (SCREENS[a.route.name] ?? views.overview)(a)
}

let toastTimer
function toast(text, isError = false) {
  const element = document.querySelector('#toast')
  element.textContent = text
  element.classList.toggle('error', isError)
  element.classList.add('show')
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => element.classList.remove('show'), 2800)
}

const ERRORS = {
  not_admin: 'Questo browser non è più abilitato.',
  needs_consent: 'Prima serve il consenso del maso.',
  incomplete: 'Mancano dei dati obbligatori.',
  bad_name: 'Controlla il nome.',
  bad_photos: 'Troppe foto (al massimo 10).',
  bad_hours: 'Controlla gli orari.',
  published: 'Una scheda pubblicata va prima nascosta.',
  not_found: 'Non trovato: forse è stato appena tolto.',
  network: 'Nessuna connessione.',
}
const errorText = (error) => ERRORS[error?.code] ?? `Non riuscito (${error?.code ?? 'errore'}).`

// Dati per ogni schermata ---------------------------------------------------------------------

function parseRoute() {
  const [path, query = ''] = location.hash.replace(/^#\/?/, '').split('?')
  const [name = '', param = null] = path.split('/')
  return { name: decodeURIComponent(name), param: param && decodeURIComponent(param), query: new URLSearchParams(query) }
}

async function load() {
  const { name, param, query } = a.route
  // I numeri nel menu servono ovunque.
  const overview = rpc('admin_overview').then((o) => { a.overview = o })
  switch (name) {
    case '':
      a.farms = await rpc('admin_farms')
      break
    case 'masi':
      a.filter = query.get('f') ?? a.filter
      a.farms = await rpc('admin_farms')
      break
    case 'maso':
      [a.farm, a.catalog] = await Promise.all([rpc('admin_farm', { p_slug: param }), rpc('product_catalog')])
      break
    case 'nuovo': {
      const id = Number(query.get('s'))
      a.fromSuggestion = id ? (await rpc('admin_suggestions')).find((s) => s.id === id) ?? null : null
      break
    }
    case 'segnalazioni':
      a.reports = await rpc('admin_reports')
      break
    case 'suggeriti':
      a.suggestions = await rpc('admin_suggestions')
      break
    case 'prodotti':
      [a.custom, a.catalog] = await Promise.all([rpc('admin_custom_products'), rpc('product_catalog')])
      break
    case 'accessi':
      a.devices = await rpc('admin_devices')
      break
  }
  await overview
}

async function show() {
  const route = parseRoute()
  if (route.name !== a.route.name || route.param !== a.route.param) {
    a.invite = null
    a.newCode = null
    a.personalLink = null
  }
  a.route = route
  try {
    await load()
    render()
    window.scrollTo(0, 0)
  } catch (error) {
    if (error.code === 'not_admin') {
      navigation.innerHTML = ''
      root.innerHTML = views.notAdmin()
    } else {
      toast(errorText(error), true)
    }
  }
}

/** Un'azione verso il server, poi la schermata si ricarica con i dati veri. */
async function act(action, success) {
  if (a.busy) return
  a.busy = true
  document.body.classList.add('busy')
  try {
    const result = await action()
    await load()
    render()
    if (success) toast(typeof success === 'function' ? success(result) : success)
    return result
  } catch (error) {
    toast(errorText(error), true)
  } finally {
    a.busy = false
    document.body.classList.remove('busy')
  }
}

// Modulo della scheda -------------------------------------------------------------------------

/** "Bolzano", "Bozen" o "bolzano" diventano il codice; un comune nuovo resta come scritto. */
function municipalityCode(text) {
  const value = text.trim().toLowerCase()
  return MUNICIPALITY_CODES.find((code) => code.toLowerCase() === value
    || municipalityName('it', code).toLowerCase() === value || municipalityName('de', code).toLowerCase() === value) ?? text.trim()
}

/** Coordinate incollate da Google Maps: "46.4983, 11.2611", un link con @46.49,11.26 o ?q=46.49,11.26. */
export function parseCoordinates(text) {
  const value = String(text ?? '').trim()
  const match = value.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
    ?? value.match(/[?&](?:q|query|ll)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/)
    ?? value.match(/^(-?\d+(?:[.,]\d+)?)\s*(?:[,;]\s*|\s+)(-?\d+(?:[.,]\d+)?)$/)
  if (!match) return null
  const [lat, lng] = [match[1], match[2]].map((n) => Number(n.replace(',', '.')))
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null
}

function farmData(form) {
  const data = new FormData(form)
  const text = (name) => String(data.get(name) ?? '').trim()
  const coordinates = parseCoordinates(text('coordinates'))
  if (!coordinates) {
    toast('Posizione non valida: incolla due numeri come 46.4983, 11.2611', true)
    form.elements.coordinates.focus()
    return null
  }
  // L'Alto Adige sta più o meno tra questi numeri: fuori è quasi sempre un errore di copia.
  if ((coordinates.lat < 45.6 || coordinates.lat > 47.2 || coordinates.lng < 10.3 || coordinates.lng > 12.6)
      && !window.confirm('La posizione è fuori dall\'Alto Adige. Salvare lo stesso?')) return null
  return {
    name: text('name'),
    municipality: municipalityCode(text('municipality')),
    address: text('address'),
    ...coordinates,
    contact_name: text('contact_name'),
    contact_phone: text('contact_phone'),
    language: text('language') || 'it',
    admin_notes: text('admin_notes'),
    phone: text('phone'),
    website: text('website'),
    has_farm_shop: Boolean(data.get('has_farm_shop')),
    has_vending_24h: Boolean(data.get('has_vending_24h')),
    is_organic: Boolean(data.get('is_organic')),
    payments: ['cash', 'card'].filter((p) => data.get(p)),
    description_it: text('description_it'),
    description_de: text('description_de'),
  }
}

/** "Sono al maso": la posizione del telefono, quando si crea la scheda sul posto. */
function fillHere(form) {
  if (!navigator.geolocation) return toast('Questo browser non dà la posizione.', true)
  toast('Cerco la posizione…')
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      form.elements.coordinates.value = `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`
      toast(`Posizione presa (precisione ${Math.round(coords.accuracy)} m)`)
    },
    () => toast('Posizione non disponibile: controlla il permesso in Impostazioni › Safari › Posizione.', true),
    { enableHighAccuracy: true, timeout: 15000 },
  )
}

// Invito su WhatsApp --------------------------------------------------------------------------

/** Numero per wa.me: solo cifre con il prefisso internazionale. Un cellulare italiano senza prefisso prende il +39. */
export function whatsappNumber(phone) {
  let digits = String(phone ?? '').replace(/[^\d+]/g, '')
  if (digits.startsWith('+')) digits = digits.slice(1)
  else if (digits.startsWith('00')) digits = digits.slice(2)
  else if (/^3\d{8,9}$/.test(digits)) digits = `39${digits}`
  return digits.replace(/\D/g, '')
}

function inviteMessage(invite, link, published) {
  const name = invite.contact_name ? ` ${invite.contact_name}` : ''
  if (invite.language === 'de') {
    return published
      ? `Hallo${name}! Hier ist der neue Link, um das Profil von ${invite.name} auf Nostrano zu aktualisieren:\n\n${link}\n\nDer alte Link funktioniert nicht mehr. Der Link ist persönlich: Bitte nicht weiterleiten.`
      : `Hallo${name}! Ich schreibe dir für Nostrano, die kostenlose App, mit der man Südtiroler Höfe mit Direktverkauf findet.\n\nWir haben das Profil von ${invite.name} vorbereitet. Über diesen Link kannst du es in wenigen Minuten prüfen und ergänzen: Produkte und Preise, Öffnungszeiten, ein paar Zeilen über den Hof. Ohne Konto und ohne Passwort.\n\n${link}\n\nWenn es fertig ist, veröffentlichen wir es. Der Link ist persönlich: Bitte nicht weiterleiten.`
  }
  return published
    ? `Ciao${name}! Ecco il link nuovo per aggiornare la scheda di ${invite.name} su Nostrano:\n\n${link}\n\nQuello di prima non funziona più. Il link è personale: non inoltrarlo.`
    : `Ciao${name}! Ti scrivo per Nostrano, l'app gratuita che fa trovare i masi dell'Alto Adige che vendono direttamente.\n\nAbbiamo preparato la scheda di ${invite.name}. Da questo link puoi controllarla e completarla in pochi minuti: prodotti e prezzi, orari, due righe sul maso. Niente account e niente password.\n\n${link}\n\nQuando è pronta la pubblichiamo noi. Il link è personale: non inoltrarlo.`
}

const whatsappLink = (phone, text) => `https://wa.me/${whatsappNumber(phone)}?text=${encodeURIComponent(text)}`

async function prepareInvite() {
  const f = a.farm
  if (f.invited_at && !window.confirm('Creare un link nuovo? Quello mandato prima smette di funzionare.')) return
  await act(async () => {
    const invite = await rpc('admin_invite', { p_slug: f.slug })
    const link = `${publicUrl}/modifica/${encodeURIComponent(invite.token)}`
    const message = inviteMessage(invite, link, f.status === 'published')
    a.invite = { slug: f.slug, link, message, phone: invite.contact_phone, whatsapp: whatsappLink(invite.contact_phone, message) }
  }, 'Invito pronto: controlla il messaggio e apri WhatsApp')
}

async function copy(text) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    // Senza https (il sito di prova sulla rete Wi-Fi) gli appunti moderni non ci sono.
    const area = Object.assign(document.createElement('textarea'), { value: text })
    document.body.append(area)
    area.select()
    document.execCommand('copy')
    area.remove()
  }
  toast('Copiato')
}

// Foto ----------------------------------------------------------------------------------------

/** Rimpicciolisce a 1600 px di lato e salva in JPEG: le foto del telefono pesano troppo. */
async function shrink(file) {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
    const canvas = Object.assign(document.createElement('canvas'), {
      width: Math.round(bitmap.width * scale), height: Math.round(bitmap.height * scale),
    })
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))
    return blob ?? file
  } catch {
    return file
  }
}

async function addPhotos(files) {
  const f = a.farm
  const room = 10 - f.photos.length
  if (room <= 0) return toast('Ci sono già 10 foto: togline qualcuna.', true)
  a.uploading = true
  render()
  try {
    const urls = []
    for (const file of [...files].slice(0, room)) {
      const image = await shrink(file)
      const name = `${f.slug}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`
      urls.push(await upload('farm-photos', name, image))
    }
    a.uploading = false
    await act(() => rpc('admin_farm_save', { p_slug: f.slug, p_data: { photos: [...f.photos, ...urls] } }),
      urls.length === 1 ? 'Foto aggiunta' : `${urls.length} foto aggiunte`)
  } catch (error) {
    a.uploading = false
    render()
    toast(errorText(error), true)
  }
}

const savePhotos = (photos, success) => act(() => rpc('admin_farm_save', { p_slug: a.farm.slug, p_data: { photos } }), success)

// Tocchi e moduli -----------------------------------------------------------------------------

root.addEventListener('click', (event) => {
  const element = event.target.closest('button[data-action]')
  if (!element) return
  const { action, id, status, index, text, me } = element.dataset
  const f = a.farm
  switch (action) {
    case 'invite':
      return prepareInvite()
    case 'here':
      return fillHere(element.closest('form'))
    case 'copy':
      return copy(text)
    case 'copy-message':
      return copy(root.querySelector('[data-ref="invite-message"]').value)
    case 'status': {
      const labels = { published: 'Pubblicata: ora si vede nell\'app', hidden: 'Nascosta dall\'app', draft: 'Rimessa in bozza' }
      if (status === 'published' && f.missing.filter((m) => m !== 'consent').length
          && !window.confirm(`Manca ancora: ${f.missing.join(', ')}. Pubblicare lo stesso?`)) return
      return act(() => rpc('admin_set_status', { p_slug: f.slug, p_status: status }), labels[status])
    }
    case 'delete-farm':
      if (!window.confirm(`Eliminare la scheda di ${f.name}? Si perdono prodotti, orari e storico.`)) return
      return act(async () => {
        await rpc('admin_farm_delete', { p_slug: f.slug })
        await removeUploaded('farm-photos', f.photos)
        history.replaceState(null, '', '#/masi')
        a.route = parseRoute()
      }, 'Scheda eliminata')
    case 'photo-first': {
      const photos = [...f.photos]
      photos.unshift(...photos.splice(Number(index), 1))
      return savePhotos(photos, 'Copertina cambiata')
    }
    case 'photo-remove': {
      if (!window.confirm('Togliere questa foto dalla scheda?')) return
      const photo = f.photos[Number(index)]
      return savePhotos(f.photos.filter((_, i) => i !== Number(index)), 'Foto tolta').then(() => removeUploaded('farm-photos', [photo]))
    }
    case 'report':
      return act(() => rpc('admin_report_set', { p_id: Number(id), p_status: status }), status === 'handled' ? 'Segnata come gestita' : 'Riaperta')
    case 'personal-link':
      if (!window.confirm('Creare un link personale nuovo? Quello di prima smette di funzionare; i dispositivi già abilitati restano.')) return
      return act(async () => {
        const code = await rpc('admin_create_key', { p_label: 'Link personale' })
        a.personalLink = `${publicUrl}/admin/#link=${encodeURIComponent(code)}`
      }, 'Link personale pronto: salvalo')
    case 'device-remove':
      if (!window.confirm(me === 'true' ? 'Togliere questo browser? Per rientrare servirà un link nuovo.' : 'Togliere questo dispositivo?')) return
      return act(() => rpc('admin_device_remove', { p_user: id }), 'Accesso tolto')
  }
})

root.addEventListener('change', (event) => {
  const element = event.target
  if (element.dataset.ref === 'photos' && element.files.length) return addPhotos(element.files)
  if (element.dataset.action === 'suggestion') {
    return act(() => rpc('admin_suggestion_set', { p_id: Number(element.dataset.id), p_status: element.value }), 'Aggiornato')
  }
})

root.addEventListener('input', (event) => {
  const element = event.target
  if (element.dataset.ref === 'search') {
    a.search = element.value
    const position = element.selectionStart
    render()
    const search = root.querySelector('[data-ref="search"]')
    search.focus()
    search.setSelectionRange(position, position)
  } else if (element.dataset.ref === 'invite-message' && a.invite) {
    // Il messaggio si può ritoccare prima di mandarlo.
    a.invite.message = element.value
    a.invite.whatsapp = whatsappLink(a.invite.phone, element.value)
    root.querySelector('[data-ref="wa-link"]').href = a.invite.whatsapp
  }
})

root.addEventListener('submit', async (event) => {
  event.preventDefault()
  const form = event.target
  const data = new FormData(form)
  switch (form.dataset.form) {
    case 'new-farm': {
      const farm = farmData(form)
      if (!farm) return
      const suggestion = a.fromSuggestion
      const slug = await act(async () => {
        const created = await rpc('admin_farm_save', { p_slug: null, p_data: farm })
        if (suggestion) await rpc('admin_suggestion_set', { p_id: suggestion.id, p_status: 'contacted' })
        return created
      }, 'Bozza creata: ora prepara l\'invito su WhatsApp')
      if (slug) location.hash = `#/maso/${encodeURIComponent(slug)}`
      return
    }
    case 'farm': {
      const farm = farmData(form)
      if (farm) act(() => rpc('admin_farm_save', { p_slug: a.farm.slug, p_data: farm }), 'Dati salvati')
      return
    }
    case 'consent':
      return act(() => rpc('admin_consent', { p_slug: a.farm.slug, p_note: String(data.get('note')).trim() }), 'Consenso segnato')
    case 'approve':
      return act(() => rpc('admin_product_approve', {
        p_kind: form.dataset.kind, p_name_it: data.get('name_it'), p_name_de: data.get('name_de'),
        p_category: data.get('category'), p_unit: data.get('unit'),
      }), 'Aggiunto al catalogo comune')
    case 'merge':
      return act(() => rpc('admin_product_merge', { p_kind: form.dataset.kind, p_into: data.get('into') }), 'Prodotti uniti')
    case 'catalog-add':
      return act(() => rpc('admin_catalog_add', {
        p_name_it: data.get('name_it'), p_name_de: data.get('name_de'), p_category: data.get('category'), p_unit: data.get('unit'),
      }), 'Aggiunto al catalogo')
    case 'device': {
      const label = String(data.get('label')).trim()
      return act(async () => {
        const code = await rpc('admin_create_code', { p_label: label })
        a.newCode = { label, link: `${publicUrl}/admin/#link=${encodeURIComponent(code)}` }
      })
    }
  }
})

window.addEventListener('hashchange', show)

document.addEventListener('visibilitychange', () => {
  // Tornando sulla pagina (per esempio da WhatsApp) i dati si aggiornano, ma senza perdere un invito aperto.
  if (document.visibilityState === 'visible' && !a.busy && !a.invite && a.overview) {
    load().then(render).catch(() => {})
  }
})

/** "iPhone · Safari", "Mac · Chrome": per riconoscere i dispositivi in «Accessi». */
function deviceName() {
  const ua = navigator.userAgent
  const device = /iPhone/.test(ua) ? 'iPhone'
    : /iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) ? 'iPad'
    : /Android/.test(ua) ? 'Android' : /Macintosh/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : 'Computer'
  const browser = /Edg/.test(ua) ? 'Edge' : /CriOS|Chrome/.test(ua) ? 'Chrome' : /FxiOS|Firefox/.test(ua) ? 'Firefox'
    : /Safari/.test(ua) ? 'Safari' : 'browser'
  return `${device} · ${browser}`
}

// Avvio ---------------------------------------------------------------------------------------

async function boot() {
  root.innerHTML = views.loading()
  const code = linkCode()
  try {
    if (code) {
      await rpc('admin_claim', { p_code: code, p_device: deviceName() })
      // Il codice vale una volta sola: non deve restare nella barra degli indirizzi.
      history.replaceState(null, '', `${ROOT}admin/${location.hash.startsWith('#/') ? location.hash : ''}`)
    }
    await rpc('admin_me')
    a.catalog = await rpc('product_catalog')
  } catch (error) {
    navigation.innerHTML = ''
    root.innerHTML = error.code === 'invalid_link' ? views.invalidLink() : error.code === 'not_admin' ? views.notAdmin() : views.loading()
    if (error.code !== 'invalid_link' && error.code !== 'not_admin') toast(errorText(error), true)
    return
  }
  await show()
}

boot()
