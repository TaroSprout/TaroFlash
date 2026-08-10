// Directives an importer reads, so nobody is asked to pick a separator. →[K:card-export-csv-format]
const HEADER_LINES = ['#separator:comma', '#html:false']

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

/** Deck title as a download filename — lowercased, hyphenated, `.csv`. */
export function deckExportFilename(title: string | undefined): string {
  const slug = (title ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // every run of non-alphanumerics collapses to one hyphen
    .replace(/^-+|-+$/g, '') // hyphens left stranded at the start or the end

  return `${slug || 'deck'}.csv`
}
