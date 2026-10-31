// "Suggerisci un maso", su ogni pagina con il piè di pagina: come "Segnala un maso" nell'app (suggestion_create),
// con lo stesso accesso anonimo chiesto solo al momento dell'invio. Il pannello lo scrive il generatore
// (web/genera/pagine.mjs) con indirizzo del progetto e chiave publishable; i bottoni hanno data-suggerisci.
import { chiamaAnonimo, foglio, mostraErrore } from './browser.js?v=da1cc59c62'
import { sceltaLuogo } from './luogo.js?v=da1cc59c62'
import { TESTI } from './testi.js?v=da1cc59c62'

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
  // "Dove sta il maso": il luogo confermato (cerca, conferma, fatto: web/sito/luogo.js).
  let luogo = null
  let scelta = null
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
  // Un riquadro nuovo a ogni apertura; confermato l'indirizzo, il campo del paese non serve più.
  function nuovoLuogo() {
    scelta?.togli()
    luogo = null
    $('suggerisci-paese').hidden = false
    if (!dalMaso) return
    scelta = sceltaLuogo({
      contenitore: $('suggerisci-luogo'),
      testi: T.luogo,
      lang,
      classi: { primario: 'btn primary small', secondario: 'btn small', link: 'link-btn' },
      cartina: pannello.dataset.tessere
        ? { tessere: pannello.dataset.tessere, font: pannello.dataset.font, libreria: pannello.dataset.libreria }
        : null,
      cambia: (l) => {
        luogo = l
        modulo.elements.paese.value = l.comune
        $('suggerisci-paese').hidden = true
      },
    })
  }

  for (const el of document.querySelectorAll('[data-invito]')) el.hidden = false
  for (const b of document.querySelectorAll('[data-suggerisci]')) {
    b.addEventListener('click', () => {
      // Ogni volta un modulo pulito, anche dopo un invio.
      modo(b.dataset.suggerisci === 'maso')
      nuovoLuogo()
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
