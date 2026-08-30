import { describe, test, expect } from 'vite-plus/test'
import {
  cardsToCsv,
  deckExportFilename,
  parseCardText,
  parseCardImport,
  isImportableCardFile,
  CARD_IMPORT_LIMIT
} from '@/utils/card/csv'
import { card } from '@tests/fixtures/card'

function makeFile(contents, { name = 'cards.csv', type = 'text/csv' } = {}) {
  return new File([contents], name, { type })
}

function makeCard(overrides = {}) {
  return card.one({ overrides })
}

describe('cardsToCsv', () => {
  test('starts with the two importer header lines', () => {
    const csv = cardsToCsv([makeCard({ front_text: 'a', back_text: 'b' })])
    const lines = csv.split('\r\n')
    expect(lines[0]).toBe('#separator:,')
    expect(lines[1]).toBe('#html:false')
  })

  test('emits one row per card, front then back, in input order', () => {
    const cards = [
      makeCard({ front_text: 'first-front', back_text: 'first-back' }),
      makeCard({ front_text: 'second-front', back_text: 'second-back' })
    ]
    const lines = cardsToCsv(cards).split('\r\n')
    expect(lines.slice(2)).toEqual(['first-front,first-back', 'second-front,second-back'])
  })

  test('a field with no comma, quote, or line break is left untouched', () => {
    const csv = cardsToCsv([makeCard({ front_text: 'plain front', back_text: 'plain back' })])
    expect(csv.split('\r\n')[2]).toBe('plain front,plain back')
  })

  test('quotes a front field containing a comma', () => {
    const csv = cardsToCsv([makeCard({ front_text: 'a, b', back_text: 'plain' })])
    expect(csv.split('\r\n')[2]).toBe('"a, b",plain')
  })

  test('quotes a back field containing a comma', () => {
    const csv = cardsToCsv([makeCard({ front_text: 'plain', back_text: 'a, b' })])
    expect(csv.split('\r\n')[2]).toBe('plain,"a, b"')
  })

  test('quotes a field containing a double quote and doubles the embedded quote', () => {
    const csv = cardsToCsv([makeCard({ front_text: 'say "hi"', back_text: 'plain' })])
    expect(csv.split('\r\n')[2]).toBe('"say ""hi""",plain')
  })

  test('quotes a field containing a line break (LF)', () => {
    const csv = cardsToCsv([makeCard({ front_text: 'line1\nline2', back_text: 'plain' })])
    expect(csv.split('\r\n')[2]).toBe('"line1\nline2",plain')
  })

  test('quotes a field containing a line break (CR)', () => {
    const csv = cardsToCsv([makeCard({ front_text: 'line1\rline2', back_text: 'plain' })])
    expect(csv.split('\r\n')[2]).toBe('"line1\rline2",plain')
  })

  test('never emits notes, image paths, or review fields even when the card carries them', () => {
    const c = makeCard({
      front_text: 'front',
      back_text: 'back',
      front_image_path: '/img/front.png',
      back_image_path: '/img/back.png',
      review: { due: '2026-01-01', ease: 3 }
    })
    const csv = cardsToCsv([c])
    expect(csv.split('\r\n')[2]).toBe('front,back')
  })

  test('an empty card list produces just the two header lines', () => {
    expect(cardsToCsv([])).toBe('#separator:,\r\n#html:false')
  })
})

describe('deckExportFilename', () => {
  test('kebab-cases a title with spaces and mixed case', () => {
    expect(deckExportFilename('My Spanish Deck')).toBe('my-spanish-deck.csv')
  })

  test('collapses runs of non-alphanumeric characters to a single hyphen', () => {
    expect(deckExportFilename('Deck!! -- ##2')).toBe('deck-2.csv')
  })

  test('strips leading and trailing hyphens', () => {
    expect(deckExportFilename('  -Weird Title-  ')).toBe('weird-title.csv')
  })

  test('falls back to deck.csv when the title is undefined', () => {
    expect(deckExportFilename(undefined)).toBe('deck.csv')
  })

  test('falls back to deck.csv when the title is blank/whitespace-only', () => {
    expect(deckExportFilename('   ')).toBe('deck.csv')
  })
})

describe('parseCardText — separator sniffing', () => {
  test('a comma-separated file and a tab-separated file with the same content parse into the same cards', () => {
    const commaResult = parseCardText('front1,back1\nfront2,back2')
    const tabResult = parseCardText('front1\tback1\nfront2\tback2')
    expect(commaResult.ok).toBe(true)
    expect(tabResult.ok).toBe(true)
    expect(commaResult.cards).toEqual(tabResult.cards)
    expect(commaResult.cards).toEqual([
      { front_text: 'front1', back_text: 'back1' },
      { front_text: 'front2', back_text: 'back2' }
    ])
  })

  test('a comma inside a quoted field does not count toward the separator sniff', () => {
    // Only tabs separate fields here; the comma is inside quotes on every row,
    // so a naive count would wrongly call it a comma file.
    const text = '"a, b"\tback1\n"c, d"\tback2'
    const result = parseCardText(text)
    expect(result.ok).toBe(true)
    expect(result.cards).toEqual([
      { front_text: 'a, b', back_text: 'back1' },
      { front_text: 'c, d', back_text: 'back2' }
    ])
  })
})

describe('parseCardText / cardsToCsv round-trip', () => {
  test('a file written by the exporter round-trips: header lines are skipped silently, every card comes back', () => {
    const cards = [
      makeCard({ front_text: 'front1', back_text: 'back1' }),
      makeCard({ front_text: 'front2', back_text: 'back2' })
    ]
    const csv = cardsToCsv(cards)
    const result = parseCardText(csv)
    expect(result.ok).toBe(true)
    expect(result.skipped).toEqual([])
    expect(result.cards).toEqual([
      { front_text: 'front1', back_text: 'back1' },
      { front_text: 'front2', back_text: 'back2' }
    ])
  })
})

describe('parseCardText — ignorable lines', () => {
  test('blank lines and a leading # line are skipped without being reported in skipped', () => {
    const text = '#separator:,\n\nfront1,back1\n\nfront2,back2'
    const result = parseCardText(text)
    expect(result.ok).toBe(true)
    expect(result.skipped).toEqual([])
    expect(result.cards).toEqual([
      { front_text: 'front1', back_text: 'back1' },
      { front_text: 'front2', back_text: 'back2' }
    ])
  })
})

describe('parseCardText — column count edge cases', () => {
  test('a row with more than two columns imports its first two and reports nothing', () => {
    const result = parseCardText('front1,back1,extra1,extra2')
    expect(result.ok).toBe(true)
    expect(result.skipped).toEqual([])
    expect(result.cards).toEqual([{ front_text: 'front1', back_text: 'back1' }])
  })

  test('a row with one value imports as front-filled/back-empty', () => {
    const result = parseCardText('onlyfront')
    expect(result.ok).toBe(true)
    expect(result.skipped).toEqual([])
    expect(result.cards).toEqual([{ front_text: 'onlyfront', back_text: '' }])
  })
})

describe('parseCardText — multi-line quoted fields', () => {
  test('a quoted field spanning several lines stays one card, with newlines intact, and the next record line number accounts for them', () => {
    const text = '"line1\nline2\nline3",back1\nfront2,back2'
    const result = parseCardText(text)
    expect(result.ok).toBe(true)
    expect(result.cards).toEqual([
      { front_text: 'line1\nline2\nline3', back_text: 'back1' },
      { front_text: 'front2', back_text: 'back2' }
    ])
  })

  test('an unterminated quote is reported in skipped with its line and text; every other record still imports', () => {
    // An unterminated quote consumes to end-of-text, so it can only ever be
    // the last record in a file — the good records ahead of it still import.
    const text = 'front1,back1\nfront2,back2\n"unterminated,back3'
    const result = parseCardText(text)
    expect(result.ok).toBe(true)
    expect(result.cards).toEqual([
      { front_text: 'front1', back_text: 'back1' },
      { front_text: 'front2', back_text: 'back2' }
    ])
    expect(result.skipped).toHaveLength(1)
    expect(result.skipped[0].line).toBe(3)
    expect(result.skipped[0].text).toContain('unterminated')
  })

  test('a doubled quote inside a quoted field decodes to one literal quote character', () => {
    const text = '"say ""hi""",back1'
    const result = parseCardText(text)
    expect(result.ok).toBe(true)
    expect(result.cards).toEqual([{ front_text: 'say "hi"', back_text: 'back1' }])
  })

  test('trailing text after a closing quote (not a separator or line end) is unreadable', () => {
    const text = '"abc"xyz,def\nfront2,back2'
    const result = parseCardText(text)
    expect(result.ok).toBe(true)
    expect(result.skipped).toHaveLength(1)
    expect(result.skipped[0].line).toBe(1)
    expect(result.cards).toEqual([{ front_text: 'front2', back_text: 'back2' }])
  })
})

describe('parseCardText — import limit', () => {
  test('over CARD_IMPORT_LIMIT cards returns ok:false, refusal:too-many, and no cards', () => {
    const lines = Array.from(
      { length: CARD_IMPORT_LIMIT + 1 },
      (_, i) => `front${i},back${i}`
    ).join('\n')
    const result = parseCardText(lines)
    expect(result).toEqual({ ok: false, refusal: 'too-many' })
  })

  test('exactly CARD_IMPORT_LIMIT cards is accepted', () => {
    const lines = Array.from({ length: CARD_IMPORT_LIMIT }, (_, i) => `front${i},back${i}`).join(
      '\n'
    )
    const result = parseCardText(lines)
    expect(result.ok).toBe(true)
    expect(result.cards).toHaveLength(CARD_IMPORT_LIMIT)
  })
})

describe('parseCardImport — UTF-8 decoding', () => {
  test('refuses a buffer whose bytes do not decode as UTF-8, detected via the replacement character', () => {
    // 0xFF 0xFE is not valid UTF-8 and decodes to U+FFFD.
    const buffer = new Uint8Array([0xff, 0xfe, 0x61]).buffer
    const result = parseCardImport(buffer)
    expect(result).toEqual({ ok: false, refusal: 'undecodable' })
  })

  test('parses a valid UTF-8 buffer normally', () => {
    const buffer = new TextEncoder().encode('front1,back1').buffer
    const result = parseCardImport(buffer)
    expect(result.ok).toBe(true)
    expect(result.cards).toEqual([{ front_text: 'front1', back_text: 'back1' }])
  })
})

describe('isImportableCardFile', () => {
  test('accepts a text/* MIME type', () => {
    expect(isImportableCardFile(makeFile('a', { name: 'foo.dat', type: 'text/csv' }))).toBe(true)
    expect(
      isImportableCardFile(makeFile('a', { name: 'foo.dat', type: 'text/tab-separated-values' }))
    ).toBe(true)
  })

  test('accepts a .csv/.txt/.tsv name with an empty MIME type', () => {
    expect(isImportableCardFile(makeFile('a', { name: 'cards.csv', type: '' }))).toBe(true)
    expect(isImportableCardFile(makeFile('a', { name: 'cards.txt', type: '' }))).toBe(true)
    expect(isImportableCardFile(makeFile('a', { name: 'cards.tsv', type: '' }))).toBe(true)
  })

  test('rejects a non-text MIME type with a matching extension', () => {
    expect(
      isImportableCardFile(makeFile('a', { name: 'cards.csv', type: 'application/octet-stream' }))
    ).toBe(false)
  })

  test('rejects an unrecognised extension with an empty MIME type', () => {
    expect(isImportableCardFile(makeFile('a', { name: 'cards.pdf', type: '' }))).toBe(false)
  })
})
