// Pagina di un maso. L'HTML arriva già pronto dal generatore (web/genera/pagine.mjs): qui la galleria con il
// contatore, "Segnala un errore" e quello che dipende dall'ora, ricalcolato nel browser così resta giusto anche su
// una pagina generata un'ora prima: stato, orari di oggi, giorni speciali, novità scadute, "aggiornata … fa".
import { badge, distanza, km, novita, rigaStato, stato } from './comune.js?v=3fe2d0297b'
import { adesso, barra, chiamaAnonimo, foglio, frammento, mostraErrore, ogniMinuto, pagina } from './browser.js?v=3fe2d0297b'
import { aggiornata, oggiMaso, orariMaso, pillStato, quandoPrezzi } from './viste.js?v=3fe2d0297b'
import { mostraCuori, preferiti, toccaCuore } from './preferiti.js?v=3fe2d0297b'
import { suggerisci } from './suggerisci.js?v=3fe2d0297b'
import { account } from './accedi.js?v=3fe2d0297b'
import { richiesta } from './richiesta.js?v=3fe2d0297b'

const { dati, c } = pagina('../../')
const f = dati.f
const $ = (id) => document.getElementById(id)

const sostituisci = (id, html) => document.getElementById(id)?.replaceWith(frammento(html))

function aggiornaOra() {
  c.ora = adesso()
  sostituisci('stato', pillStato(f, c))
  sostituisci('oggi', oggiMaso(f, c))
  sostituisci('aggiornata', aggiornata(f, c))
  const orari = document.getElementById('orari')
  if (orari) orari.innerHTML = orariMaso(f, c)
  const prezzi = document.getElementById('prezzi-quando')
  if (prezzi) prezzi.textContent = quandoPrezzi(f, c)
  // La novità scade a fine giornata: la pagina può essere di ieri.
  if (!novita(f, c.ora)) document.getElementById('novita')?.remove()
  for (const v of dati.vicini) {
    const li = document.querySelector(`.nearby .farm[data-slug="${CSS.escape(v.slug)}"]`)
    if (!li) continue
    const s = stato(v, c.ora)
    li.querySelector('.status')?.replaceWith(frammento(rigaStato(s, c)))
    li.querySelector('.photo-status')?.replaceWith(frammento(badge(s, c)))
  }
}

barra()
suggerisci()
account()
richiesta(f, c)
aggiornaOra()
ogniMinuto(aggiornaOra)

const riduci = () => matchMedia('(prefers-reduced-motion: reduce)').matches

// Sul telefono le foto scorrono di lato: il contatore dice a che foto sei.
const track = document.getElementById('foto')
const conta = document.getElementById('conta-foto')
if (track && conta) {
  track.addEventListener('scroll', () => {
    conta.textContent = `${Math.round(track.scrollLeft / track.clientWidth) + 1} / ${f.photos.length}`
  }, { passive: true })
}

// Le foto a tutto schermo ----------------------------------------------------------------------
// Toccando una foto (o "Tutte le foto") si apre la galleria: si scorre con il dito o le frecce, si chiude con Esc, la
// X o trascinando giù. Dove ci sono le View Transitions la foto toccata cresce fino a tutto schermo.
const galleria = $('galleria')
if (galleria && track) {
  const lbTrack = $('lb-track')
  const grandi = [...lbTrack.querySelectorAll('img')]
  const piccole = [...track.querySelectorAll('img')]
  const indice = () => Math.round(lbTrack.scrollLeft / Math.max(1, lbTrack.clientWidth))
  // Le foto grandi si caricano solo quando servono: quella aperta e le due accanto.
  const carica = (i) => {
    for (const img of [grandi[i], grandi[i - 1], grandi[i + 1]]) {
      if (!img || img.src) continue
      if (img.dataset.srcset) img.srcset = img.dataset.srcset
      img.src = img.dataset.src
    }
  }
  const segna = () => {
    const i = indice()
    $('lb-conta').textContent = `${i + 1} / ${grandi.length}`
    carica(i)
  }
  // Frecce e tasti si premono di seguito: la foto cambia subito, senza scorrere (sul telefono si sfoglia col dito).
  const vai = (i) => { lbTrack.scrollLeft = Math.max(0, Math.min(grandi.length - 1, i)) * lbTrack.clientWidth }
  async function apri(i) {
    carica(i)
    const mostra = () => {
      galleria.showModal()
      lbTrack.scrollLeft = i * lbTrack.clientWidth
      segna()
    }
    const piccola = piccole[i]
    if (!document.startViewTransition || riduci() || !piccola || piccola.getBoundingClientRect().width === 0) return mostra()
    // La foto grande deve essere pronta, altrimenti nel passaggio si vedrebbe vuota; se tarda, solo dissolvenza.
    const pronta = await Promise.race([grandi[i].decode().then(() => true, () => false), new Promise((ok) => setTimeout(ok, 250, false))])
    if (!pronta) return mostra()
    const nome = piccola.style.viewTransitionName
    piccola.style.viewTransitionName = 'foto-aperta'
    galleria.classList.add('subito')
    document.documentElement.classList.add('vt-galleria')
    const passaggio = document.startViewTransition(() => {
      piccola.style.viewTransitionName = 'none'
      grandi[i].style.viewTransitionName = 'foto-aperta'
      mostra()
    })
    passaggio.finished.finally(() => {
      piccola.style.viewTransitionName = nome
      grandi[i].style.viewTransitionName = ''
      galleria.classList.remove('subito')
      document.documentElement.classList.remove('vt-galleria')
    })
  }
  for (const [i, img] of piccole.entries()) img.addEventListener('click', () => apri(i))
  $('apri-galleria').hidden = false
  $('apri-galleria').addEventListener('click', () => apri(conta ? Math.round(track.scrollLeft / Math.max(1, track.clientWidth)) : 0))
  lbTrack.addEventListener('scroll', segna, { passive: true })
  $('lb-chiudi').addEventListener('click', () => galleria.close())
  $('lb-prima')?.addEventListener('click', () => vai(indice() - 1))
  $('lb-dopo')?.addEventListener('click', () => vai(indice() + 1))
  // Le frecce della tastiera: subito, senza scorrimento animato.
  galleria.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault()
      vai(indice() + (e.key === 'ArrowRight' ? 1 : -1))
    }
  })
  // Sul telefono, trascinando giù la foto segue il dito e, lasciata abbastanza in basso (o con uno strappo), si chiude.
  let inizio = null
  let dy = 0
  lbTrack.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch' || inizio) return
    inizio = { x: e.clientX, y: e.clientY, t: performance.now(), giu: false }
    dy = 0
  })
  lbTrack.addEventListener('pointermove', (e) => {
    if (!inizio) return
    const dx = e.clientX - inizio.x
    dy = e.clientY - inizio.y
    if (!inizio.giu && dy > 10 && dy > Math.abs(dx) * 1.2) inizio.giu = true
    if (!inizio.giu) return
    galleria.classList.add('trascina')
    lbTrack.style.transform = `translateY(${Math.max(0, dy)}px)`
    galleria.style.setProperty('--lb-fondo', String(Math.max(0.3, 1 - dy / 500)))
  })
  const lascia = () => {
    if (!inizio) return
    const velocita = dy / (performance.now() - inizio.t)
    const giu = inizio.giu
    inizio = null
    galleria.classList.remove('trascina')
    lbTrack.style.transform = ''
    galleria.style.removeProperty('--lb-fondo')
    if (giu && (dy > 120 || velocita > 0.5)) galleria.close()
  }
  lbTrack.addEventListener('pointerup', lascia)
  lbTrack.addEventListener('pointercancel', lascia)
  addEventListener('resize', () => { if (galleria.open) vai(indice()) })
}

// Condividi ------------------------------------------------------------------------------------
// Sul telefono il menu di condivisione del sistema (così c'è WhatsApp); dove non c'è, si copia il link e accanto al
// bottone compare "Link copiato" per due secondi.
const indirizzo = document.querySelector('link[rel="canonical"]')?.href ?? location.href.split('?')[0]
async function copia(testo) {
  try {
    await navigator.clipboard.writeText(testo)
    return true
  } catch {
    // Browser vecchi o senza permesso: il vecchio modo, con un campo nascosto.
    const campo = Object.assign(document.createElement('textarea'), { value: testo })
    campo.setAttribute('readonly', '')
    campo.style.cssText = 'position:fixed;opacity:0'
    document.body.append(campo)
    campo.select()
    const fatto = document.execCommand?.('copy') ?? false
    campo.remove()
    return fatto
  }
}
for (const wrap of document.querySelectorAll('.share-wrap')) {
  wrap.hidden = false
  const avviso = wrap.querySelector('.copiato')
  let timer = 0
  wrap.querySelector('[data-condividi]').addEventListener('click', async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: f.name, url: indirizzo })
      } catch {
        // Annullato da chi visita: niente da dire.
      }
      return
    }
    if (!(await copia(indirizzo))) return
    avviso.textContent = c.T.linkCopiato
    avviso.classList.add('si')
    clearTimeout(timer)
    timer = setTimeout(() => avviso.classList.remove('si'), 2000)
  })
}

// Distanza da te: solo se chi visita ha già dato la posizione al sito, senza chiedere niente --------------------
navigator.permissions?.query({ name: 'geolocation' }).then((p) => {
  if (p.state !== 'granted') return
  navigator.geolocation.getCurrentPosition(({ coords }) => {
    const el = $('da-te')
    el.textContent = ` · ${c.T.daTe(km(distanza({ lat: coords.latitude, lng: coords.longitude }, f), c))}`
    el.hidden = false
  }, () => {}, { maximumAge: 600000, timeout: 8000 })
}).catch(() => {})

// Preferiti: il cuore accanto al nome e quelli dei masi vicini -----------------------------------------------
const pref = preferiti()
mostraCuori(document, pref)
document.addEventListener('preferiti-cambiati', () => mostraCuori(document, pref))
document.addEventListener('click', (e) => toccaCuore(e, pref))

// "Segnala un errore" ----------------------------------------------------------------------------
// Come nell'app (report_create), con l'accesso anonimo chiesto solo al momento dell'invio.
const inviaSegnalazione = (messaggio, contatto) =>
  chiamaAnonimo(dati.segnala, 'report_create', { p_farm: f.slug, p_message: messaggio, p_contact: contatto || null })

const pannelloSegnala = $('segnala')
if (pannelloSegnala) {
  const modulo = $('segnala-modulo')
  const errore = $('segnala-errore')
  const invia = $('segnala-invia')
  $('apri-segnala').addEventListener('click', () => {
    // Ogni volta un modulo pulito, anche dopo un invio.
    modulo.hidden = false
    $('segnala-fatto').hidden = true
    invia.hidden = false
    invia.disabled = false
    invia.textContent = c.T.invia
    $('segnala-annulla').textContent = c.T.annulla
    mostraErrore(errore, '')
    pannelloSegnala.showModal()
    modulo.elements.messaggio.focus()
  })
  modulo.addEventListener('submit', async (e) => {
    e.preventDefault()
    const messaggio = modulo.elements.messaggio.value.trim()
    if (!messaggio) {
      mostraErrore(errore, c.T.scriviCosa)
      return modulo.elements.messaggio.focus()
    }
    mostraErrore(errore, '')
    invia.disabled = true
    invia.textContent = c.T.invio
    try {
      await inviaSegnalazione(messaggio.slice(0, 1000), modulo.elements.contatto.value.trim().slice(0, 200))
      modulo.reset()
      modulo.hidden = true
      invia.hidden = true
      $('segnala-fatto').hidden = false
      $('segnala-annulla').textContent = c.T.chiudi
    } catch {
      mostraErrore(errore, c.T.erroreInvio(dati.segnala?.email), dati.segnala?.email)
      invia.disabled = false
      invia.textContent = c.T.invia
    }
  })
  $('segnala-annulla').addEventListener('click', () => pannelloSegnala.close())
  $('segnala-chiudi').addEventListener('click', () => pannelloSegnala.close())
  foglio(pannelloSegnala, $('segnala-maniglia'))
}
