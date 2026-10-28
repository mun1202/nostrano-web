// Testi della pagina del produttore, in italiano e tedesco. Stessi testi dell'area produttore dell'app.

const it = {
  title: 'Area produttore',
  language: 'Lingua',
  loading: 'Caricamento…',
  invalidLink: 'Link non valido. Chiedi a Nostrano un link nuovo su WhatsApp.',
  openLink: 'Apri il link che ti abbiamo mandato su WhatsApp',
  openLinkText: "Il link è personale: chi lo ha può aggiornare la scheda del tuo maso. Se l'hai perso, scrivici e te ne mandiamo uno nuovo.",
  draft: 'In bozza: la scheda non è ancora pubblicata.',
  lastChecked: 'Ultimo controllo: {0}',
  allGood: 'È tutto giusto?',
  allGoodText: 'Se orari e prodotti non sono cambiati basta un tocco: la scheda mostra la data di oggi.',
  confirm: 'Tutto confermato',
  confirmedToday: 'Confermato oggi',
  confirmedToast: 'Grazie! La scheda mostra la data di oggi',
  requests: 'Richieste',
  requestsWaiting: 'Da rispondere',
  requestsNone: 'Nessuna richiesta da rispondere.',
  acceptRequests: 'Accetto richieste',
  acceptRequestsText: 'I clienti ti chiedono di tenere da parte i prodotti per il giorno in cui passano.',
  maxPerDay: 'Al massimo al giorno',
  keep: 'Te lo tengo',
  dontHave: "Non ce l'ho",
  otherDay: 'Altro giorno',
  whichDay: 'Quale giorno proponi?',
  replyPlaceholder: 'Due parole, se vuoi',
  sendProposal: 'Invia la proposta',
  cancel: 'Annulla',
  block: 'Segnala e blocca',
  blockConfirm: 'Segnalare questa richiesta? Non riceverai altre richieste da quel telefono.',
  answered: 'Risposte date',
  status_accepted: 'Lo tieni da parte',
  status_declined: "Non ce l'avevi",
  status_other_day: 'Hai proposto {0}',
  status_cancelled: 'Annullata dal cliente',
  status_expired: 'Scaduta',
  status_picked_up: 'Ritirata',
  status_no_show: 'Non è passato',
  toCollect: 'Da ritirare',
  pickedUp: 'Ritirata',
  noShow: 'Non è passato',
  pickupMarked: 'Segnato',
  answerWithin: 'Rispondi entro 12 ore: dopo la richiesta scade e il cliente viene avvisato.',
  onRequest: 'Su richiesta',
  onRequestHelp: 'Lo prepari quando qualcuno lo chiede con «Tienimeli da parte».',
  answerSent: 'Risposta inviata',
  blocked: 'Segnalata: non riceverai altre richieste da quel telefono',
  requestsOn: 'Richieste attive',
  requestsOff: 'Richieste spente: il pulsante sparisce dalla scheda',
  week: 'Questa settimana',
  views: 'Visite alla scheda',
  directions: 'Indicazioni chieste',
  followers: 'Ti seguono',
  waiting: 'Aspettano un prodotto',
  trend: '{0} sulla settimana prima',
  confirmations: ["{0} persona l'ha trovato come scritto questa settimana", "{0} persone l'hanno trovato come scritto questa settimana"],
  closedReports: ["{0} persona l'ha trovato chiuso: controlla orari e chiusure", "{0} persone l'hanno trovato chiuso: controlla orari e chiusure"],
  anonymous: 'Conteggi anonimi: non vedi chi sono le persone, solo quante.',
  demand: 'Cosa cercano vicino a te',
  demandText: 'Ricerche e liste della spesa entro 5 km, negli ultimi 7 giorni.',
  demandNone: 'Per ora nella tua zona non manca nulla di quello che cercano.',
  searches: ['{0} ricerca', '{0} ricerche'],
  suppliersNone: 'nessun maso vicino lo vende',
  suppliers: ['solo {0} maso vicino lo vende', 'solo {0} masi vicini lo vendono'],
  iSellIt: 'Lo vendo',
  products: 'Prodotti e prezzi',
  available: 'Disponibile',
  finished: 'Finito',
  waitingFor: ['{0} persona lo aspetta: la avvisiamo appena lo rimetti', '{0} persone lo aspettano: le avvisiamo appena lo rimetti'],
  remove: 'Togli',
  removeConfirm: 'Togliere {0} dalla scheda?',
  chooseProduct: 'Aggiungi un prodotto…',
  add: 'Aggiungi',
  productsNote: 'Quando rimetti disponibile un prodotto, avvisiamo subito chi lo aspetta.',
  saved: 'Salvato',
  hours: 'Orari del negozio',
  vendingAlways: 'Il distributore resta sempre aperto, giorno e notte.',
  open: 'Aperto',
  afternoon: 'Anche il pomeriggio',
  saveHours: 'Salva gli orari',
  badHours: 'Controlla gli orari: ogni fascia deve finire dopo che comincia, e la seconda dopo la prima.',
  hoursSaved: 'Orari aggiornati',
  closures: 'Giorni di chiusura',
  closuresNone: 'Nessuna chiusura in programma',
  closedToday: 'Oggi resto chiuso',
  reopenToday: 'Oggi riapro',
  closedTodayText: 'Per un imprevisto: la scheda lo dice subito.',
  closedTodayDone: 'Segnato chiuso per oggi',
  reopenTodayDone: 'Riaperto: valgono gli orari di sempre',
  closureReason: 'Motivo, per esempio: ferie',
  addClosure: 'Aggiungi la chiusura',
  closureAdded: 'Chiusura aggiunta',
  closureRemoved: 'Chiusura tolta',
  defaultReason: 'Chiusura straordinaria',
  notice: 'Novità',
  noticePlaceholder: 'Cosa c’è di nuovo? Per esempio: da sabato fragole e asparagi',
  noticeUntil: 'Valida fino a',
  noticeHelp: 'La vedono le persone che ti seguono, nel riepilogo del giovedì e sulla scheda.',
  publish: 'Pubblica',
  removeNotice: 'Togli la novità',
  noticePublished: 'Novità pubblicata',
  noticeRemoved: 'Novità tolta',
  personal: 'Il link è personale: non inoltrarlo. Se lo perdi te ne mandiamo uno nuovo, e il vecchio smette di funzionare.',
  appHint: "Hai l'app Nostrano? Lo stesso link si apre anche lì.",
  leave: "Esci dall'area produttore",
  leaveConfirm: "Uscire dall'area produttore? Su questo telefono potrai aggiornare la scheda solo riaprendo il link.",
  left: "Sei uscito dall'area produttore",
  reset: 'Ripristina i dati di prova',
  resetDone: 'Dati di prova ripristinati',
  error_day_full: 'Quel giorno è già pieno di richieste.',
  error_bad_hours: 'Controlla gli orari: ogni fascia deve finire dopo che comincia, e la seconda dopo la prima.',
  error_bad_note: 'Il testo è troppo lungo.',
  error_bad_day: 'Scegli un giorno entro le prossime due settimane.',
  error_bad_items: 'Controlla i prodotti.',
  error_not_member: 'Questo browser non è più collegato al maso: riapri il link.',
  error_generic: 'Non riuscito: controlla la connessione e riprova.',
  appBanner: "Hai l'app Nostrano?",
  appBannerButton: "Apri nell'app",
  inReview: 'Scheda inviata: la controlliamo e la pubblichiamo al più presto. Intanto puoi cambiare ancora tutto.',
  hiddenFarm: 'Scheda nascosta: per ora non compare su Nostrano.',
  welcome: 'Benvenuto su Nostrano',
  welcomeText: 'Abbiamo preparato la scheda del tuo maso. Completala qui sotto: bastano pochi minuti. Quando è pronta la mandi a noi e la pubblichiamo.',
  stepProducts: 'Cosa vendi, con i prezzi',
  stepHours: 'Gli orari del negozio',
  stepDescription: 'Due righe sul maso',
  stepConsent: 'Il consenso a comparire su Nostrano',
  consentText: 'Accetto che la scheda del mio maso compaia su Nostrano con i dati scritti qui. Posso farla togliere quando voglio, con un messaggio.',
  giveConsent: 'Acconsento',
  consentGiven: 'Consenso dato, grazie',
  requestPublish: 'Invia per la pubblicazione',
  requestPublishMissing: 'Completa prima i punti qui sopra.',
  publishRequested: 'Inviata! Ti scriviamo quando è online',
  farm: 'Il maso',
  description: 'Descrizione',
  descriptionHelp: 'Due o tre frasi: cosa producete, da quanto tempo, cosa trova chi passa.',
  descriptionLang: 'Scritta in italiano. Chi usa Nostrano in tedesco vede questo testo finché non ne scrivi uno in tedesco: cambia lingua in alto.',
  descriptionPlaceholder: 'Per esempio: maso di famiglia sopra Appiano. Mele, succo e confetture fatte da noi; d’autunno anche castagne.',
  payments: 'Pagamenti',
  cash: 'Contanti',
  card: 'Carta o bancomat',
  shop: 'Negozio al maso',
  shopText: 'Si viene al maso negli orari di apertura.',
  vending: 'Distributore sempre aperto',
  vendingText: 'Un distributore o una casetta self-service, giorno e notte.',
  saveFarm: 'Salva',
  farmSaved: 'Scheda aggiornata',
  editProduct: 'Modifica',
  noPrice: 'Prezzo non indicato',
  detail: 'Varietà o dettaglio',
  detailPlaceholder: 'Per esempio: Golden e Fuji',
  priceFrom: 'Prezzo (€)',
  priceTo: 'Fino a (€), se varia',
  priceFor: 'Per',
  unit: 'Unità',
  pricePreview: 'Sulla scheda: {0}',
  priceHelp: 'Un prezzo indicativo aiuta a decidere se passare. Se cambia, scrivi da–a.',
  save: 'Salva',
  removeFromFarm: 'Togli dalla scheda',
  badPrice: 'Controlla il prezzo: scrivi un numero, e il secondo deve essere più alto del primo.',
  customProduct: 'Non c’è nell’elenco?',
  customName: 'Nome del prodotto',
  customNamePlaceholder: 'Per esempio: grappa di mele',
  category: 'Categoria',
  addCustom: 'Aggiungi il prodotto',
  customNote: 'Lo vedi subito sulla scheda; noi poi lo aggiungiamo all’elenco per tutti.',
  noProductsYet: 'Nessun prodotto ancora: aggiungi cosa vendi.',
  hoursNoShop: 'Senza negozio al maso gli orari non servono. Se ce l’hai, attivalo in «Il maso».',
  error_bad_price: 'Controlla il prezzo: scrivi un numero, e il secondo deve essere più alto del primo.',
  error_bad_name: 'Scrivi un nome tra 2 e 40 lettere.',
  error_incomplete: 'Manca ancora qualcosa: guarda i punti della lista.',
  error_too_many: 'Hai già aggiunto molti prodotti tuoi: scrivici se te ne servono altri.',
  error_bad_payments: 'Controlla i pagamenti.',
}

const de = {
  title: 'Bereich für Höfe',
  language: 'Sprache',
  loading: 'Wird geladen …',
  invalidLink: 'Ungültiger Link. Frag Nostrano auf WhatsApp nach einem neuen.',
  openLink: 'Öffne den Link, den wir dir auf WhatsApp geschickt haben',
  openLinkText: 'Der Link ist persönlich: Wer ihn hat, kann das Profil deines Hofs ändern. Wenn du ihn verloren hast, schreib uns und wir schicken dir einen neuen.',
  draft: 'Entwurf: Das Profil ist noch nicht veröffentlicht.',
  lastChecked: 'Zuletzt geprüft: {0}',
  allGood: 'Stimmt alles?',
  allGoodText: 'Wenn sich Öffnungszeiten und Produkte nicht geändert haben, genügt ein Tipp: Das Profil zeigt dann das heutige Datum.',
  confirm: 'Alles bestätigt',
  confirmedToday: 'Heute bestätigt',
  confirmedToast: 'Danke! Das Profil zeigt jetzt das heutige Datum',
  requests: 'Anfragen',
  requestsWaiting: 'Offen',
  requestsNone: 'Keine offenen Anfragen.',
  acceptRequests: 'Ich nehme Anfragen an',
  acceptRequestsText: 'Kunden bitten dich, Produkte für den Tag ihres Besuchs zurückzulegen.',
  maxPerDay: 'Höchstens pro Tag',
  keep: 'Leg ich zurück',
  dontHave: 'Hab ich nicht',
  otherDay: 'Anderer Tag',
  whichDay: 'Welchen Tag schlägst du vor?',
  replyPlaceholder: 'Ein paar Worte, wenn du willst',
  sendProposal: 'Vorschlag senden',
  cancel: 'Abbrechen',
  block: 'Melden und blockieren',
  blockConfirm: 'Diese Anfrage melden? Von diesem Handy bekommst du keine Anfragen mehr.',
  answered: 'Beantwortet',
  status_accepted: 'Du legst es zurück',
  status_declined: 'Hattest du nicht',
  status_other_day: 'Vorgeschlagen: {0}',
  status_cancelled: 'Vom Kunden zurückgezogen',
  status_expired: 'Verfallen',
  status_picked_up: 'Abgeholt',
  status_no_show: 'Nicht gekommen',
  toCollect: 'Zur Abholung',
  pickedUp: 'Abgeholt',
  noShow: 'Nicht gekommen',
  pickupMarked: 'Gespeichert',
  answerWithin: 'Antworte innerhalb von 12 Stunden: Danach verfällt die Anfrage und der Kunde wird benachrichtigt.',
  onRequest: 'Auf Anfrage',
  onRequestHelp: 'Du bereitest es zu, wenn jemand mit „Zurücklegen“ danach fragt.',
  answerSent: 'Antwort gesendet',
  blocked: 'Gemeldet: Von diesem Handy kommen keine Anfragen mehr',
  requestsOn: 'Anfragen aktiv',
  requestsOff: 'Anfragen aus: Die Schaltfläche verschwindet aus dem Profil',
  week: 'Diese Woche',
  views: 'Profilaufrufe',
  directions: 'Abgefragte Routen',
  followers: 'Folgen dir',
  waiting: 'Warten auf ein Produkt',
  trend: '{0} gegenüber der Vorwoche',
  confirmations: ['{0} Person fand diese Woche alles wie angegeben', '{0} Personen fanden diese Woche alles wie angegeben'],
  closedReports: ['{0} Person fand den Hof geschlossen: Prüfe Öffnungszeiten und Schließtage', '{0} Personen fanden den Hof geschlossen: Prüfe Öffnungszeiten und Schließtage'],
  anonymous: 'Anonyme Zählungen: Du siehst nicht, wer die Personen sind, nur wie viele.',
  demand: 'Was in deiner Nähe gesucht wird',
  demandText: 'Suchen und Einkaufslisten im Umkreis von 5 km, in den letzten 7 Tagen.',
  demandNone: 'In deiner Gegend fehlt gerade nichts von dem, was gesucht wird.',
  searches: ['{0} Suche', '{0} Suchen'],
  suppliersNone: 'kein Hof in der Nähe verkauft es',
  suppliers: ['nur {0} Hof in der Nähe verkauft es', 'nur {0} Höfe in der Nähe verkaufen es'],
  iSellIt: 'Verkaufe ich',
  products: 'Produkte und Preise',
  available: 'Verfügbar',
  finished: 'Ausverkauft',
  waitingFor: ['{0} Person wartet darauf: Wir benachrichtigen sie, sobald es wieder da ist', '{0} Personen warten darauf: Wir benachrichtigen sie, sobald es wieder da ist'],
  remove: 'Entfernen',
  removeConfirm: '{0} aus dem Profil entfernen?',
  chooseProduct: 'Produkt hinzufügen …',
  add: 'Hinzufügen',
  productsNote: 'Wenn du ein Produkt wieder verfügbar machst, benachrichtigen wir sofort alle, die darauf warten.',
  saved: 'Gespeichert',
  hours: 'Öffnungszeiten des Hofladens',
  vendingAlways: 'Der Automat ist immer geöffnet, Tag und Nacht.',
  open: 'Geöffnet',
  afternoon: 'Auch am Nachmittag',
  saveHours: 'Öffnungszeiten speichern',
  badHours: 'Prüfe die Zeiten: Jeder Zeitraum muss nach seinem Beginn enden, und der zweite nach dem ersten.',
  hoursSaved: 'Öffnungszeiten aktualisiert',
  closures: 'Schließtage',
  closuresNone: 'Keine Schließtage geplant',
  closedToday: 'Heute bleibe ich geschlossen',
  reopenToday: 'Heute doch geöffnet',
  closedTodayText: 'Bei einem Notfall: Das Profil zeigt es sofort.',
  closedTodayDone: 'Für heute als geschlossen markiert',
  reopenTodayDone: 'Wieder geöffnet: Es gelten die üblichen Zeiten',
  closureReason: 'Grund, zum Beispiel: Urlaub',
  addClosure: 'Schließtag hinzufügen',
  closureAdded: 'Schließtag hinzugefügt',
  closureRemoved: 'Schließtag entfernt',
  defaultReason: 'Außerordentlich geschlossen',
  notice: 'Neuigkeiten',
  noticePlaceholder: 'Was gibt es Neues? Zum Beispiel: ab Samstag Erdbeeren und Spargel',
  noticeUntil: 'Gültig bis',
  noticeHelp: 'Das sehen alle, die dir folgen, in der Donnerstags-Übersicht und im Profil.',
  publish: 'Veröffentlichen',
  removeNotice: 'Neuigkeit entfernen',
  noticePublished: 'Neuigkeit veröffentlicht',
  noticeRemoved: 'Neuigkeit entfernt',
  personal: 'Der Link ist persönlich: Leite ihn nicht weiter. Wenn du ihn verlierst, schicken wir dir einen neuen, und der alte funktioniert nicht mehr.',
  appHint: 'Hast du die App Nostrano? Derselbe Link öffnet sich auch dort.',
  leave: 'Bereich für Höfe verlassen',
  leaveConfirm: 'Bereich für Höfe verlassen? Auf diesem Handy kannst du das Profil erst wieder ändern, wenn du den Link erneut öffnest.',
  left: 'Du hast den Bereich für Höfe verlassen',
  reset: 'Testdaten wiederherstellen',
  resetDone: 'Testdaten wiederhergestellt',
  error_day_full: 'An diesem Tag gibt es schon zu viele Anfragen.',
  error_bad_hours: 'Prüfe die Zeiten: Jeder Zeitraum muss nach seinem Beginn enden, und der zweite nach dem ersten.',
  error_bad_note: 'Der Text ist zu lang.',
  error_bad_day: 'Wähle einen Tag in den nächsten zwei Wochen.',
  error_bad_items: 'Prüfe die Produkte.',
  error_not_member: 'Dieser Browser ist nicht mehr mit dem Hof verbunden: Öffne den Link erneut.',
  error_generic: 'Hat nicht geklappt: Prüfe die Verbindung und versuche es noch einmal.',
  appBanner: 'Hast du die App Nostrano?',
  appBannerButton: 'In der App öffnen',
  inReview: 'Profil gesendet: Wir prüfen es und veröffentlichen es so bald wie möglich. Bis dahin kannst du noch alles ändern.',
  hiddenFarm: 'Profil ausgeblendet: Es erscheint derzeit nicht auf Nostrano.',
  welcome: 'Willkommen bei Nostrano',
  welcomeText: 'Wir haben das Profil deines Hofs vorbereitet. Vervollständige es hier unten: Es dauert nur ein paar Minuten. Wenn es fertig ist, schickst du es uns und wir veröffentlichen es.',
  stepProducts: 'Was du verkaufst, mit Preisen',
  stepHours: 'Die Öffnungszeiten des Hofladens',
  stepDescription: 'Ein paar Zeilen über den Hof',
  stepConsent: 'Die Zustimmung, auf Nostrano zu erscheinen',
  consentText: 'Ich bin einverstanden, dass das Profil meines Hofs mit den hier angegebenen Daten auf Nostrano erscheint. Ich kann es jederzeit mit einer Nachricht entfernen lassen.',
  giveConsent: 'Ich stimme zu',
  consentGiven: 'Zustimmung erteilt, danke',
  requestPublish: 'Zur Veröffentlichung senden',
  requestPublishMissing: 'Vervollständige zuerst die Punkte oben.',
  publishRequested: 'Gesendet! Wir schreiben dir, sobald es online ist',
  farm: 'Der Hof',
  description: 'Beschreibung',
  descriptionHelp: 'Zwei oder drei Sätze: was ihr erzeugt, seit wann, was Besucher erwartet.',
  descriptionLang: 'Auf Deutsch geschrieben. Wer Nostrano auf Italienisch nutzt, sieht diesen Text, bis du einen italienischen schreibst: Sprache oben wechseln.',
  descriptionPlaceholder: 'Zum Beispiel: Familienhof oberhalb von Eppan. Äpfel, Saft und Marmeladen aus eigener Herstellung; im Herbst auch Kastanien.',
  payments: 'Bezahlung',
  cash: 'Bargeld',
  card: 'Karte oder Bankomat',
  shop: 'Hofladen',
  shopText: 'Man kommt zu den Öffnungszeiten auf den Hof.',
  vending: 'Automat, immer geöffnet',
  vendingText: 'Ein Automat oder ein Selbstbedienungshäuschen, Tag und Nacht.',
  saveFarm: 'Speichern',
  farmSaved: 'Profil aktualisiert',
  editProduct: 'Ändern',
  noPrice: 'Kein Preis angegeben',
  detail: 'Sorte oder Detail',
  detailPlaceholder: 'Zum Beispiel: Golden und Fuji',
  priceFrom: 'Preis (€)',
  priceTo: 'Bis (€), wenn er schwankt',
  priceFor: 'Für',
  unit: 'Einheit',
  pricePreview: 'Im Profil: {0}',
  priceHelp: 'Ein ungefährer Preis hilft bei der Entscheidung vorbeizukommen. Wenn er schwankt, gib von–bis an.',
  save: 'Speichern',
  removeFromFarm: 'Aus dem Profil entfernen',
  badPrice: 'Prüfe den Preis: Gib eine Zahl ein, und die zweite muss höher sein als die erste.',
  customProduct: 'Nicht in der Liste?',
  customName: 'Name des Produkts',
  customNamePlaceholder: 'Zum Beispiel: Apfelschnaps',
  category: 'Kategorie',
  addCustom: 'Produkt hinzufügen',
  customNote: 'Du siehst es sofort im Profil; wir nehmen es danach in die Liste für alle auf.',
  noProductsYet: 'Noch keine Produkte: Füge hinzu, was du verkaufst.',
  hoursNoShop: 'Ohne Hofladen braucht es keine Öffnungszeiten. Wenn du einen hast, schalte ihn unter „Der Hof“ ein.',
  error_bad_price: 'Prüfe den Preis: Gib eine Zahl ein, und die zweite muss höher sein als die erste.',
  error_bad_name: 'Gib einen Namen mit 2 bis 40 Zeichen ein.',
  error_incomplete: 'Es fehlt noch etwas: Sieh dir die Punkte der Liste an.',
  error_too_many: 'Du hast schon viele eigene Produkte hinzugefügt: Schreib uns, wenn du mehr brauchst.',
  error_bad_payments: 'Prüfe die Zahlungsarten.',
}

const strings = { it, de }

const MUNICIPALITIES = {
  bolzano: ['Bolzano', 'Bozen'], appiano: ['Appiano', 'Eppan'], caldaro: ['Caldaro', 'Kaltern'],
  terlano: ['Terlano', 'Terlan'], renon: ['Renon', 'Ritten'], sanGenesio: ['San Genesio', 'Jenesien'],
  laives: ['Laives', 'Leifers'], merano: ['Merano', 'Meran'], lana: ['Lana', 'Lana'],
  nalles: ['Nalles', 'Nals'], vadena: ['Vadena', 'Pfatten'], cornedo: ['Cornedo', 'Karneid'],
}

const CATEGORIES = {
  verdura: ['Verdura', 'Gemüse'], frutta: ['Frutta', 'Obst'], uova: ['Uova', 'Eier'], carne: ['Carne', 'Fleisch'],
  latticini: ['Latticini', 'Milchprodukte'], miele: ['Miele', 'Honig'], vino: ['Vino', 'Wein'],
  pane: ['Pane', 'Brot'], altro: ['Altro', 'Sonstiges'],
}

export const CATEGORY_CODES = Object.keys(CATEGORIES)

// Unità del prezzo, come nell'app: al singolare e al plurale.
const UNITS = {
  kg: [['kg', 'kg'], ['kg', 'kg']], g: [['g', 'g'], ['g', 'g']], l: [['l', 'l'], ['l', 'l']],
  pezzo: [['pezzo', 'pezzi'], ['Stück', 'Stück']], bottiglia: [['bottiglia', 'bottiglie'], ['Flasche', 'Flaschen']],
  vasetto: [['vasetto', 'vasetti'], ['Glas', 'Gläser']], mazzo: [['mazzo', 'mazzi'], ['Bund', 'Bund']],
  confezione: [['confezione', 'confezioni'], ['Packung', 'Packungen']],
}

export const UNIT_CODES = Object.keys(UNITS)

export function unitName(lang, unit, plural = false) {
  const names = UNITS[unit]
  return names ? names[lang === 'de' ? 1 : 0][plural ? 1 : 0] : unit
}

/** 2 → "2", 2.5 → "2,50": come si scrive un prezzo su un cartello. */
export function formatAmount(value) {
  const cents = Math.round(Number(value) * 100)
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2).replace('.', ',')
}

/** "1,50–2 €/kg", "4 € / 250 g", "2,80 € / 6 pezzi". Vuoto senza prezzo. */
export function priceText(lang, p) {
  if (p.price_min === null || p.price_min === undefined || p.price_min === '') return ''
  const quantity = Number(p.price_quantity ?? 1)
  let text = formatAmount(p.price_min)
  if (p.price_max !== null && p.price_max !== undefined && Number(p.price_max) > Number(p.price_min)) text += `–${formatAmount(p.price_max)}`
  const unit = p.price_unit ?? 'pezzo'
  return `${text} €${quantity <= 1 ? `/${unitName(lang, unit)}` : ` / ${quantity} ${unitName(lang, unit, true)}`}`
}

/** "2,50" o "2.5" → 2.5; vuoto → null; altro → NaN. */
export function parseAmount(text) {
  const value = String(text ?? '').trim().replace(/\s|€/g, '').replace(',', '.')
  if (!value) return null
  return /^\d+(\.\d{1,2})?$/.test(value) ? Number(value) : NaN
}

export const MUNICIPALITY_CODES = Object.keys(MUNICIPALITIES)

export function categoryName(lang, code) {
  const names = CATEGORIES[code]
  return names ? names[lang === 'de' ? 1 : 0] : code
}

const STORAGE_KEY = 'nostrano.lang'

export function initialLanguage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'it' || saved === 'de') return saved
  } catch { /* navigazione privata */ }
  return navigator.language?.toLowerCase().startsWith('de') ? 'de' : 'it'
}

export function rememberLanguage(lang) {
  try { localStorage.setItem(STORAGE_KEY, lang) } catch { /* navigazione privata */ }
}

/** Testo tradotto; con un numero sceglie tra singolare e plurale. */
export function t(lang, key, ...args) {
  let value = strings[lang][key] ?? strings.it[key] ?? key
  if (Array.isArray(value)) value = value[args[0] === 1 ? 0 : 1]
  return args.reduce((text, arg, i) => text.replaceAll(`{${i}}`, arg), value)
}

export function errorText(lang, error) {
  const key = `error_${error?.code}`
  return key in strings[lang] ? strings[lang][key] : strings[lang].error_generic
}

export function municipalityName(lang, code) {
  const names = MUNICIPALITIES[code]
  return names ? names[lang === 'de' ? 1 : 0] : code
}
