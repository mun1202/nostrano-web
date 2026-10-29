// I masi preferiti nel browser (localStorage): senza account restano lì e non li riceviamo. Se il browser non lascia
// scrivere (navigazione privata, dati bloccati) i cuori non compaiono, così nessuno salva un preferito che sparisce.
const CHIAVE = 'nostrano.preferiti'
const riduci = () => matchMedia('(prefers-reduced-motion: reduce)').matches

// Con l'account (accedi.js) i preferiti stanno anche sul server: alServer salva un cuore toccato, sostituisci mette
// qui quelli dell'account e avvisa la pagina ("preferiti-cambiati") perché rifaccia cuori e pillola.
let istanza

/** I preferiti di questo browser, gli stessi per tutta la pagina, o null se non si possono ricordare. */
export function preferiti() {
  if (istanza !== undefined) return istanza
  let lista
  try {
    const salvati = JSON.parse(localStorage.getItem(CHIAVE) ?? '[]')
    lista = Array.isArray(salvati) ? salvati.filter((s) => typeof s === 'string') : []
    // Si prova anche a scrivere: in certi browser si legge ma non si salva.
    localStorage.setItem(CHIAVE, JSON.stringify(lista))
  } catch {
    istanza = null
    return istanza
  }
  const set = new Set(lista)
  const salva = () => { try { localStorage.setItem(CHIAVE, JSON.stringify([...set])) } catch {} }
  istanza = {
    set,
    alServer: null,
    cambia(slug) {
      if (set.has(slug)) set.delete(slug)
      else set.add(slug)
      salva()
      istanza.alServer?.(slug, set.has(slug))
      return set.has(slug)
    },
    sostituisci(nuova) {
      const prima = [...set].sort().join()
      set.clear()
      for (const slug of nuova ?? []) if (typeof slug === 'string') set.add(slug)
      salva()
      if ([...set].sort().join() !== prima) document.dispatchEvent(new CustomEvent('preferiti-cambiati'))
    },
  }
  return istanza
}

/** Mostra i cuori dentro "dove", pieni per i preferiti. */
export function mostraCuori(dove, p) {
  if (!p) return
  for (const b of dove.querySelectorAll('[data-preferito]')) {
    b.hidden = false
    b.setAttribute('aria-pressed', String(p.set.has(b.dataset.preferito)))
  }
}

/**
 * Un tocco su un cuore: cambia il preferito, aggiorna tutti i cuori dello stesso maso e fa una piccola
 * pulsazione (0,85 → 1 in 200 ms; con "Riduci movimento" niente). Dice se il tocco era su un cuore.
 */
export function toccaCuore(e, p, dopo = () => {}) {
  const b = e.target.closest('[data-preferito]')
  if (!b || !p) return false
  const si = p.cambia(b.dataset.preferito)
  for (const x of document.querySelectorAll(`[data-preferito="${CSS.escape(b.dataset.preferito)}"]`)) x.setAttribute('aria-pressed', String(si))
  if (!riduci()) b.querySelector('svg')?.animate([{ transform: 'scale(0.85)' }, { transform: 'scale(1)' }], { duration: 200, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' })
  dopo(si)
  return true
}
