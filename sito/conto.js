// "Il tuo account", /it/account/ e /de/account/: l'email, da quando c'è l'account, Esci ed "Elimina account".
// Prima di eliminare, una domanda che dice che cosa si cancella (con i numeri dell'account, da account_info).
// account_delete cancella tutto sul server, senza chiavi segrete nel browser; poi qui si esce e basta.
import { dataEstesa, esc, giornoDellaData, icona, oraDi } from './comune.js?v=eeaf70f043'
import { barra, mostraErrore } from './browser.js?v=eeaf70f043'
import { account, sessioneSito } from './accedi.js?v=eeaf70f043'
import { suggerisci } from './suggerisci.js?v=eeaf70f043'
import { TESTI } from './testi.js?v=eeaf70f043'

const lang = document.documentElement.lang === 'de' ? 'de' : 'it'
const T = TESTI[lang]
const c = { lang, T, kinds: {} }
const $ = (id) => document.getElementById(id)
const posto = $('personale')
let info = null
let eliminato = false

function disegna() {
  const s = sessioneSito()
  if (eliminato) {
    posto.innerHTML = `<div class="empty-state">
        <span class="empty-icon">${icona('check')}</span>
        <h2 tabindex="-1">${esc(T.accountEliminato)}</h2>
        <p>${esc(T.accountEliminatoTesto)}</p>
        <a class="btn" href="../">${esc(T.cercaUnMaso)}</a>
      </div>`
    return
  }
  if (!s?.attiva) {
    posto.innerHTML = `<div class="empty-state">
        <span class="empty-icon">${icona('user')}</span>
        <h2>${esc(T.accediAccount)}</h2>
        <p>${esc(T.accediPerche)}</p>
        <button class="btn primary" type="button" data-accedi aria-haspopup="dialog">${esc(T.accedi)}</button>
      </div>`
    return
  }
  const email = info?.email ?? s.email
  const dal = info?.created_at ? dataEstesa(giornoDellaData(dataDi(info.created_at)), c) : ''
  posto.innerHTML = `<section class="account-card">
      <p class="account-label">${esc(T.accountEmail)}</p>
      <p class="account-value">${esc(email)}</p>
      ${dal ? `<p class="muted small">${esc(T.accountDal(dal))}</p>` : ''}
      <p>${esc(T.accountServe)}</p>
      <div class="account-actions">
        <a class="btn" href="../richieste/">${icona('bag')}${esc(T.leMieRichieste)}</a>
        <button class="btn" type="button" data-esci>${icona('logout')}${esc(T.esci)}</button>
      </div>
    </section>
    <section class="account-delete">
      <h2>${esc(T.eliminaAccount)}</h2>
      <p class="muted">${esc(T.eliminaSpiega)}</p>
      <button class="btn" type="button" id="elimina">${icona('trash')}${esc(T.eliminaAccount)}</button>
    </section>`
}

// La data (a Roma) di un istante, come "2026-10-29".
function dataDi(istante) {
  const o = oraDi(new Date(istante))
  return `${o.y}-${String(o.m).padStart(2, '0')}-${String(o.d).padStart(2, '0')}`
}

async function carica() {
  const s = sessioneSito()
  info = null
  disegna()
  if (!s?.attiva) return
  try {
    info = await s.rpc('account_info')
    disegna()
  } catch { /* resta l'email della sessione */ }
}

function chiediElimina() {
  const r = Number(info?.requests ?? 0)
  const p = Number(info?.favorites ?? 0)
  $('elimina-testo').textContent = T.eliminaCosa(r, p)
  mostraErrore($('elimina-errore'), '')
  $('elimina-si').disabled = false
  // showModal mette già il focus su «Tienilo», il primo pulsante: spostarlo a mano accendeva il bordo della tastiera.
  $('conferma-elimina').showModal()
}

async function elimina() {
  const s = sessioneSito()
  $('elimina-si').disabled = true
  try {
    await s.rpc('account_delete')
    eliminato = true
    $('conferma-elimina').close()
    // Sul server non c'è più: qui si dimentica la sessione e la pagina lo dice.
    s.dimentica()
    disegna()
    posto.querySelector('h2')?.focus()
  } catch {
    mostraErrore($('elimina-errore'), T.erroreRete)
    $('elimina-si').disabled = false
  }
}

barra()
suggerisci()
account()
carica()
sessioneSito()?.ascolta(() => { if (!eliminato) carica() })
posto.addEventListener('click', (e) => { if (e.target.closest('#elimina')) chiediElimina() })
$('elimina-no').addEventListener('click', () => $('conferma-elimina').close())
$('elimina-si').addEventListener('click', elimina)
$('conferma-elimina').addEventListener('click', (e) => { if (e.target === $('conferma-elimina')) $('conferma-elimina').close() })
