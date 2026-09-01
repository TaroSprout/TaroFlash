// Directives an importer reads, so nobody is asked to pick a separator. The separator is written as
// the character rather than its name so a spreadsheet can detect it too. →[K:card-export-csv-format]
const HEADER_LINES = ['#separator:,', '#html:false']

/** A single CSV field, quoted only when it has to be. →[K:card-export-csv-format] */
function escapeCsvField(value: string): string {
  if (!/[",\r\n]/.test(value)) return value // a quote, a comma, or either half of a line break

  return `"${value.replace(/"/g, '""')}"` // every quote in the value, doubled
}

/** The cards as a CSV file: one row each, front then back, in the order given. */
export function cardsToCsv(cards: Card[]): string {
  const rows = cards.map(
    (card) => `${escapeCsvField(card.front_text ?? '')},${escapeCsvField(card.back_text ?? '')}`
  )

  return [...HEADER_LINES, ...rows].join('\r\n')
}

/** The most cards one file may add to a deck. */
export const CARD_IMPORT_LIMIT = 2000

/** What the file picker offers, so a member can't pick a file we can't read. */
export const CARD_IMPORT_ACCEPT = '.csv,.txt,text/csv,text/plain,text/tab-separated-values'

/** A card the member hasn't committed to the deck yet. */
export type CardImportRow = { front_text: string; back_text: string }

/** A row we couldn't make a card out of, shown to the member by its place in the file. */
export type SkippedImportLine = { line: number; text: string }

export type CardImportRefusal = 'invalid-type' | 'undecodable' | 'too-many'

export type CardImportResult =
  | { ok: true; cards: CardImportRow[]; skipped: SkippedImportLine[] }
  | { ok: false; refusal: CardImportRefusal }

type ImportRecord = { fields: string[] | null; line: number; text: string }

/** True when the file's name or type says it holds text we can read. */
export function isImportableCardFile(file: File): boolean {
  if (file.type.startsWith('text/')) return true
  if (file.type === 'application/csv') return true

  return /\.(csv|txt|tsv)$/i.test(file.name) && file.type === ''
}

/**
 * Which character separates the two sides, decided from the file rather than
 * asked of the member. Text inside quotes doesn't count — a comma there is
 * part of a card, not a separator.
 */
function sniffSeparator(text: string): string {
  let commas = 0
  let tabs = 0
  let quoted = false

  for (const char of text) {
    if (char === '"') quoted = !quoted
    else if (quoted) continue
    else if (char === ',') commas++
    else if (char === '\t') tabs++
  }

  return tabs > commas ? '\t' : ','
}

const QUOTE = '"'

/** One field's text, where the row continues, and how many lines it spanned. */
type FieldRead = {
  value: string
  next: number
  lines: number
  readable: boolean
}

function isLineEnd(char: string | undefined): boolean {
  return char === '\r' || char === '\n'
}

/** Steps over one line ending, counting a CRLF pair as the single break it is. */
function skipLineEnd(text: string, i: number): number {
  return text[i] === '\r' && text[i + 1] === '\n' ? i + 2 : i + 1
}

/**
 * Reads a field wrapped in quotes, starting at the opening one.
 *
 * A doubled quote inside stands for one literal quote, and a line break inside
 * belongs to the field rather than ending the row. Quoting that never closes,
 * or that runs on into more text after closing, means the row was never the
 * shape it looked like — it comes back unreadable rather than half-guessed.
 */
function readQuotedField(text: string, start: number, separator: string): FieldRead {
  let i = start + 1
  let value = ''
  let lines = 0
  let closed = false

  while (i < text.length && !closed) {
    if (text[i] === QUOTE && text[i + 1] === QUOTE) {
      value += QUOTE
      i += 2
      continue
    }

    if (text[i] === QUOTE) {
      closed = true
      i++
      continue
    }

    if (text[i] === '\n') lines++
    value += text[i]
    i++
  }

  const after = text[i]
  const ends_cleanly = after === undefined || after === separator || isLineEnd(after)

  return { value, next: i, lines, readable: closed && ends_cleanly }
}

/** Reads a plain field, up to the next separator or the end of the row. */
function readBareField(text: string, start: number, separator: string): FieldRead {
  let i = start

  while (i < text.length && text[i] !== separator && !isLineEnd(text[i])) i++

  return { value: text.slice(start, i), next: i, lines: 0, readable: true }
}

function readField(text: string, start: number, separator: string): FieldRead {
  if (text[start] === QUOTE) return readQuotedField(text, start, separator)

  return readBareField(text, start, separator)
}

/** One row's fields, where the next row starts, and how many lines this one used. */
type RecordRead = {
  record: ImportRecord
  next: number
  lines: number
}

/**
 * Reads one row, up to and including the line break that ends it.
 *
 * A row with any unreadable field keeps its raw text and no fields, so the
 * member sees it listed as skipped instead of losing the rest of the file.
 */
function readRecord(
  text: string,
  start: number,
  start_line: number,
  separator: string
): RecordRead {
  const fields: string[] = []
  let i = start
  let lines = 0
  let readable = true

  while (i < text.length) {
    const field = readField(text, i, separator)

    fields.push(field.value)
    lines += field.lines
    readable &&= field.readable
    i = field.next

    if (text[i] !== separator) break
    i++
  }

  // Swallow a malformed row's tail, or the next row starts mid-line and reads as a card.
  while (i < text.length && !isLineEnd(text[i])) {
    readable = false
    i++
  }

  if (isLineEnd(text[i])) {
    i = skipLineEnd(text, i)
    lines++
  }

  const record = {
    fields: readable ? fields : null,
    line: start_line,
    text: text.slice(start, i).replace(/\r?\n$/, '')
  }

  return { record, next: i, lines }
}

/**
 * Splits the file into rows, one per card, keeping the line each started on.
 *
 * A quoted field may run over several lines, so this walks the text rather
 * than the lines.
 */
function readRecords(text: string, separator: string): ImportRecord[] {
  const records: ImportRecord[] = []
  let i = 0
  let line = 1

  while (i < text.length) {
    const { record, next, lines } = readRecord(text, i, line, separator)

    records.push(record)
    i = next
    line += lines
  }

  return records
}

/** True for a row the member never meant as a card — an empty line, or a `#` directive line. */
function isIgnorable(record: ImportRecord): boolean {
  const trimmed = record.text.trim()

  return trimmed === '' || trimmed.startsWith('#')
}

/**
 * The cards some text holds, plus the rows we couldn't read.
 *
 * Refuses it outright — nothing loads — when it holds more cards than a deck
 * may take at once.
 */
export function parseCardText(text: string): CardImportResult {
  const separator = sniffSeparator(text)
  const records = readRecords(text, separator)

  const cards: CardImportRow[] = []
  const skipped: SkippedImportLine[] = []

  for (const record of records) {
    if (isIgnorable(record)) continue

    if (!record.fields) {
      skipped.push({ line: record.line, text: record.text })
      continue
    }

    // A card is only ever two sides; later columns belong to the exporting app.
    cards.push({
      front_text: record.fields[0] ?? '',
      back_text: record.fields[1] ?? ''
    })
  }

  if (cards.length > CARD_IMPORT_LIMIT) return { ok: false, refusal: 'too-many' }

  return { ok: true, cards, skipped }
}

/**
 * The cards a file holds, read as UTF-8.
 *
 * Bad bytes decode to `�` rather than failing, so that character is the only
 * sign the file isn't the text it claims to be. →[K:card-export-csv-format]
 */
export function parseCardImport(buffer: ArrayBuffer): CardImportResult {
  const text = new TextDecoder('utf-8').decode(buffer)
  if (text.includes('�')) return { ok: false, refusal: 'undecodable' }

  return parseCardText(text)
}

/** Deck title as a download filename — lowercased, hyphenated, `.csv`. */
export function deckExportFilename(title: string | undefined): string {
  const slug = (title ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // every run of non-alphanumerics collapses to one hyphen
    .replace(/^-+|-+$/g, '') // hyphens left stranded at the start or the end

  return `${slug || 'deck'}.csv`
}
