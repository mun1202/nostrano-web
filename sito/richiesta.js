// "Tienimeli da parte" dalla scheda del maso, come nell'app (RequestComposer.swift): ogni prodotto disponibile ha
// un "+" che diventa − quantità + nell'unità del prodotto; con almeno un prodotto la barra in basso del telefono
// diventa "Tienimeli da parte · N prodotti" (sul computer il bottone sta nella scheda laterale). Il pannello si apre
// già compilato: righe, i soli giorni di apertura (con chiusure e giorni pieni), il nome, la nota se serve.
// Per inviare serve l'account: senza, "Invia richiesta" apre prima l'accesso e poi manda, senza perdere niente.
// Prima di aprire si rileggono dal database (get_farm) richieste accese, prodotti e giorni pieni: la pagina può
// essere di un'ora fa. I limiti (tre in attesa per maso, dieci in tutto) li controlla il server.
import {
  accettaRichieste, dataEstesa, esc, fasceTesto, fasce, giorniRichiesta, icona, maiuscola, nomeProdotto, passo, prezzo,
  quantita, unitaDi,
} from './comune.js?v=4c1a21cc08'
import { adesso, foglio, mostraErrore } from './browser.js?v=4c1a21cc08'
import { apriAccesso, mieRichieste, progetto, sessioneSito } from './accedi.js?v=4c1a21cc08'
import { rpcPubblica } from './sessione.js?v=4c1a21cc08'

// La bozza resta in questa scheda del browser mentre si accede: se la pagina si ricarica (per esempio passando
// all'app della posta per il codice), si ritrova com'era.
const BOZZA = 'nostrano.bozza-richiesta'
const $ = (id) => document.getElementById(id)
const numero = (v) => (v === null || v === undefined || v === '' ? null : Number(v))
const arrotonda = (n) => Math.round(n * 100) / 100

export function richiesta(f, c) {
  const pannello = $('richiesta')
  if (!pannello || !accettaRichieste(f) || !progetto()) return
  const T = c.T
  const modulo = $('richiesta-modulo')
  const errore = $('richiesta-errore')
  const invia = $('richiesta-invia')
  const nota = modulo.elements.nota
  const carrello = new Map()
  let scheda = f
  let fresca = null
  let righe = []
  let giornoScelto = null
  let inviando = false

  // Un annuncio per chi usa un lettore di schermo: le quantità cambiano senza che il fuoco si sposti.
  const annuncio = document.createElement('span')
  annuncio.className = 'sr'
  annuncio.setAttribute('role', 'status')
  document.body.append(annuncio)

  const disponibili = () => scheda.products.filter((p) => p.available)
  const prodotto = (kind) => disponibili().find((p) => p.kind === kind)
  const nome = (kind) => nomeProdotto(kind, c)

  const stepper = (kind, q, nella) => {
    const p = prodotto(kind)
    const meno = `<button class="qty-btn" type="button" data-meno="${esc(kind)}" data-dove="${nella}" aria-label="${esc(T.menoDi(nome(kind)))}">${icona('minus')}</button>`
    const piu = `<button class="qty-btn${q ? '' : ' qty-plus'}" type="button" data-piu="${esc(kind)}" data-dove="${nella}" aria-label="${esc(T.piuDi(nome(kind)))}">${icona('plus')}</button>`
    return q ? `${meno}<span class="qty-val">${esc(quantita(q, unitaDi(p, c), c))}</span>${piu}` : piu
  }

  // Nella lista dei prodotti: "+" oppure − quantità +. Il fuoco resta sul bottone che si stava usando.
  function disegnaProdotto(kind) {
    const el = document.querySelector(`#prodotti [data-qty="${CSS.escape(kind)}"]`)
    if (!el) return
    const q = carrello.get(kind) ?? 0
    const fuoco = el.contains(document.activeElement) ? (document.activeElement.dataset.meno !== undefined && q ? 'meno' : 'piu') : null
    el.classList.toggle('scelto', q > 0)
    el.innerHTML = stepper(kind, q, 'lista')
    if (fuoco) el.querySelector(`[data-${fuoco}]`)?.focus()
  }

  function barraRichiesta() {
    const n = carrello.size
    for (const el of document.querySelectorAll('[data-etichetta-richiesta]')) el.textContent = n ? T.tienimeliN(n) : T.tienimeli
    const bottone = $('tienimeli-barra')
    // Al primo prodotto il bottone entra (160 ms, solo dissolvenza con Riduci movimento); dopo cambia solo il numero.
    if (bottone.hidden && n > 0) {
      bottone.hidden = false
      bottone.animate(matchMedia('(prefers-reduced-motion: reduce)').matches
        ? [{ opacity: 0 }, { opacity: 1 }]
        : [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 160, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' })
    }
    bottone.hidden = n === 0
    // Con una richiesta in corso il bottone scuro è uno solo: Indicazioni diventa chiaro.
    for (const el of document.querySelectorAll('.action-bar, .side-card')) el.classList.toggle('con-richiesta', n > 0)
    $('richiesta-lato')?.querySelector('.btn').classList.toggle('primary', n > 0)
  }

  function cambia(kind, verso) {
    const p = prodotto(kind)
    if (!p) return
    const q = arrotonda((carrello.get(kind) ?? 0) + verso * passo(p, c))
    if (q > 0.001) carrello.set(kind, q)
    else carrello.delete(kind)
    disegnaProdotto(kind)
    barraRichiesta()
    annuncio.textContent = q > 0.001 ? `${nome(kind)}: ${quantita(q, unitaDi(p, c), c)}` : T.togliProdotto(nome(kind))
  }

  // Il pannello -------------------------------------------------------------------------------

  function disegnaRighe() {
    const lista = $('richiesta-righe')
    const fuoco = lista.contains(document.activeElement)
      ? { kind: document.activeElement.dataset.meno ?? document.activeElement.dataset.piu, tipo: document.activeElement.dataset.meno !== undefined ? 'meno' : 'piu' }
      : null
    lista.innerHTML = righe.map(({ kind, quantity }) => {
      const p = prodotto(kind)
      const prezzoOra = p ? prezzo(p, c) : ''
      return `<li class="request-line" data-riga="${esc(kind)}">
        <span class="rl-name"><strong>${esc(nome(kind))}</strong>${prezzoOra ? `<small>${esc(prezzoOra)}</small>` : ''}</span>
        <span class="rl-controls"><span class="qty scelto">${stepper(kind, quantity, 'pannello')}</span>
        <button class="icon-btn rl-x" type="button" data-togli="${esc(kind)}" aria-label="${esc(T.togliProdotto(nome(kind)))}">${icona('x')}</button></span>
      </li>`
    }).join('')
    if (fuoco?.kind) (lista.querySelector(`[data-riga="${CSS.escape(fuoco.kind)}"] [data-${fuoco.tipo}]`) ?? lista.querySelector('[data-togli]') ?? $('richiesta-aggiungi'))?.focus()
    const resto = disponibili().filter((p) => !righe.some((r) => r.kind === p.kind))
    $('richiesta-aggiungi').innerHTML = `<option value="">${esc(T.aggiungiAltro)}</option>${resto.map((p) => {
      const pr = prezzo(p, c)
      return `<option value="${esc(p.kind)}">${esc(pr ? `${nome(p.kind)} · ${pr}` : nome(p.kind))}</option>`
    }).join('')}`
    $('richiesta-altro').hidden = resto.length === 0
    const senzaProdotti = disponibili().length === 0
    $('richiesta-cosa').hidden = senzaProdotti
    $('richiesta-vuota').hidden = senzaProdotti || righe.length > 0
    if (senzaProdotti) apriNota(true, false)
  }

  function disegnaGiorni() {
    const ora = adesso()
    const giorni = giorniRichiesta(scheda, ora)
    const pieni = new Set(scheda.full_days ?? [])
    const liberi = giorni.filter((g) => !pieni.has(g.iso))
    if (!liberi.some((g) => g.iso === giornoScelto)) giornoScelto = liberi[0]?.iso ?? null
    $('richiesta-giorni').innerHTML = giorni.map((g, i) => {
      const pieno = pieni.has(g.iso)
      const scelto = g.iso === giornoScelto
      const nomeGiorno = i === 0 ? T.oggi : i === 1 ? T.domani : maiuscola(T.giorniBrevi[g.wd].replace('.', ''))
      return `<button class="day-chip" type="button" role="radio" data-giorno="${g.iso}" aria-checked="${scelto}" tabindex="${scelto ? 0 : -1}"${pieno ? ' disabled' : ''}
        aria-label="${esc(maiuscola(dataEstesa(g, c)))}${pieno ? ` · ${esc(T.pieno)}` : ''}"><strong>${esc(nomeGiorno)}</strong><span>${g.data.getUTCDate()}</span>${pieno ? `<small>${esc(T.pieno)}</small>` : ''}</button>`
    }).join('')
    $('richiesta-chiuso').hidden = giorni.length > 0
    const g = giorni.find((x) => x.iso === giornoScelto)
    $('richiesta-orario').hidden = !g
    if (g) $('richiesta-orario').querySelector('span').textContent = T.apertoIl(maiuscola(dataEstesa(g, c)), fasceTesto(fasce(scheda, g), c))
  }

  function apriNota(aperta, fuoco = true) {
    $('richiesta-nota').hidden = !aperta
    $('richiesta-apri-nota').hidden = aperta
    if (aperta && fuoco) nota.focus()
  }

  // Dal database, una volta per pagina: richieste accese, prodotti disponibili, giorni pieni.
  async function aggiorna() {
    fresca ??= rpcPubblica(progetto(), 'get_farm', { p_slug: f.slug }).catch(() => null)
    const dati = await fresca
    if (!dati) return
    scheda = {
      ...scheda, ...dati,
      products: (dati.products ?? []).map((p) => ({
        ...p, price_min: numero(p.price_min), price_max: numero(p.price_max), price_quantity: numero(p.price_quantity),
      })),
    }
    // Un prodotto finito nel frattempo esce dalla richiesta.
    righe = righe.filter((r) => prodotto(r.kind))
    for (const kind of [...carrello.keys()]) {
      if (!prodotto(kind)) {
        carrello.delete(kind)
        disegnaProdotto(kind)
      }
    }
    barraRichiesta()
    if (!accettaRichieste(scheda)) mostraErrore(errore, T.erroriRichiesta.requests_off)
    invia.disabled = !accettaRichieste(scheda)
    if (pannello.open) {
      disegnaRighe()
      disegnaGiorni()
    }
  }

  function apri({ chiedi = false, bozza = null } = {}) {
    righe = bozza?.righe ?? [...carrello].map(([kind, quantity]) => ({ kind, quantity }))
    giornoScelto = bozza?.giorno ?? giornoScelto
    mostraErrore(errore, '')
    modulo.hidden = false
    $('richiesta-fatto').hidden = true
    pannello.querySelector('.request-foot').hidden = false
    invia.disabled = false
    invia.textContent = T.inviaRichiesta
    nota.value = bozza?.nota ?? (chiedi ? '' : nota.value)
    nota.placeholder = chiedi || disponibili().length === 0 ? T.esempioCerchi : T.esempioNota
    $('richiesta-nota-titolo').textContent = disponibili().length === 0 ? T.cosaTiServe : T.unaNota
    apriNota(chiedi || !!nota.value.trim() || disponibili().length === 0, false)
    if (bozza?.nome) modulo.elements.nome.value = bozza.nome
    disegnaRighe()
    disegnaGiorni()
    pannello.showModal()
    if (chiedi) nota.focus()
    // Il nome già scritto, se c'è: quello dell'ultima richiesta dell'account.
    if (!modulo.elements.nome.value) {
      mieRichieste().then((lista) => {
        if (!modulo.elements.nome.value && lista[0]?.name) modulo.elements.nome.value = lista[0].name
      }).catch(() => {})
    }
    aggiorna()
  }

  const bozzaDiAdesso = () => ({
    slug: f.slug, righe, giorno: giornoScelto, nome: modulo.elements.nome.value, nota: $('richiesta-nota').hidden ? '' : nota.value,
  })
  const salvaBozza = () => { try { sessionStorage.setItem(BOZZA, JSON.stringify(bozzaDiAdesso())) } catch { /* resta in memoria */ } }
  const togliBozza = () => { try { sessionStorage.removeItem(BOZZA) } catch { /* niente */ } }

  async function manda() {
    const s = sessioneSito()
    const testo = $('richiesta-nota').hidden ? '' : nota.value.trim()
    const chi = modulo.elements.nome.value.trim()
    if (!righe.length && !testo) {
      mostraErrore(errore, T.erroriRichiesta.empty_request)
      return ($('richiesta-cosa').hidden ? nota : $('richiesta-aggiungi')).focus()
    }
    if (!giornoScelto) return mostraErrore(errore, T.erroriRichiesta.closed_day)
    if (!chi) {
      mostraErrore(errore, T.erroriRichiesta.bad_name)
      return modulo.elements.nome.focus()
    }
    if (!s) return mostraErrore(errore, T.senzaMemoria)
    mostraErrore(errore, '')
    if (!s.attiva) {
      // Prima l'accesso, poi la richiesta parte da sola: il pannello torna com'era.
      salvaBozza()
      pannello.close()
      const dentro = await apriAccesso({ perRichiesta: true })
      pannello.showModal()
      if (!dentro) return
    }
    inviando = true
    invia.disabled = true
    invia.textContent = T.invio
    try {
      await s.rpc('request_create', {
        p_farm: f.slug,
        p_items: righe.map(({ kind, quantity }) => ({ kind, quantity: arrotonda(quantity) })),
        p_day: giornoScelto,
        p_name: chi,
        p_note: testo,
      })
      togliBozza()
      for (const kind of [...carrello.keys()]) {
        carrello.delete(kind)
        disegnaProdotto(kind)
      }
      barraRichiesta()
      nota.value = ''
      modulo.hidden = true
      pannello.querySelector('.request-foot').hidden = true
      $('richiesta-fatto').hidden = false
      $('richiesta-fatto').querySelector('a').focus()
      mieRichieste({ ricarica: true }).catch(() => {})
    } catch (err) {
      mostraErrore(errore, T.erroriRichiesta[err.codice] ?? T.erroreRete)
      invia.disabled = false
      invia.textContent = T.inviaRichiesta
      // Il giorno si è riempito o il maso ha cambiato qualcosa: si rileggono i dati.
      if (['day_full', 'closed_day', 'bad_items', 'requests_off'].includes(err.codice)) {
        fresca = null
        aggiorna()
      }
    } finally {
      inviando = false
    }
  }

  // Comandi -----------------------------------------------------------------------------------

  for (const el of document.querySelectorAll('#prodotti [data-qty]')) el.hidden = false
  document.querySelector('#prodotti .product-list')?.classList.add('qty-on')
  $('chiedi-maso').hidden = false
  if ($('richiesta-lato')) $('richiesta-lato').hidden = false

  document.addEventListener('click', (e) => {
    const piu = e.target.closest('[data-piu]')
    const meno = e.target.closest('[data-meno]')
    const b = piu ?? meno
    // Il "+" scritto dal generatore non ha data-dove: sta nella lista dei prodotti.
    const dove = b?.dataset.dove ?? (b?.closest('#prodotti') ? 'lista' : null)
    if (dove === 'lista') return cambia(b.dataset.piu ?? b.dataset.meno, piu ? 1 : -1)
    if (dove === 'pannello') {
      const kind = b.dataset.piu ?? b.dataset.meno
      const riga = righe.find((r) => r.kind === kind)
      const p = prodotto(kind)
      if (!riga || !p) return
      riga.quantity = arrotonda(riga.quantity + (piu ? 1 : -1) * passo(p, c))
      if (riga.quantity <= 0.001) righe = righe.filter((r) => r !== riga)
      annuncio.textContent = riga.quantity > 0.001 ? `${nome(kind)}: ${quantita(riga.quantity, unitaDi(p, c), c)}` : T.togliProdotto(nome(kind))
      return disegnaRighe()
    }
    if (e.target.closest('[data-togli]')) {
      const kind = e.target.closest('[data-togli]').dataset.togli
      righe = righe.filter((r) => r.kind !== kind)
      annuncio.textContent = T.togliProdotto(nome(kind))
      return disegnaRighe()
    }
    if (e.target.closest('[data-apri-richiesta]')) return apri()
    if (e.target.closest('[data-chiedi]')) return apri({ chiedi: true })
    const giornoBtn = e.target.closest('[data-giorno]')
    if (giornoBtn && !giornoBtn.disabled) {
      giornoScelto = giornoBtn.dataset.giorno
      disegnaGiorni()
      $('richiesta-giorni').querySelector(`[data-giorno="${giornoScelto}"]`)?.focus()
    }
  })
  // I giorni sono un gruppo di scelte: con le frecce si passa al prossimo libero, subito.
  $('richiesta-giorni').addEventListener('keydown', (e) => {
    const avanti = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]
    if (!avanti) return
    e.preventDefault()
    const liberi = [...$('richiesta-giorni').querySelectorAll('[data-giorno]:not([disabled])')]
    const i = liberi.findIndex((x) => x.dataset.giorno === giornoScelto)
    const prossimo = liberi[(i + avanti + liberi.length) % liberi.length]
    if (!prossimo) return
    giornoScelto = prossimo.dataset.giorno
    disegnaGiorni()
    $('richiesta-giorni').querySelector(`[data-giorno="${giornoScelto}"]`)?.focus()
  })
  $('richiesta-aggiungi').addEventListener('change', (e) => {
    const p = prodotto(e.target.value)
    if (!p) return
    righe.push({ kind: p.kind, quantity: passo(p, c) })
    annuncio.textContent = `${nome(p.kind)}: ${quantita(passo(p, c), unitaDi(p, c), c)}`
    disegnaRighe()
    $('richiesta-righe').querySelector(`[data-riga="${CSS.escape(p.kind)}"] [data-piu]`)?.focus()
  })
  $('richiesta-apri-nota').addEventListener('click', () => apriNota(true))
  modulo.addEventListener('submit', (e) => {
    e.preventDefault()
    if (!inviando) manda()
  })
  $('richiesta-chiudi').addEventListener('click', () => pannello.close())
  foglio(pannello, $('richiesta-maniglia'))

  // "Richiedi di nuovo" da Le mie richieste: ?richiedi=mele:2,uova:12 apre il pannello già compilato.
  const params = new URLSearchParams(location.search)
  const dinuovo = params.get('richiedi')
  let bozza = null
  try { bozza = JSON.parse(sessionStorage.getItem(BOZZA)) } catch { /* niente */ }
  if (dinuovo !== null) {
    for (const parte of dinuovo.split(',')) {
      const [kind, q] = parte.split(':')
      const p = prodotto(kind)
      if (p) carrello.set(kind, arrotonda(Number(q) > 0 ? Number(q) : passo(p, c)))
    }
    for (const kind of carrello.keys()) disegnaProdotto(kind)
    barraRichiesta()
    params.delete('richiedi')
    history.replaceState(null, '', `${location.pathname}${params.size ? `?${params}` : ''}${location.hash}`)
    apri({ chiedi: carrello.size === 0 })
  } else if (bozza?.slug === f.slug) {
    // Tornati dopo un ricaricamento a metà dell'accesso: la richiesta com'era.
    for (const { kind, quantity } of bozza.righe ?? []) if (prodotto(kind)) carrello.set(kind, quantity)
    for (const kind of carrello.keys()) disegnaProdotto(kind)
    barraRichiesta()
    apri({ bozza: { ...bozza, righe: (bozza.righe ?? []).filter((r) => prodotto(r.kind)) } })
  }
  pannello.addEventListener('close', () => { if (!inviando && $('accedi')?.open !== true) togliBozza() })
}
