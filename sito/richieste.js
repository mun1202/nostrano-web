// "Le mie richieste", /it/richieste/ e /de/richieste/: sono dati personali, quindi la pagina arriva vuota e si
// costruisce qui dopo l'accesso, con my_requests come l'app (RequestsView.swift). Tre schede: Da ritirare, In attesa
// e Storico; ogni card ha maso, giorno, riepilogo, stato e azioni ("Va bene" sul giorno proposto dal maso,
// Indicazioni, Chiama, Annulla finché si può, "Richiedi di nuovo"); un tocco apre il dettaglio con prodotti e prezzi di allora, nota, risposta e date.
// Si aggiorna all'apertura, quando si torna sulla pagina e ogni minuto mentre è aperta.
import {
  accettaRichieste, dataEstesa, esc, fasce, fasceTesto, giorniA, giornoDellaData, giornoRitiro, gruppoRichiesta, icona,
  istanteEsteso, maiuscola, nomeRiga, oraDi, prezzo, quantita, richiestaInBreve, richiesteDi, siPuoAnnullare,
  statoRichiesta,
} from './comune.js?v=eeaf70f043'
import { barra, foglio, mostraErrore, pagina } from './browser.js?v=eeaf70f043'
import { account, mieRichieste, segnaViste, sessioneSito } from './accedi.js?v=eeaf70f043'
import { suggerisci } from './suggerisci.js?v=eeaf70f043'

const { dati, c } = pagina('../')
const T = c.T
const $ = (id) => document.getElementById(id)
const posto = $('personale')
const masi = new Map(dati.farms.map((f) => [f.slug, f]))
const riduci = () => matchMedia('(prefers-reduced-motion: reduce)').matches
const GRUPPI = [['ritirare', T.daRitirare, T.nienteDaRitirare], ['attesa', T.inAttesa, T.nienteInAttesa], ['storico', T.storico, T.nienteStorico]]
// Lo storico si mostra a pezzi, come nell'app.
const PEZZO = 15

let lista = []
let scelta = null
let mostrati = PEZZO
let aperta = null
let caricata = false

const giornoTesto = (iso) => maiuscola(dataEstesa(giornoDellaData(iso), c))
const gruppo = (r) => gruppoRichiesta(r)

/** Lo stato in una pillola: verde per quello che va (confermata, altro giorno, ritirata), grigio il resto. */
function pillola(r) {
  const s = statoRichiesta(r)
  const g = giornoDellaData(r.other_day ?? r.day)
  const testo = s === 'other_day' ? T.altroGiorno(T.giornoBreve(g.wd, g.data.getUTCDate())) : T.statiRichiesta[s]
  const tono = ['accepted', 'other_day', 'picked_up'].includes(s) ? ' ok' : s === 'waiting' ? ' wait' : ''
  return `<span class="req-status${tono}">${esc(testo)}</span>`
}

function azioni(r) {
  const f = masi.get(r.farm)
  const parti = []
  // Il maso ha proposto un altro giorno: si conferma con un tocco, così sa che passi.
  if (statoRichiesta(r) === 'other_day' && r.other_day && giorniA(r.other_day, oraDi()) >= 0) {
    const g = giornoDellaData(r.other_day)
    parti.push(`<button class="chip-btn primary" type="button" data-va-bene="${esc(r.id)}">${icona('check')}${esc(T.vaBene(T.giornoBreve(g.wd, g.data.getUTCDate())))}</button>`)
  }
  if (f) parti.push(`<a class="chip-btn" href="https://www.google.com/maps/dir/?api=1&destination=${f.lat},${f.lng}" target="_blank" rel="noopener">${icona('route')}${esc(T.indicazioni)}</a>`)
  if (f?.phone) parti.push(`<a class="chip-btn" href="tel:${esc(f.phone)}">${icona('phone')}${esc(T.chiama)}</a>`)
  if (siPuoAnnullare(r)) {
    parti.push(`<button class="chip-btn" type="button" data-annulla="${esc(r.id)}">${icona('x')}${esc(T.annullaRichiesta)}</button>`)
  } else if (f && accettaRichieste(f)) {
    const righe = (r.lines ?? []).filter((x) => x.kind).map((x) => `${x.kind}:${Number(x.quantity)}`).join(',')
    parti.push(`<a class="chip-btn" href="${esc(`../produttori/${encodeURIComponent(r.farm)}/?richiedi=${encodeURIComponent(righe)}`)}">${icona('repeat')}${esc(T.richiediDiNuovo)}</a>`)
  }
  return `<div class="req-actions">${parti.join('')}</div>`
}

const nomeMaso = (r) => masi.get(r.farm)?.name ?? r.farm_name ?? r.farm

function card(r) {
  const daRitirare = gruppo(r) === 'ritirare'
  return `<article class="req-card" data-id="${esc(r.id)}">
      <button class="req-open" type="button" data-dettaglio="${esc(r.id)}" aria-haspopup="dialog">
        <span class="req-head"><strong>${esc(nomeMaso(r))}</strong>${pillola(r)}</span>
        <span class="req-day${daRitirare ? ' ok' : ''}">${esc(giornoTesto(giornoRitiro(r)))}</span>
        <span class="req-summary">${esc(richiestaInBreve(r, c))}</span>
        ${r.reply ? `<span class="req-reply">${esc(T.virgolette(r.reply))}</span>` : ''}
      </button>
      ${azioni(r)}
    </article>`
}

function riga(r) {
  return `<li><button class="req-row" type="button" data-dettaglio="${esc(r.id)}" aria-haspopup="dialog">
      <span><strong>${esc(nomeMaso(r))}</strong><small>${esc(`${giornoTesto(giornoRitiro(r))} · ${richiestaInBreve(r, c)}`)}</small></span>
      ${pillola(r)}${icona('chevron-right')}
    </button></li>`
}

function contenuto(g) {
  const richieste = richiesteDi(g, lista)
  const vuoto = GRUPPI.find(([x]) => x === g)[2]
  if (!richieste.length) return `<p class="req-empty">${esc(vuoto)}</p>`
  if (g !== 'storico') return `<div class="req-cards">${richieste.map(card).join('')}</div>`
  return `<ul class="req-history">${richieste.slice(0, mostrati).map(riga).join('')}</ul>${richieste.length > mostrati
    ? `<button class="link-btn req-more" type="button" data-altre>${esc(T.mostraAltre(richieste.length - mostrati))}</button>` : ''}`
}

function disegna({ anima = false } = {}) {
  const s = sessioneSito()
  if (!s?.attiva) {
    posto.innerHTML = `<div class="empty-state">
        <span class="empty-icon">${icona('bag')}</span>
        <h2>${esc(T.accediRichieste)}</h2>
        <p>${esc(T.accediRichiesteTesto)}</p>
        <button class="btn primary" type="button" data-accedi aria-haspopup="dialog">${esc(T.accedi)}</button>
      </div>`
    return
  }
  if (!caricata) {
    posto.innerHTML = `<p class="req-loading" aria-busy="true">${esc(T.controllo)}</p>`
    return
  }
  if (!lista.length) {
    posto.innerHTML = `<div class="empty-state">
        <span class="empty-icon">${icona('bag')}</span>
        <h2>${esc(T.nessunaRichiesta)}</h2>
        <p>${esc(T.nessunaRichiestaTesto)}</p>
        <a class="btn primary" href="../">${icona('search')}${esc(T.cercaUnMaso)}</a>
      </div>`
    return
  }
  // Senza una scelta si parte dalla prima scheda che ha qualcosa.
  const g = scelta ?? GRUPPI.map(([x]) => x).find((x) => richiesteDi(x, lista).length) ?? 'storico'
  const conti = { ritirare: richiesteDi('ritirare', lista).length, attesa: richiesteDi('attesa', lista).length }
  const fuoco = document.activeElement?.closest?.('[role="tab"]')?.dataset.gruppo
  posto.innerHTML = `<p class="report-error" id="richieste-errore" role="alert" hidden></p>
    <div class="req-tabs" role="tablist" aria-label="${esc(T.leMieRichieste)}">
      <span class="req-pill" aria-hidden="true"></span>
      ${GRUPPI.map(([x, nome]) => `<button role="tab" type="button" id="scheda-${x}" data-gruppo="${x}" aria-selected="${x === g}" aria-controls="richieste-elenco" tabindex="${x === g ? 0 : -1}">${esc(nome)}${conti[x] ? `<span class="count">${conti[x]}</span>` : ''}</button>`).join('')}
    </div>
    <div class="req-panel" id="richieste-elenco" role="tabpanel" aria-labelledby="scheda-${g}">${contenuto(g)}</div>`
  posizionaPillola(false)
  if (fuoco) posto.querySelector(`[data-gruppo="${fuoco}"]`)?.focus()
  // L'elenco della scheda nuova entra in 160 ms; con Riduci movimento solo la dissolvenza.
  if (anima) {
    $('richieste-elenco').animate(riduci() ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }], { duration: 160, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' })
  }
}

/**
 * La pillola bianca sotto la scheda scelta (le tre schede sono larghe uguali): scorre in 200 ms con il mouse,
 * da tastiera si sposta subito.
 */
function posizionaPillola(scorri, prima = null) {
  const pillola = posto.querySelector('.req-pill')
  const scelta = posto.querySelector('[role="tab"][aria-selected="true"]')
  if (!pillola || !scelta) return
  const verso = `translateX(${scelta.offsetLeft}px)`
  pillola.style.width = `${scelta.offsetWidth}px`
  pillola.style.transform = verso
  if (scorri && prima && prima !== verso && !riduci()) {
    pillola.animate([{ transform: prima }, { transform: verso }], { duration: 200, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' })
  }
}

function scegli(g, { tastiera = false } = {}) {
  const prima = posto.querySelector('.req-pill')?.style.transform ?? null
  scelta = g
  mostrati = PEZZO
  disegna({ anima: !tastiera })
  posizionaPillola(!tastiera, prima)
  posto.querySelector(`[data-gruppo="${g}"]`)?.focus()
}

// Il dettaglio ----------------------------------------------------------------------------------

function dettaglio(r) {
  const f = masi.get(r.farm)
  const s = statoRichiesta(r)
  const g = giornoDellaData(giornoRitiro(r))
  const ore = f ? fasce(f, g) : []
  const spiega = s === 'waiting' ? T.spiegazioni.waiting(istanteEsteso(r.expires_at, c)) : T.spiegazioni[s]
  const righe = (r.lines ?? []).map((x) => {
    const pr = x.price_min != null ? prezzo({ price_min: Number(x.price_min), price_max: x.price_max != null ? Number(x.price_max) : null, price_quantity: x.price_quantity, price_unit: x.unit }, c) : ''
    return `<li><span>${esc(nomeRiga(x, c))}${pr ? `<small>${esc(pr)}</small>` : ''}</span><strong>${esc(quantita(Number(x.quantity), x.unit, c))}</strong></li>`
  }).join('')
  return `<p class="request-farm">${f ? `<a href="../produttori/${encodeURIComponent(r.farm)}/"><strong>${esc(nomeMaso(r))}</strong></a>` : `<strong>${esc(nomeMaso(r))}</strong>`}</p>
    <div class="detail-status">${pillola(r)}<p>${esc(spiega)}</p></div>
    <section><h3>${esc(T.quandoPassiTitolo)}</h3>
      <p class="strong">${esc(giornoTesto(giornoRitiro(r)))}</p>
      ${ore.length ? `<p class="muted">${esc(T.apertoOre(fasceTesto(ore, c)))}</p>` : ''}
      ${s === 'other_day' ? `<p class="muted small">${esc(T.aveviChiesto(giornoTesto(r.day)))}</p>` : ''}
    </section>
    ${righe ? `<section><h3>${esc(T.cosaChiesto)}</h3><ul class="detail-lines">${righe}</ul><p class="muted small">${esc(T.prezziAllora)}</p></section>` : ''}
    ${r.note ? `<section><h3>${esc(T.tuaNota)}</h3><p class="quote">${esc(T.virgolette(r.note))}</p></section>` : ''}
    ${r.reply ? `<section><h3>${esc(T.rispostaMaso)}</h3><p class="quote">${esc(T.virgolette(r.reply))}</p></section>` : ''}
    <p class="muted small">${esc(T.inviataIl(istanteEsteso(r.created_at, c)))}${r.answered_at ? `<br>${esc(T.rispostaIl(istanteEsteso(r.answered_at, c)))}` : ''}</p>
    ${azioni(r)}`
}

function apriDettaglio(id) {
  const r = lista.find((x) => x.id === id)
  if (!r) return
  aperta = id
  $('dettaglio-corpo').innerHTML = dettaglio(r)
  if (!$('dettaglio').open) $('dettaglio').showModal()
}

// Annulla, con la domanda prima -----------------------------------------------------------------

let daAnnullare = null
function chiediAnnulla(id) {
  daAnnullare = id
  $('conferma-si').disabled = false
  // showModal mette già il focus su «Tienila», il primo pulsante: spostarlo a mano accendeva il bordo della tastiera.
  $('conferma').showModal()
}

async function annulla() {
  const id = daAnnullare
  if (!id) return
  $('conferma-si').disabled = true
  let riuscito = true
  try {
    await sessioneSito().rpc('request_cancel', { p_id: id })
  } catch {
    riuscito = false
  }
  $('conferma').close()
  await carica()
  if (!riuscito && $('richieste-errore')) mostraErrore($('richieste-errore'), T.erroreRete)
}

// "Va bene" sul giorno proposto: niente domanda prima, si può sempre annullare dopo.
async function vaBene(bottone) {
  bottone.disabled = true
  let riuscito = true
  try {
    await sessioneSito().rpc('request_accept_other_day', { p_id: bottone.dataset.vaBene })
  } catch {
    riuscito = false
  }
  await carica()
  if (!riuscito && $('richieste-errore')) mostraErrore($('richieste-errore'), T.erroreRete)
}

// Caricamento: all'apertura, tornando sulla pagina, ogni minuto ---------------------------------

async function carica() {
  const s = sessioneSito()
  if (!s?.attiva) {
    caricata = false
    lista = []
    return disegna()
  }
  try {
    lista = await mieRichieste({ ricarica: true })
    caricata = true
    disegna()
    if (aperta && $('dettaglio').open) apriDettaglio(aperta)
    // Visto quello che c'è: il pallino nell'intestazione si spegne.
    if (!document.hidden) segnaViste(lista)
  } catch (e) {
    if (e.codice === 'not_signed_in') return carica()
    if (!caricata) {
      posto.innerHTML = `<div class="empty-state"><p>${esc(T.erroreRete)}</p><button class="btn" type="button" data-riprova>${icona('repeat')}${esc(T.riprova)}</button></div>`
    }
  }
}

barra()
suggerisci()
account()
posto.addEventListener('click', (e) => {
  const tab = e.target.closest('[role="tab"]')
  if (tab) return scegli(tab.dataset.gruppo, { tastiera: e.detail === 0 })
  if (e.target.closest('[data-altre]')) {
    mostrati += PEZZO
    return disegna()
  }
  if (e.target.closest('[data-riprova]')) return carica()
})
posto.addEventListener('keydown', (e) => {
  const tab = e.target.closest('[role="tab"]')
  if (!tab || !['ArrowLeft', 'ArrowRight'].includes(e.key)) return
  e.preventDefault()
  const gruppi = GRUPPI.map(([x]) => x)
  const i = gruppi.indexOf(tab.dataset.gruppo) + (e.key === 'ArrowRight' ? 1 : -1)
  scegli(gruppi[(i + gruppi.length) % gruppi.length], { tastiera: true })
})
document.addEventListener('click', (e) => {
  const d = e.target.closest('[data-dettaglio]')
  if (d) return apriDettaglio(d.dataset.dettaglio)
  const a = e.target.closest('[data-annulla]')
  if (a) return chiediAnnulla(a.dataset.annulla)
  const v = e.target.closest('[data-va-bene]')
  if (v) return vaBene(v)
})
$('dettaglio-chiudi').addEventListener('click', () => $('dettaglio').close())
$('dettaglio').addEventListener('close', () => { aperta = null })
foglio($('dettaglio'), $('dettaglio-maniglia'))
$('conferma-no').addEventListener('click', () => $('conferma').close())
$('conferma-si').addEventListener('click', annulla)
$('conferma').addEventListener('click', (e) => { if (e.target === $('conferma')) $('conferma').close() })
sessioneSito()?.ascolta(() => {
  caricata = false
  carica()
})
addEventListener('resize', () => posizionaPillola(false))
carica()
setInterval(() => { if (!document.hidden) carica() }, 60_000)
document.addEventListener('visibilitychange', () => { if (!document.hidden) carica() })
