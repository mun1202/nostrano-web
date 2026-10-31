// "I tuoi preferiti", /it/preferiti/ e /de/preferiti/: i masi salvati con il cuore, in una pagina loro (prima erano
// la home con il filtro "Preferiti"). Senza account stanno nel browser; con l'account anche sul server (accedi.js), e
// quando arrivano la pagina si rifà. Un cuore tolto lascia la scheda finché la pagina non si rifà: un tocco per
// sbaglio si rimedia toccando di nuovo, come nella home.
import { esc, icona, scheda } from './comune.js?v=4c1a21cc08'
import { barra, pagina } from './browser.js?v=4c1a21cc08'
import { account, sessioneSito } from './accedi.js?v=4c1a21cc08'
import { mostraCuori, preferiti, toccaCuore } from './preferiti.js?v=4c1a21cc08'
import { suggerisci } from './suggerisci.js?v=4c1a21cc08'

const { dati, c } = pagina('../')
const T = c.T
const $ = (id) => document.getElementById(id)
const posto = $('personale')
const pref = preferiti()
c.preferiti = pref?.set ?? new Set()

function disegna() {
  $('preferiti-dove').textContent = !pref ? T.preferitiNo : sessioneSito()?.attiva ? T.preferitiInAccount : T.preferitiInBrowser
  // Contano solo i masi che ci sono ancora: uno tolto da Il mio contadino resta salvato (può tornare) ma non si vede.
  const masi = dati.farms.filter((f) => c.preferiti.has(f.slug)).sort((a, b) => a.name.localeCompare(b.name, c.lang))
  if (!masi.length) {
    posto.innerHTML = `<div class="empty-state">
        <span class="empty-icon">${icona('heart')}</span>
        <h2>${esc(T.preferitiNessuno)}</h2>
        <p>${esc(T.preferitiNessunoTesto)}</p>
        <a class="btn primary" href="${esc(c.base)}">${esc(T.vediTuttiIMasi)}</a>
      </div>`
    return
  }
  posto.innerHTML = `<ul class="farms grid" id="elenco">${masi.map((f, i) => scheda(f, i, c, { da: dati.zona })).join('')}</ul>`
  mostraCuori(posto, pref)
}

barra()
suggerisci()
account()
disegna()
posto.addEventListener('click', (e) => toccaCuore(e, pref))
// I preferiti dell'account arrivano dopo l'accesso; anche entrando o uscendo cambia la riga sotto il titolo.
document.addEventListener('preferiti-cambiati', disegna)
sessioneSito()?.ascolta(disegna)
