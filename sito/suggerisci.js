// "Suggerisci un maso", su ogni pagina con il piè di pagina: come "Segnala un maso" nell'app (suggestion_create),
// con lo stesso accesso anonimo chiesto solo al momento dell'invio. Il pannello lo scrive il generatore
// (web/genera/pagine.mjs) con indirizzo del progetto e chiave publishable; i bottoni hanno data-suggerisci.
import { chiamaAnonimo, foglio, mostraErrore } from './browser.js?v=dc65e12611'
import { TESTI } from './testi.js?v=dc65e12611'

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

  // Inviti e bottoni compaiono solo con il JavaScript, che apre il pannello.
  for (const el of document.querySelectorAll('[data-invito]')) el.hidden = false
  for (const b of document.querySelectorAll('[data-suggerisci]')) {
    b.addEventListener('click', () => {
      // Ogni volta un modulo pulito, anche dopo un invio.
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
    mostraErrore(errore, '')
    invia.disabled = true
    invia.textContent = T.invio
    try {
      await chiamaAnonimo(progetto, 'suggestion_create', {
        p_name: nome, p_place: campo('paese', 120), p_products: campo('prodotti', 500), p_contact: campo('contatto', 200) || null,
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
