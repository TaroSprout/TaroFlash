const ANKI_HEADER_LINES = ['#separator:comma', '#html:false']

function escapeCsvField(value: string): string {
  if (!/[",\r\n]/.test(value)) return value
  return `"${value.replace(/"/g, '""')}"`
}

/**
 * One row per card, front then back, in the given order. Fields carrying a
 * comma, a quote, or a line break come back quoted per RFC 4180, and the two
 * `#key:value` header lines let Anki import without asking for a separator.
 */
export function cardsToCsv(cards: Card[]): string {
  const rows = cards.map(
    (card) => `${escapeCsvField(card.front_text ?? '')},${escapeCsvField(card.back_text ?? '')}`
  )

  return [...ANKI_HEADER_LINES, ...rows].join('\r\n')
}

/** Deck title as a download filename — lowercased, hyphenated, `.csv`. */
export function deckExportFilename(title: string | undefined): string {
  const slug = (title ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return `${slug || 'deck'}.csv`
}
