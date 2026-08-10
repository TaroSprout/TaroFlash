import { describe, test, expect } from 'vite-plus/test'
import { cardsToCsv, deckExportFilename } from '@/utils/card/csv'
import { card } from '@tests/fixtures/card'

function makeCard(overrides = {}) {
  return card.one({ overrides })
}

describe('cardsToCsv', () => {
  test('starts with the two Anki header lines [obligation]', () => {
    const csv = cardsToCsv([makeCard({ front_text: 'a', back_text: 'b' })])
    const lines = csv.split('\r\n')
    expect(lines[0]).toBe('#separator:comma')
    expect(lines[1]).toBe('#html:false')
  })

  test('emits one row per card, front then back, in input order [obligation]', () => {
    const cards = [
      makeCard({ front_text: 'first-front', back_text: 'first-back' }),
      makeCard({ front_text: 'second-front', back_text: 'second-back' })
    ]
    const lines = cardsToCsv(cards).split('\r\n')
    expect(lines.slice(2)).toEqual(['first-front,first-back', 'second-front,second-back'])
  })

  test('a field with no comma, quote, or line break is left untouched [obligation]', () => {
    const csv = cardsToCsv([makeCard({ front_text: 'plain front', back_text: 'plain back' })])
    expect(csv.split('\r\n')[2]).toBe('plain front,plain back')
  })

  test('quotes a front field containing a comma [obligation]', () => {
    const csv = cardsToCsv([makeCard({ front_text: 'a, b', back_text: 'plain' })])
    expect(csv.split('\r\n')[2]).toBe('"a, b",plain')
  })

  test('quotes a back field containing a comma [obligation]', () => {
    const csv = cardsToCsv([makeCard({ front_text: 'plain', back_text: 'a, b' })])
    expect(csv.split('\r\n')[2]).toBe('plain,"a, b"')
  })

  test('quotes a field containing a double quote and doubles the embedded quote [obligation]', () => {
    const csv = cardsToCsv([makeCard({ front_text: 'say "hi"', back_text: 'plain' })])
    expect(csv.split('\r\n')[2]).toBe('"say ""hi""",plain')
  })

  test('quotes a field containing a line break (LF) [obligation]', () => {
    const csv = cardsToCsv([makeCard({ front_text: 'line1\nline2', back_text: 'plain' })])
    expect(csv.split('\r\n')[2]).toBe('"line1\nline2",plain')
  })

  test('quotes a field containing a line break (CR) [obligation]', () => {
    const csv = cardsToCsv([makeCard({ front_text: 'line1\rline2', back_text: 'plain' })])
    expect(csv.split('\r\n')[2]).toBe('"line1\rline2",plain')
  })

  test('never emits notes, image paths, or review fields even when the card carries them [obligation]', () => {
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
    expect(cardsToCsv([])).toBe('#separator:comma\r\n#html:false')
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
