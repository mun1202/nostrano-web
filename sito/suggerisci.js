// "Suggerisci un maso", su ogni pagina con il piè di pagina: come "Segnala un maso" nell'app (suggestion_create),
// con lo stesso accesso anonimo chiesto solo al momento dell'invio. Il pannello lo scrive il generatore
// (web/genera/pagine.mjs) con indirizzo del progetto e chiave publishable; i bottoni hanno data-suggerisci.
import { chiamaAnonimo, foglio, mostraErrore } from './browser.js?v=8dc1905cd3'
import { cercaIndirizzo } from './indirizzo.js?v=8dc1905cd3'
import { mappaPunto } from './punto.js?v=8dc1905cd3'
import { esc } from './comune.js?v=8dc1905cd3'
import { TESTI } from './testi.js?v=8dc1905cd3'

export function suggerisci() {
  const pannello = document.getElementById('suggerisci')
  if (!pannello) return
  const T = TESTI[document.documentElement.lang === 'de' ? 'de' : 'it']
  const $ = (id) => document.getElementById(id)
  const modulo = $('suggerisci-modulo')
  const errore = $('suggerisci-errore')
  const invia = $('suggerisci-invia')
  const progetto = { url: pannello.dataset.url, key: pannello.dataset.key }
  const email = pannello.dataset.email ?? ''
  const contatto = modulo.elements.contatto
  const lang = document.documentElement.lang === 'de' ? 'de' : 'it'
  // "Chiedi il tuo link": è il produttore a scrivere, e senza numero non sapremmo dove mandarglielo.
  let dalMaso = false
  // "Dove sta il maso": i luoghi trovati, quello scelto (con il punto confermato) e la piccola mappa.
  let trovati = []
  let luogo = null
  let mappa = null
  const scrivi = (id, testo) => { $(id).textContent = testo }
  function modo(maso) {
    dalMaso = maso
    scrivi('t-suggerisci', maso ? T.chiediLink : T.suggerisci)
    scrivi('suggerisci-sub', maso ? T.chiediLinkTesto : T.suggerisciTesto)
    scrivi('suggerisci-vende', maso ? T.cosaVendi : T.cosaVende)
    scrivi('suggerisci-contatto', maso ? T.numeroWhatsApp : T.contattoFacoltativo)
    scrivi('suggerisci-contatto-nota', maso ? T.numeroWhatsAppNota : T.contattoSuggerimento)
    scrivi('suggerisci-fatto-titolo', maso ? T.grazieLink : T.grazieSuggerimento)
    scrivi('suggerisci-fatto-testo', maso ? T.grazieLinkTesto : T.grazieSuggerimentoTesto)
    contatto.type = maso ? 'tel' : 'text'
    contatto.autocomplete = maso ? 'tel' : 'email'
    contatto.required = maso
    $('suggerisci-dove').hidden = !maso
  }

  // Dove sta il maso ---------------------------------------------------------------------------------

  function svuotaDove() {
    trovati = []
    luogo = null
    $('suggerisci-risultati').innerHTML = ''
    $('suggerisci-mappa').hidden = true
    scrivi('suggerisci-dove-nota', T.doveNota)
  }

  async function trova() {
    const q = modulo.elements.cerca.value.trim()
    if (q.length < 3) return modulo.elements.cerca.focus()
    const box = $('suggerisci-risultati')
    box.innerHTML = `<p class="sub">${esc(T.doveCerco)}</p>`
    try {
      trovati = await cercaIndirizzo(q, lang)
      box.innerHTML = trovati.length
        ? trovati.map((r, i) => `<button class="dove-luogo" type="button" data-luogo="${i}" aria-pressed="false">${esc(r.etichetta)}</button>`).join('')
        : `<p class="sub">${esc(T.doveNessuno)}</p>`
    } catch (e) {
      box.innerHTML = `<p class="sub">${esc(e.message === 'too_many' ? T.doveTroppe : T.doveErrore)}</p>`
    }
  }

  async function scegli(i) {
    const r = trovati[i]
    if (!r) return
    luogo = { indirizzo: r.indirizzo, lat: r.lat, lng: r.lng }
    if (r.comune) modulo.elements.paese.value = r.comune
    for (const b of $('suggerisci-risultati').querySelectorAll('[data-luogo]')) b.setAttribute('aria-pressed', String(b.dataset.luogo === String(i)))
    // La mappa per confermare il punto, se il sito la ha; senza, vale il punto trovato.
    if (!pannello.dataset.tessere) return
    const box = $('suggerisci-mappa')
    box.hidden = false
    scrivi('suggerisci-dove-nota', T.doveControlla)
    if (mappa) return mappa.then((m) => m.vai(luogo))
    mappa = mappaPunto({
      contenitore: box,
      cartina: { tessere: pannello.dataset.tessere, font: pannello.dataset.font, libreria: pannello.dataset.libreria },
      lang,
      punto: luogo,
      sposta: (p) => { if (luogo) Object.assign(luogo, p) },
    })
    mappa.catch(() => { box.hidden = true; mappa = null })
  }

  $('suggerisci-trova').addEventListener('click', trova)
  // Invio nella ricerca cerca, senza mandare il modulo.
  modulo.elements.cerca.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    trova()
  })
  $('suggerisci-risultati').addEventListener('click', (e) => {
    const b = e.target.closest('[data-luogo]')
    if (b) scegli(Number(b.dataset.luogo))
  })

  // Inviti e bottoni compaiono solo con il JavaScript, che apre il pannello.
  for (const el of document.querySelectorAll('[data-invito]')) el.hidden = false
  for (const b of document.querySelectorAll('[data-suggerisci]')) {
    b.addEventListener('click', () => {
      // Ogni volta un modulo pulito, anche dopo un invio.
      modo(b.dataset.suggerisci === 'maso')
      svuotaDove()
      modulo.hidden = false
      $('suggerisci-fatto').hidden = true
      invia.hidden = false
      invia.disabled = false
      invia.textContent = T.invia
      $('suggerisci-annulla').textContent = T.annulla
      mostraErrore(errore, '')
      pannello.showModal()
      modulo.elements.nome.focus()
    })
  }
  modulo.addEventListener('submit', async (e) => {
    e.preventDefault()
    const campo = (nome, max) => modulo.elements[nome].value.trim().slice(0, max)
    const nome = campo('nome', 120)
    if (!nome) {
      mostraErrore(errore, T.scriviNome)
      return modulo.elements.nome.focus()
    }
    const numero = campo('contatto', 200)
    if (dalMaso && !numero) {
      mostraErrore(errore, T.scriviNumero)
      return contatto.focus()
    }
    mostraErrore(errore, '')
    invia.disabled = true
    invia.textContent = T.invio
    try {
      await chiamaAnonimo(progetto, 'suggestion_create', {
        p_name: nome, p_place: campo('paese', 120), p_products: campo('prodotti', 500), p_contact: numero || null,
        ...(dalMaso ? { p_from_farm: true } : {}),
        ...(dalMaso && luogo ? { p_address: luogo.indirizzo || null, p_lat: luogo.lat, p_lng: luogo.lng } : {}),
      })
      modulo.reset()
      modulo.hidden = true
      invia.hidden = true
      $('suggerisci-fatto').hidden = false
      $('suggerisci-annulla').textContent = T.chiudi
    } catch {
      mostraErrore(errore, T.erroreInvio(email), email)
      invia.disabled = false
      invia.textContent = T.invia
    }
  })
  $('suggerisci-annulla').addEventListener('click', () => pannello.close())
  $('suggerisci-chiudi').addEventListener('click', () => pannello.close())
  foglio(pannello, $('suggerisci-maniglia'))
}
