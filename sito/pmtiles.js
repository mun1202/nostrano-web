// Il formato PMTiles v3 (github.com/protomaps/PMTiles, spec/v3): tutte le tessere della mappa in un file solo, che si
// legge a pezzi con le richieste "Range". Lo usano il browser (la mappa del sito) e web/genera/mappa.mjs, che ritaglia
// la zona dei masi dal file del mondo di Protomaps. Niente librerie: chi lo usa passa la funzione che decomprime.
//
// Struttura del file: intestazione (127 byte) e cartella radice nei primi 16 KB, poi metadati, cartelle foglia e
// tessere. Una cartella è un elenco di voci { id, run, length, offset }: run > 0 è una tessera (o run tessere uguali di
// fila), run = 0 rimanda a una cartella foglia.

export const INTESTAZIONE = 127
export const TESTA = 16384
export const NESSUNA = 1
export const GZIP = 2

// L'identificativo di una tessera: prima tutte quelle dei livelli più bassi, poi l'ordine della curva di Hilbert.
export function idTessera(z, x, y) {
  let prima = 0
  for (let i = 0; i < z; i++) prima += 4 ** i
  const n = 2 ** z
  let d = 0
  for (let s = n / 2; s >= 1; s /= 2) {
    const rx = (x & s) > 0 ? 1 : 0
    const ry = (y & s) > 0 ? 1 : 0
    d += s * s * ((3 * rx) ^ ry)
    if (ry === 0) {
      if (rx === 1) {
        x = n - 1 - x
        y = n - 1 - y
      }
      ;[x, y] = [y, x]
    }
  }
  return prima + d
}

/** Le tessere di un livello che coprono un riquadro [ovest, sud, est, nord], in gradi. */
export function tessereDi(z, [ovest, sud, est, nord]) {
  const n = 2 ** z
  const tx = (lon) => Math.min(n - 1, Math.max(0, Math.floor(((lon + 180) / 360) * n)))
  const ty = (lat) => {
    const r = (lat * Math.PI) / 180
    return Math.min(n - 1, Math.max(0, Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n)))
  }
  return { x0: tx(ovest), x1: tx(est), y0: ty(nord), y1: ty(sud) }
}

// Gli offset del file del mondo superano 2^32: niente operazioni sui bit, solo aritmetica (esatta fino a 2^53).
function leggiVarint(byte, pos) {
  let valore = 0
  let peso = 1
  let b
  do {
    b = byte[pos.i++]
    valore += (b & 0x7f) * peso
    peso *= 128
  } while (b & 0x80)
  return valore
}

function scriviVarint(out, valore) {
  while (valore >= 128) {
    out.push((valore % 128) | 0x80)
    valore = Math.floor(valore / 128)
  }
  out.push(valore)
}

export function leggiIntestazione(byte) {
  const v = new DataView(byte.buffer, byte.byteOffset, byte.byteLength)
  if (String.fromCharCode(...byte.subarray(0, 7)) !== 'PMTiles' || byte[7] !== 3) throw new Error('Non è un file PMTiles v3')
  const u64 = (o) => Number(v.getBigUint64(o, true))
  const gradi = (o) => v.getInt32(o, true) / 1e7
  return {
    radice: { offset: u64(8), length: u64(16) },
    metadati: { offset: u64(24), length: u64(32) },
    foglie: { offset: u64(40), length: u64(48) },
    tessere: { offset: u64(56), length: u64(64) },
    indirizzate: u64(72),
    voci: u64(80),
    contenuti: u64(88),
    ordinato: v.getUint8(96) === 1,
    compressione: v.getUint8(97),
    compressioneTessere: v.getUint8(98),
    tipo: v.getUint8(99),
    minZoom: v.getUint8(100),
    maxZoom: v.getUint8(101),
    limiti: [gradi(102), gradi(106), gradi(110), gradi(114)],
    centroZoom: v.getUint8(118),
    centro: [gradi(119), gradi(123)],
  }
}

export function scriviIntestazione(t) {
  const byte = new Uint8Array(INTESTAZIONE)
  const v = new DataView(byte.buffer)
  byte.set([...'PMTiles'].map((c) => c.charCodeAt(0)))
  byte[7] = 3
  const u64 = (o, n) => v.setBigUint64(o, BigInt(n), true)
  const gradi = (o, g) => v.setInt32(o, Math.round(g * 1e7), true)
  u64(8, t.radice.offset); u64(16, t.radice.length)
  u64(24, t.metadati.offset); u64(32, t.metadati.length)
  u64(40, t.foglie.offset); u64(48, t.foglie.length)
  u64(56, t.tessere.offset); u64(64, t.tessere.length)
  u64(72, t.indirizzate); u64(80, t.voci); u64(88, t.contenuti)
  v.setUint8(96, t.ordinato ? 1 : 0)
  v.setUint8(97, t.compressione)
  v.setUint8(98, t.compressioneTessere)
  v.setUint8(99, t.tipo)
  v.setUint8(100, t.minZoom)
  v.setUint8(101, t.maxZoom)
  t.limiti.forEach((g, i) => gradi(102 + i * 4, g))
  v.setUint8(118, t.centroZoom)
  gradi(119, t.centro[0])
  gradi(123, t.centro[1])
  return byte
}

/** Una cartella (già decompressa) come elenco di voci ordinate per id. */
export function leggiCartella(byte) {
  const pos = { i: 0 }
  const voci = Array.from({ length: leggiVarint(byte, pos) }, () => ({ id: 0, run: 0, length: 0, offset: 0 }))
  let id = 0
  for (const v of voci) v.id = id += leggiVarint(byte, pos)
  for (const v of voci) v.run = leggiVarint(byte, pos)
  for (const v of voci) v.length = leggiVarint(byte, pos)
  voci.forEach((v, i) => {
    const n = leggiVarint(byte, pos)
    // 0 vuol dire "subito dopo la voce di prima".
    v.offset = n === 0 && i > 0 ? voci[i - 1].offset + voci[i - 1].length : n - 1
  })
  return voci
}

export function scriviCartella(voci) {
  const out = []
  scriviVarint(out, voci.length)
  let id = 0
  for (const v of voci) {
    scriviVarint(out, v.id - id)
    id = v.id
  }
  for (const v of voci) scriviVarint(out, v.run)
  for (const v of voci) scriviVarint(out, v.length)
  voci.forEach((v, i) => {
    const subito = i > 0 && v.offset === voci[i - 1].offset + voci[i - 1].length
    scriviVarint(out, subito ? 0 : v.offset + 1)
  })
  return Uint8Array.from(out)
}

/** La voce che contiene la tessera id: una tessera (run > 0), una cartella foglia (run = 0) o null. */
export function trova(voci, id) {
  let basso = 0
  let alto = voci.length - 1
  while (basso <= alto) {
    const m = (basso + alto) >> 1
    if (voci[m].id < id) basso = m + 1
    else if (voci[m].id > id) alto = m - 1
    else return voci[m]
  }
  const v = voci[alto]
  if (!v) return null
  if (v.run === 0 || id - v.id < v.run) return v
  return null
}

/**
 * Un file PMTiles da leggere a pezzi. leggi(offset, length) dà i byte (con una richiesta Range nel browser);
 * decomprimi(byte, compressione) li apre. Le cartelle foglia lette restano in memoria.
 */
export function archivio(leggi, decomprimi) {
  let inizio = null
  const foglie = new Map()

  function apri() {
    inizio ??= leggi(0, TESTA).then(async (byte) => {
      const t = leggiIntestazione(byte)
      const radice = byte.subarray(t.radice.offset, t.radice.offset + t.radice.length)
      return { t, radice: leggiCartella(await decomprimi(radice, t.compressione)) }
    })
    // Se la prima lettura fallisce (rete), la prossima riprova.
    inizio.catch(() => { inizio = null })
    return inizio
  }

  function foglia(t, v) {
    if (!foglie.has(v.offset)) {
      const p = leggi(t.foglie.offset + v.offset, v.length).then((b) => decomprimi(b, t.compressione)).then(leggiCartella)
      p.catch(() => foglie.delete(v.offset))
      foglie.set(v.offset, p)
    }
    return foglie.get(v.offset)
  }

  return {
    intestazione: async () => (await apri()).t,

    /** La voce della tessera id, con le cartelle foglia (al massimo tre livelli, come nella specifica). */
    async voce(id) {
      const { t, radice } = await apri()
      let voci = radice
      for (let livello = 0; livello < 4; livello++) {
        const v = trova(voci, id)
        if (!v || v.run > 0) return v
        voci = await foglia(t, v)
      }
      return null
    },

    /** I byte decompressi della tessera z/x/y, o null se nel file non c'è. */
    async tessera(z, x, y) {
      const t = (await apri()).t
      const v = await this.voce(idTessera(z, x, y))
      if (!v) return null
      return decomprimi(await leggi(t.tessere.offset + v.offset, v.length), t.compressioneTessere)
    },
  }
}
