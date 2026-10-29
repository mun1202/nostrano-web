// Pagine semplici del sito pubblico (mercati, come funziona, privacy…): la barra in alto e, dove ci sono
// schede di masi, lo stato "aperto ora" ricalcolato ogni minuto, come nella home.
import { badge, rigaStato, stato } from './comune.js?v=3fe2d0297b'
import { adesso, barra, frammento, ogniMinuto, pagina } from './browser.js?v=3fe2d0297b'
import { suggerisci } from './suggerisci.js?v=3fe2d0297b'
import { account } from './accedi.js?v=3fe2d0297b'

barra()
suggerisci()
account()
if (document.getElementById('dati')) {
  const { dati, c } = pagina('../../')
  const aggiorna = () => {
    c.ora = adesso()
    for (const f of dati.farms ?? []) {
      const li = document.querySelector(`.farm[data-slug="${CSS.escape(f.slug)}"]`)
      if (!li) continue
      const s = stato(f, c.ora)
      li.querySelector('.status')?.replaceWith(frammento(rigaStato(s, c)))
      li.querySelector('.photo-status')?.replaceWith(frammento(badge(s, c)))
    }
  }
  aggiorna()
  ogniMinuto(aggiorna)
}
