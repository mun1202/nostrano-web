// Giorni come li usa il database: "2026-10-30" nel fuso di Roma, giorni della settimana 1 = domenica … 7 = sabato.

export function todayRome() {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Rome' }).format(new Date())
}

export function addDays(day, count) {
  const date = new Date(`${day}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + count)
  return date.toISOString().slice(0, 10)
}

export function weekday(day) {
  return new Date(`${day}T12:00:00Z`).getUTCDay() + 1
}

/** Da lunedì a domenica, come si legge in Italia. */
export const WEEK = [2, 3, 4, 5, 6, 7, 1]

const locales = { it: 'it-IT', de: 'de-DE' }

export function formatDay(day, lang) {
  return new Intl.DateTimeFormat(locales[lang], { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
    .format(new Date(`${day}T12:00:00Z`))
}

export function formatInstant(instant, lang) {
  return new Intl.DateTimeFormat(locales[lang], { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Rome' })
    .format(new Date(instant))
}

export function weekdayName(number, lang) {
  // Il 4 ottobre 2026 è una domenica: da lì si contano gli altri giorni.
  return new Intl.DateTimeFormat(locales[lang], { weekday: 'long', timeZone: 'UTC' })
    .format(new Date(Date.UTC(2026, 9, 3 + number, 12)))
}

export const toClock = (minutes) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

export function fromClock(text) {
  const [hours, minutes] = String(text).split(':').map(Number)
  return Number.isFinite(hours) && Number.isFinite(minutes) ? hours * 60 + minutes : null
}

/** Fasce di un giorno: prima i giorni speciali, poi l'orario della settimana. */
export function dayRanges(farm, day) {
  const exception = farm.hours_exceptions.find((e) => e.day === day)
  return exception ? exception.ranges : farm.opening_hours[String(weekday(day))] ?? []
}

export function minuteNowRome() {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(new Date())
  const value = (type) => Number(parts.find((p) => p.type === type).value)
  return value('hour') * 60 + value('minute')
}

/** Giorni dei prossimi sette in cui il negozio è aperto; oggi solo se non ha già chiuso. */
export function openDays(farm) {
  const today = todayRome()
  const now = minuteNowRome()
  return Array.from({ length: 7 }, (_, i) => addDays(today, i)).filter((day) => {
    const ranges = dayRanges(farm, day)
    return day === today ? ranges.some(([, end]) => end > now) : ranges.length > 0
  })
}
