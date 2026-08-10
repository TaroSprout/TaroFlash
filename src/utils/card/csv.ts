// Directives an importer reads to configure itself, so nobody is asked to pick a separator.
const HEADER_LINES = ['#separator:comma', '#html:false']

/**
 * A single CSV field, quoted only when it has to be.
 *
 * A comma would otherwise start a new column, and a line break a new row, so a
 * field carrying either is wrapped in quotes — and any quote of its own is
 * doubled, which is how RFC 4180 writes a literal quote inside a quoted field.
 */
function escapeCsvField(value: string): string {
  // A quote, a comma, or either half of a line break — the characters a bare field can't hold.
  if (!/[",\r\n]/.test(value)) return value

  // Every quote in the value, doubled.
  return `"${value.replace(/"/g, '""')}"`
}

/**
 * The cards as a CSV file: one row each, front then back, in the order given.
 *
 * The header lines above the rows tell an importer how to read them.
 */
export function cardsToCsv(cards: Card[]): string {
  const rows = cards.map(
    (card) => `${escapeCsvField(card.front_text ?? '')},${escapeCsvField(card.back_text ?? '')}`
  )

  return [...HEADER_LINES, ...rows].join('\r\n')
}

/** Deck title as a download filename — lowercased, hyphenated, `.csv`. */
export function deckExportFilename(title: string | undefined): string {
  const slug = (title ?? '')
    .trim()
    .toLowerCase()
    // Every run of anything that isn't a letter or digit collapses to one hyphen.
    .replace(/[^a-z0-9]+/g, '-')
    // Hyphens left stranded at the start or the end.
    .replace(/^-+|-+$/g, '')

  return `${slug || 'deck'}.csv`
}
