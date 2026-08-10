import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'

const { modalOpenMock, emitSfxMock, mockT } = vi.hoisted(() => ({
  modalOpenMock: vi.fn(),
  emitSfxMock: vi.fn(),
  mockT: vi.fn((key, params) => (params ? `${key}:${JSON.stringify(params)}` : key))
}))

const { mockNotice } = vi.hoisted(() => ({
  mockNotice: { error: vi.fn(), success: vi.fn(), warn: vi.fn() }
}))

const { bulkInsertMock } = vi.hoisted(() => ({
  bulkInsertMock: vi.fn().mockResolvedValue([])
}))

const { parseCardImportMock, parseCardTextMock, isImportableCardFileMock } = vi.hoisted(() => ({
  parseCardImportMock: vi.fn(),
  parseCardTextMock: vi.fn(),
  isImportableCardFileMock: vi.fn()
}))

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: mockT }) }))
vi.mock('@/composables/modal', () => ({ useModal: () => ({ open: modalOpenMock }) }))
vi.mock('@/sfx/bus', () => ({ emitSfx: emitSfxMock }))
vi.mock('@/stores/notice-store', () => ({ useNoticeStore: () => mockNotice }))
vi.mock('@/views/deck/card-import/skipped-lines-dialog.vue', () => ({ default: {} }))
vi.mock('@/api/cards', () => ({
  useBulkInsertCardsInDeckMutation: () => ({ mutateAsync: bulkInsertMock })
}))
vi.mock('@/utils/card/csv', () => ({
  parseCardImport: parseCardImportMock,
  parseCardText: parseCardTextMock,
  isImportableCardFile: isImportableCardFileMock
}))

import { useCardImport } from '@/views/deck/composables/card-import'

function makeEditor(opts = {}) {
  return {
    deck_id: opts.deck_id ?? 10,
    guardAddCards: opts.guardAddCards ?? vi.fn().mockResolvedValue(true),
    handleLimitError: opts.handleLimitError ?? vi.fn().mockReturnValue(false)
  }
}

function makeShell(opts = {}) {
  return { exitMode: opts.exitMode ?? vi.fn() }
}

function makeFile(name = 'cards.csv') {
  return {
    name,
    arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(0))
  }
}

function setup(opts = {}) {
  const editor = opts.editor ?? makeEditor(opts.editorOpts)
  const shell = opts.shell ?? makeShell(opts.shellOpts)
  const draft = useCardImport({ editor, shell })
  return { draft, editor, shell }
}

beforeEach(() => {
  modalOpenMock.mockReset()
  emitSfxMock.mockReset()
  mockT.mockClear()
  mockNotice.error.mockReset()
  mockNotice.success.mockReset()
  bulkInsertMock.mockReset()
  bulkInsertMock.mockResolvedValue([])
  parseCardImportMock.mockReset()
  parseCardTextMock.mockReset()
  isImportableCardFileMock.mockReset()
  isImportableCardFileMock.mockReturnValue(true)
})

describe('useCardImport — is_expanded', () => {
  test('starts true', () => {
    const { draft } = setup()
    expect(draft.is_expanded.value).toBe(true)
  })

  test('flips to false the moment a parse yields at least one card', () => {
    const { draft } = setup()
    draft.setSource('text')
    parseCardTextMock.mockReturnValue({
      ok: true,
      cards: [{ front_text: 'a', back_text: 'b' }],
      skipped: []
    })
    draft.loadText('a,b')
    expect(draft.is_expanded.value).toBe(false)
  })

  test('stays true when a parse yields zero cards', () => {
    const { draft } = setup()
    draft.setSource('text')
    parseCardTextMock.mockReturnValue({ ok: true, cards: [], skipped: [] })
    draft.loadText('#directive')
    expect(draft.is_expanded.value).toBe(true)
  })
})

describe('useCardImport — setSource keeps each source draft [obligation]', () => {
  test('typing text, switching to file, and switching back preserves the typed draft', () => {
    const { draft } = setup()
    draft.setSource('text')
    parseCardTextMock.mockReturnValue({
      ok: true,
      cards: [{ front_text: 'a', back_text: 'b' }],
      skipped: []
    })
    draft.loadText('a,b')
    expect(draft.has_cards.value).toBe(true)

    draft.setSource('file')
    expect(draft.has_cards.value).toBe(false) // file source is empty
    expect(draft.pasted_text.value).toBe('a,b') // text draft untouched

    draft.setSource('text')
    expect(draft.has_cards.value).toBe(true)
    expect(draft.cards.value).toEqual([{ front_text: 'a', back_text: 'b' }])
  })

  test('is a no-op when set to the same source', () => {
    const { draft } = setup()
    draft.setSource('text')
    parseCardTextMock.mockReturnValue({
      ok: true,
      cards: [{ front_text: 'a', back_text: 'b' }],
      skipped: []
    })
    draft.loadText('a,b')

    draft.setSource('text') // already 'text'

    expect(draft.has_cards.value).toBe(true)
  })
})

describe('useCardImport — cards/skipped/refusal are per-source computeds [obligation]', () => {
  test('with text loaded but the file source active, has_cards reads false off the empty file draft', () => {
    const { draft } = setup()
    draft.setSource('text')
    parseCardTextMock.mockReturnValue({
      ok: true,
      cards: [{ front_text: 'a', back_text: 'b' }],
      skipped: []
    })
    draft.loadText('a,b')
    expect(draft.has_cards.value).toBe(true)

    draft.setSource('file')

    expect(draft.has_cards.value).toBe(false)
    expect(draft.cards.value).toEqual([])
    expect(draft.skipped.value).toEqual([])
    expect(draft.refusal.value).toBeNull()
  })
})

describe('useCardImport — loadFile / isImportableCardFile', () => {
  test('a rejected file sets refusal invalid-type and leaves file_name null and cards empty', async () => {
    isImportableCardFileMock.mockReturnValue(false)
    const { draft } = setup()

    await draft.loadFile(makeFile('virus.exe'))

    expect(draft.refusal.value).toBe('invalid-type')
    expect(draft.file_name.value).toBeNull()
    expect(draft.cards.value).toEqual([])
    expect(parseCardImportMock).not.toHaveBeenCalled()
  })

  test('an accepted file is parsed and its name recorded', async () => {
    isImportableCardFileMock.mockReturnValue(true)
    parseCardImportMock.mockReturnValue({
      ok: true,
      cards: [{ front_text: 'a', back_text: 'b' }],
      skipped: []
    })
    const { draft } = setup()

    await draft.loadFile(makeFile('deck.csv'))

    expect(draft.file_name.value).toBe('deck.csv')
    expect(draft.cards.value).toEqual([{ front_text: 'a', back_text: 'b' }])
  })
})

describe('useCardImport — sfx contract [obligation]', () => {
  test('loadFile chimes music_plink_ok only when the parse succeeds', async () => {
    isImportableCardFileMock.mockReturnValue(true)
    parseCardImportMock.mockReturnValue({
      ok: true,
      cards: [{ front_text: 'a', back_text: 'b' }],
      skipped: []
    })
    const { draft } = setup()

    await draft.loadFile(makeFile('deck.csv'))

    expect(emitSfxMock).toHaveBeenCalledWith('music_plink_ok')
  })

  test('loadFile does not chime music_plink_ok when the file is refused', async () => {
    isImportableCardFileMock.mockReturnValue(false)
    const { draft } = setup()

    await draft.loadFile(makeFile('virus.exe'))

    expect(emitSfxMock).not.toHaveBeenCalledWith('music_plink_ok')
  })

  test('loadText never chimes, even on a successful parse — it re-parses every keystroke', () => {
    const { draft } = setup()
    draft.setSource('text')
    parseCardTextMock.mockReturnValue({
      ok: true,
      cards: [{ front_text: 'a', back_text: 'b' }],
      skipped: []
    })

    draft.loadText('a,b')

    expect(emitSfxMock).not.toHaveBeenCalledWith('music_plink_ok')
  })

  test('toggleExpanded emits snappy_button_5', () => {
    const { draft } = setup()
    draft.toggleExpanded()
    expect(emitSfxMock).toHaveBeenCalledWith('snappy_button_5')
  })
})

describe('useCardImport — commit', () => {
  function primeCards(draft, cards = [{ front_text: 'a', back_text: 'b' }]) {
    draft.setSource('text')
    parseCardTextMock.mockReturnValue({ ok: true, cards, skipped: [] })
    draft.loadText('seed')
  }

  test('calls guardAddCards(cards.length) and writes nothing when it resolves false', async () => {
    const guardAddCards = vi.fn().mockResolvedValue(false)
    const editor = makeEditor({ guardAddCards })
    const { draft } = setup({ editor })
    primeCards(draft, [
      { front_text: 'a', back_text: 'b' },
      { front_text: 'c', back_text: 'd' }
    ])

    await draft.commit()

    expect(guardAddCards).toHaveBeenCalledWith(2)
    expect(bulkInsertMock).not.toHaveBeenCalled()
    expect(mockNotice.success).not.toHaveBeenCalled()
  })

  test('a thrown PT402 routes through handleLimitError rather than the generic toast', async () => {
    const pt402 = { code: 'PT402' }
    bulkInsertMock.mockRejectedValueOnce(pt402)
    const handleLimitError = vi.fn().mockReturnValue(true)
    const editor = makeEditor({ handleLimitError })
    const { draft } = setup({ editor })
    primeCards(draft)

    await draft.commit()

    expect(handleLimitError).toHaveBeenCalledWith(pt402)
    expect(mockNotice.error).not.toHaveBeenCalled()
  })

  test('a non-PT402 error falls back to the generic error toast', async () => {
    const generic = new Error('boom')
    bulkInsertMock.mockRejectedValueOnce(generic)
    const handleLimitError = vi.fn().mockReturnValue(false)
    const editor = makeEditor({ handleLimitError })
    const { draft } = setup({ editor })
    primeCards(draft)

    await draft.commit()

    expect(handleLimitError).toHaveBeenCalledWith(generic)
    expect(mockNotice.error).toHaveBeenCalled()
  })

  test('toasts cards-imported with the real count, then exits the mode and clears both drafts', async () => {
    const exitMode = vi.fn()
    const shell = makeShell({ exitMode })
    const { draft } = setup({ shell })
    primeCards(draft, [
      { front_text: 'a', back_text: 'b' },
      { front_text: 'c', back_text: 'd' },
      { front_text: 'e', back_text: 'f' }
    ])

    await draft.commit()

    expect(mockT).toHaveBeenCalledWith('toast.success.cards-imported', { count: 3 })
    expect(mockNotice.success).toHaveBeenCalledOnce()
    expect(exitMode).toHaveBeenCalledOnce()
    expect(draft.cards.value).toEqual([])
    expect(draft.has_cards.value).toBe(false)
  })

  test('a successful commit exits via close(), with no sfx argument — never the refusal chime [obligation]', async () => {
    const exitMode = vi.fn()
    const shell = makeShell({ exitMode })
    const { draft } = setup({ shell })
    primeCards(draft)

    await draft.commit()

    expect(exitMode).toHaveBeenCalledWith()
    expect(exitMode).not.toHaveBeenCalledWith('digi_powerdown')
  })

  test('nothing reaches the deck before commit runs — loadText/loadFile never call the mutation', () => {
    const { draft } = setup()
    primeCards(draft)
    expect(bulkInsertMock).not.toHaveBeenCalled()
  })

  test('is a no-op with no cards loaded', async () => {
    const { draft } = setup()
    await draft.commit()
    expect(bulkInsertMock).not.toHaveBeenCalled()
  })
})

describe('useCardImport — duplicate cards are never de-duplicated against the deck', () => {
  test('duplicate rows in the parsed file all pass through to the bulk-insert payload, in file order', async () => {
    const { draft } = setup()
    draft.setSource('text')
    const cards = [
      { front_text: 'same', back_text: 'same' },
      { front_text: 'same', back_text: 'same' },
      { front_text: 'same', back_text: 'same' }
    ]
    parseCardTextMock.mockReturnValue({ ok: true, cards, skipped: [] })
    draft.loadText('seed')

    await draft.commit()

    const [args] = bulkInsertMock.mock.calls[0]
    expect(args.cards).toEqual(cards)
    expect(args.cards).toHaveLength(3)
  })
})

describe('useCardImport — clear resets only the active source [obligation]', () => {
  test('clearing a loaded file leaves typed text intact', () => {
    const { draft } = setup()
    draft.setSource('text')
    parseCardTextMock.mockReturnValue({
      ok: true,
      cards: [{ front_text: 'a', back_text: 'b' }],
      skipped: []
    })
    draft.loadText('a,b')

    draft.setSource('file')
    isImportableCardFileMock.mockReturnValue(true)
    parseCardImportMock.mockReturnValue({
      ok: true,
      cards: [{ front_text: 'x', back_text: 'y' }],
      skipped: []
    })

    draft.clear()

    expect(draft.file_name.value).toBeNull()
    expect(draft.cards.value).toEqual([])

    draft.setSource('text')
    expect(draft.pasted_text.value).toBe('a,b')
    expect(draft.cards.value).toEqual([{ front_text: 'a', back_text: 'b' }])
  })

  test('clear on the text source empties the pasted text without touching a loaded file', async () => {
    isImportableCardFileMock.mockReturnValue(true)
    parseCardImportMock.mockReturnValue({
      ok: true,
      cards: [{ front_text: 'a', back_text: 'b' }],
      skipped: []
    })
    const { draft } = setup()
    await draft.loadFile(makeFile('deck.csv'))

    draft.setSource('text')
    parseCardTextMock.mockReturnValue({
      ok: true,
      cards: [{ front_text: 'x', back_text: 'y' }],
      skipped: []
    })
    draft.loadText('typed')

    draft.clear()

    expect(draft.pasted_text.value).toBe('')
    expect(draft.cards.value).toEqual([])

    draft.setSource('file')
    expect(draft.file_name.value).toBe('deck.csv')
    expect(draft.has_cards.value).toBe(true)
  })
})

describe('useCardImport — dismissRefusal / toggleExpanded', () => {
  test('dismissRefusal clears the refusal', async () => {
    isImportableCardFileMock.mockReturnValue(false)
    const { draft } = setup()
    await draft.loadFile(makeFile('virus.exe'))
    expect(draft.refusal.value).toBe('invalid-type')

    draft.dismissRefusal()

    expect(draft.refusal.value).toBeNull()
  })

  test('dismissRefusal is a silent no-op when there is no refusal [obligation]', () => {
    const { draft } = setup()
    expect(draft.refusal.value).toBeNull()

    draft.dismissRefusal()

    expect(emitSfxMock).not.toHaveBeenCalled()
  })

  test('toggleExpanded flips is_expanded', () => {
    const { draft } = setup()
    expect(draft.is_expanded.value).toBe(true)
    draft.toggleExpanded()
    expect(draft.is_expanded.value).toBe(false)
    draft.toggleExpanded()
    expect(draft.is_expanded.value).toBe(true)
  })

  test('refusal_message is null with no refusal, and a translated string once one is set', async () => {
    isImportableCardFileMock.mockReturnValue(false)
    const { draft } = setup()
    expect(draft.refusal_message.value).toBeNull()

    await draft.loadFile(makeFile('virus.exe'))

    expect(draft.refusal_message.value).toBe('deck-view.card-import.refusal.invalid-type')
  })

  test('clearing the pasted text back to blank resets cards/skipped/refusal without a re-parse', () => {
    const { draft } = setup()
    draft.setSource('text')
    parseCardTextMock.mockReturnValue({
      ok: true,
      cards: [{ front_text: 'a', back_text: 'b' }],
      skipped: []
    })
    draft.loadText('a,b')
    expect(draft.has_cards.value).toBe(true)

    parseCardTextMock.mockClear()
    draft.loadText('   ')

    expect(draft.cards.value).toEqual([])
    expect(draft.skipped.value).toEqual([])
    expect(draft.refusal.value).toBeNull()
    expect(parseCardTextMock).not.toHaveBeenCalled()
  })

  test('openSkippedLines opens the skipped-lines-dialog modal with the current skipped lines', () => {
    const skipped_line = { line: 3, text: 'bad row' }
    const { draft } = setup()
    draft.setSource('text')
    parseCardTextMock.mockReturnValue({
      ok: true,
      cards: [{ front_text: 'a', back_text: 'b' }],
      skipped: [skipped_line]
    })
    draft.loadText('a,b')

    draft.openSkippedLines()

    expect(modalOpenMock).toHaveBeenCalledOnce()
    const [, options] = modalOpenMock.mock.calls[0]
    expect(options.props.lines).toEqual([skipped_line])
  })
})

describe('useCardImport — close / dismiss exit paths [obligation]', () => {
  test('close() drops both sources and exits with the default mode chime', async () => {
    const exitMode = vi.fn()
    const shell = makeShell({ exitMode })
    const { draft } = setup({ shell })
    draft.setSource('text')
    parseCardTextMock.mockReturnValue({
      ok: true,
      cards: [{ front_text: 'a', back_text: 'b' }],
      skipped: []
    })
    draft.loadText('a,b')
    draft.setSource('file')
    isImportableCardFileMock.mockReturnValue(true)
    parseCardImportMock.mockReturnValue({
      ok: true,
      cards: [{ front_text: 'x', back_text: 'y' }],
      skipped: []
    })
    await draft.loadFile(makeFile('deck.csv'))

    draft.close()

    expect(exitMode).toHaveBeenCalledWith()
    draft.setSource('text')
    expect(draft.pasted_text.value).toBe('')
    expect(draft.cards.value).toEqual([])
    draft.setSource('file')
    expect(draft.file_name.value).toBeNull()
    expect(draft.cards.value).toEqual([])
  })

  test('dismiss() drops both sources and exits with digi_powerdown', () => {
    const exitMode = vi.fn()
    const shell = makeShell({ exitMode })
    const { draft } = setup({ shell })
    draft.setSource('text')
    parseCardTextMock.mockReturnValue({
      ok: true,
      cards: [{ front_text: 'a', back_text: 'b' }],
      skipped: []
    })
    draft.loadText('a,b')

    draft.dismiss()

    expect(exitMode).toHaveBeenCalledWith('digi_powerdown')
    expect(draft.pasted_text.value).toBe('')
  })
})
