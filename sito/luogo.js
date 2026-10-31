// "Indirizzo del maso" in tre passi: cerca, conferma, fatto. Un solo riquadro al posto di comune, indirizzo e
// coordinate: lo usano il pannello admin (scheda del maso) e "Chiedi il tuo link" del sito.
//   cerca     una casella e "Cerca" (Photon, web/sito/indirizzo.js); i luoghi trovati come righe da toccare. Se non
//             si trova: "Metti il punto sulla mappa".
//   controlla il luogo scelto sulla piccola mappa (web/sito/punto.js): il segnaposto si sposta solo se serve; "Conferma".
//   fatto     una riga con l'indirizzo e "Cambia".
// cambia(luogo) arriva alla conferma: { indirizzo, comune, comuni, lat, lng }. Senza cartina si salta la mappa.
import { esc } from './comune.js?v=da1cc59c62'
import { cercaIndirizzo, luogoDelPunto } from './indirizzo.js?v=da1cc59c62'
import { mappaPunto } from './punto.js?v=da1cc59c62'

// Il centro dell'Alto Adige, per mettere il punto a mano quando non c'è ancora niente.
const PARTENZA = { lat: 46.62, lng: 11.33 }

const STILE = `
.luogo { display: grid; gap: 10px; }
.luogo-cerca { display: flex; gap: 8px; }
.luogo-cerca input { flex: 1; min-width: 0; }
.luogo-trovati { display: grid; gap: 6px; }
.luogo-trovato { padding: 10px 12px; border: 1px solid var(--line-strong, #d4d4d8); border-radius: 12px; background: #fff;
  color: var(--ink, #18181b); font: inherit; font-size: 14px; font-weight: 500; text-align: left; cursor: pointer; }
.luogo-trovato:hover { border-color: var(--ink, #18181b); }
.luogo-nota { margin: 0; color: var(--muted, #71717a); font-size: 13px; }
.luogo-scelto { margin: 0; font-size: 15px; font-weight: 600; }
.luogo-mappa { height: 240px; overflow: hidden; border: 1px solid var(--line, #e4e4e7); border-radius: 12px; }
.luogo-azioni { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
.luogo-fatto { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border: 1px solid var(--line, #e4e4e7);
  border-radius: 12px; background: #fff; }
.luogo-fatto svg { flex: none; width: 22px; height: 22px; color: var(--green, #2f6b3a); }
.luogo-fatto span { display: grid; flex: 1; min-width: 0; gap: 2px; font-size: 15px; }
.luogo-fatto small { color: var(--muted, #71717a); font-size: 13px; }
`

function aggiungiStile() {
  if (document.getElementById('stile-luogo')) return
  const el = document.createElement('style')
  el.id = 'stile-luogo'
  el.textContent = STILE
  document.head.append(el)
}

const SPUNTA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg>'

/**
 * contenitore: dove disegnarlo. testi: i testi nella lingua della pagina (vedi TESTI_LUOGO in web/sito/testi.js).
 * classi: { primario, secondario, link } dei bottoni della pagina. cartina: { tessere, font, libreria } o null.
 * iniziale: il luogo che c'è già (si parte da "fatto"). cambia(luogo): alla conferma.
 */
export function sceltaLuogo({ contenitore, testi: T, lang = 'it', classi, cartina = null, iniziale = null, cambia = () => {} }) {
  aggiungiStile()
  const s = { fase: iniziale ? 'fatto' : 'cerca', scelto: iniziale, trovati: null, messaggio: '', aMano: false, attesa: false }
  let mappa = null

  const togliMappa = () => {
    mappa?.then((m) => m.togli()).catch(() => {})
    mappa = null
  }

  function disegna() {
    togliMappa()
    if (s.fase === 'fatto') {
      const sopra = s.scelto.indirizzo || s.scelto.comune || T.puntoMappa
      const sotto = s.scelto.indirizzo ? s.scelto.comune : ''
      contenitore.innerHTML = `<div class="luogo"><div class="luogo-fatto">${SPUNTA}<span><strong>${esc(sopra)}</strong>${sotto ? `<small>${esc(sotto)}</small>` : ''}</span>
        <button type="button" class="${classi.link}" data-luogo="cambia">${esc(T.cambia)}</button></div></div>`
      return
    }
    if (s.fase === 'controlla') {
      const titolo = s.aMano ? T.puntoMappa : s.scelto.etichetta
      contenitore.innerHTML = `<div class="luogo">
        <p class="luogo-scelto">${esc(titolo)}</p>
        <div class="luogo-mappa"></div>
        <p class="luogo-nota">${esc(s.aMano ? T.controllaAMano : T.controlla)}</p>
        <div class="luogo-azioni">
          <button type="button" class="${classi.primario}" data-luogo="conferma" ${s.attesa ? 'disabled' : ''}>${esc(s.attesa ? T.cercoIndirizzo : T.conferma)}</button>
          <button type="button" class="${classi.link}" data-luogo="indietro">${esc(T.indietro)}</button>
        </div>
        ${s.messaggio ? `<p class="luogo-nota" role="alert">${esc(s.messaggio)}</p>` : ''}
      </div>`
      mappa = mappaPunto({
        contenitore: contenitore.querySelector('.luogo-mappa'),
        cartina,
        lang,
        punto: s.scelto,
        zoom: s.aMano && !s.scelto.indirizzo ? 9 : 16,
        sposta: (p) => Object.assign(s.scelto, p),
      })
      // Senza mappa (niente WebGL) vale il punto trovato: si conferma e basta.
      mappa.catch(() => { contenitore.querySelector('.luogo-mappa')?.remove() })
      return
    }
    const trovati = s.trovati?.length
      ? `<div class="luogo-trovati">${s.trovati.map((r, i) => `<button type="button" class="luogo-trovato" data-luogo="scegli" data-i="${i}">${esc(r.etichetta)}</button>`).join('')}</div>`
      : ''
    contenitore.innerHTML = `<div class="luogo">
      <div class="luogo-cerca">
        <input type="search" enterkeyhint="search" autocomplete="off" aria-label="${esc(T.etichetta)}" placeholder="${esc(T.esempio)}">
        <button type="button" class="${classi.secondario}" data-luogo="cerca">${esc(T.cerca)}</button>
      </div>
      ${s.messaggio ? `<p class="luogo-nota" role="status">${esc(s.messaggio)}</p>` : ''}
      ${trovati}
      ${cartina ? `<button type="button" class="${classi.link}" data-luogo="a-mano">${esc(T.aMano)}</button>` : ''}
    </div>`
  }

  async function cerca() {
    const input = contenitore.querySelector('input')
    const testo = input.value.trim()
    if (testo.length < 3) return input.focus()
    s.messaggio = T.cerco
    s.trovati = null
    disegna()
    contenitore.querySelector('input').value = testo
    try {
      s.trovati = await cercaIndirizzo(testo, lang)
      s.messaggio = s.trovati.length ? '' : T.nessuno
    } catch (e) {
      s.messaggio = e.message === 'too_many' ? T.troppe : T.errore
    }
    disegna()
    contenitore.querySelector('input').value = testo
  }

  function conferma(luogo) {
    s.scelto = luogo
    s.fase = 'fatto'
    s.aMano = false
    s.messaggio = ''
    disegna()
    cambia(luogo)
  }

  async function confermaPunto() {
    // Il punto messo a mano: l'indirizzo si chiede a Photon da lì.
    if (!s.aMano) return conferma({ ...s.scelto })
    s.attesa = true
    disegna()
    let luogo = null
    try { luogo = await luogoDelPunto(s.scelto, lang) } catch { /* resta il punto senza indirizzo */ }
    s.attesa = false
    if (!luogo?.comune) {
      s.messaggio = T.nessunIndirizzo
      return disegna()
    }
    conferma(luogo)
  }

  contenitore.addEventListener('click', (e) => {
    const b = e.target.closest('[data-luogo]')
    if (!b) return
    switch (b.dataset.luogo) {
      case 'cerca': return cerca()
      case 'scegli': {
        const r = s.trovati?.[Number(b.dataset.i)]
        if (!r) return
        if (!cartina) return conferma(r)
        s.scelto = { ...r }
        s.aMano = false
        s.fase = 'controlla'
        s.messaggio = ''
        return disegna()
      }
      case 'a-mano':
        s.scelto = { lat: (s.scelto ?? PARTENZA).lat, lng: (s.scelto ?? PARTENZA).lng, indirizzo: '', comune: '' }
        s.aMano = true
        s.fase = 'controlla'
        s.messaggio = ''
        return disegna()
      case 'conferma': return confermaPunto()
      case 'indietro':
        s.fase = 'cerca'
        s.messaggio = ''
        disegna()
        return contenitore.querySelector('input')?.focus()
      case 'cambia':
        s.fase = 'cerca'
        s.trovati = null
        s.messaggio = ''
        disegna()
        return contenitore.querySelector('input')?.focus()
    }
  })
  // Invio nella casella cerca, senza mandare il modulo intorno.
  contenitore.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || e.target.tagName !== 'INPUT') return
    e.preventDefault()
    cerca()
  })

  disegna()
  return {
    get luogo() { return s.fase === 'fatto' ? s.scelto : null },
    togli: togliMappa,
  }
}
