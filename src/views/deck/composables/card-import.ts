import { computed, ref, type InjectionKey } from 'vue'
import { useI18n } from 'vue-i18n'
import { useBulkInsertCardsInDeckMutation } from '@/api/cards'
import { useModal } from '@/composables/modal'
import { useNoticeStore } from '@/stores/notice-store'
import SkippedLinesDialog from '@/views/deck/card-import/skipped-lines-dialog.vue'
import { emitSfx } from '@/sfx/bus'
import {
  parseCardImport,
  parseCardText,
  isImportableCardFile,
  type CardImportRefusal,
  type CardImportRow,
  type SkippedImportLine
} from '@/utils/card/csv'
import type { CardListController } from './list-controller'
import type { DeckViewShell } from './view-shell'

export type CardImport = ReturnType<typeof useCardImport>

/** Where the member is typing or dropping the cards in from. */
export type CardImportSource = 'file' | 'text'

/** How the not-yet-saved cards are laid out on a wide screen. */
export type CardImportLayout = 'grid' | 'list'

/** What one source parsed to, held per source so switching between them keeps both. */
type SourceResult = {
  cards: CardImportRow[]
  skipped: SkippedImportLine[]
  refusal: CardImportRefusal | null
}

function emptyResult(): SourceResult {
  return { cards: [], skipped: [], refusal: null }
}

export const cardImportKey = Symbol('cardImport') as InjectionKey<CardImport>

type Options = {
  editor: Pick<CardListController, 'deck_id' | 'guardAddCards' | 'handleLimitError'>
  shell: Pick<DeckViewShell, 'exitMode'>
}

/**
 * The cards a member has loaded but not yet added to the deck, and everything
 * the import surfaces do to them.
 *
 * Nothing here touches the deck until `commit` runs, so leaving the import
 * throws the draft away rather than saving half of it.
 */
export function useCardImport({ editor, shell }: Options) {
  const { t } = useI18n()
  const notice = useNoticeStore()
  const modal = useModal()
  const bulk_insert = useBulkInsertCardsInDeckMutation()

  const source = ref<CardImportSource>('file')
  const layout = ref<CardImportLayout>('grid')
  const file_name = ref<string | null>(null)
  const pasted_text = ref('')
  const results = ref<Record<CardImportSource, SourceResult>>({
    file: emptyResult(),
    text: emptyResult()
  })
  const importing = ref(false)
  // The narrow bar opens showing the controls, since there is nothing to look
  // at yet, and gets out of the way once there is.
  const is_expanded = ref(true)

  const cards = computed(() => results.value[source.value].cards)
  const skipped = computed(() => results.value[source.value].skipped)
  const refusal = computed(() => results.value[source.value].refusal)

  const has_cards = computed(() => cards.value.length > 0)
  const refusal_message = computed(() =>
    refusal.value ? t(`deck-view.card-import.refusal.${refusal.value}`) : null
  )

  /** Throw away what the member is looking at now, leaving the other source as they left it. */
  function clear() {
    if (source.value === 'file') file_name.value = null
    else pasted_text.value = ''

    results.value[source.value] = emptyResult()
    is_expanded.value = true
  }

  function applyResult(target: CardImportSource, result: ReturnType<typeof parseCardText>) {
    if (!result.ok) {
      results.value[target] = { ...emptyResult(), refusal: result.refusal }
      emitSfx('ui.rejected')
      return
    }

    results.value[target] = { cards: result.cards, skipped: result.skipped, refusal: null }
    if (result.cards.length > 0) is_expanded.value = false
  }

  /** Read a picked or dropped file into the preview. A file we can't read leaves the draft untouched. */
  async function loadFile(file: File) {
    if (!isImportableCardFile(file)) {
      file_name.value = null
      applyResult('file', { ok: false, refusal: 'invalid-type' })
      return
    }

    const buffer = await file.arrayBuffer()
    const result = parseCardImport(buffer)

    file_name.value = result.ok ? file.name : null
    applyResult('file', result)

    // Only the file lands with a chime — pasted text re-parses on every keystroke.
    if (result.ok) emitSfx('dialog.confirm')
  }

  /** Re-read the pasted box; every keystroke re-previews what it holds. */
  function loadText(text: string) {
    pasted_text.value = text

    if (text.trim() === '') {
      results.value.text = emptyResult()
      return
    }

    applyResult('text', parseCardText(text))
  }

  function setSource(next: CardImportSource) {
    source.value = next
  }

  function setLayout(next: CardImportLayout) {
    layout.value = next
  }

  function toggleExpanded() {
    emitSfx('ui.press')
    is_expanded.value = !is_expanded.value
  }

  // Silent when there is nothing to dismiss — a drag entering the zone clears the
  // last refusal, and that fires over and over as the file crosses the zone's children.
  function dismissRefusal() {
    if (!refusal.value) return

    emitSfx('ui.press')
    results.value[source.value].refusal = null
  }

  /** Show the lines the file held that couldn't become cards. Read-only — it changes nothing. */
  function openSkippedLines() {
    modal.open(SkippedLinesDialog, { props: { lines: skipped.value } })
  }

  function discardDraft() {
    file_name.value = null
    pasted_text.value = ''
    results.value = { file: emptyResult(), text: emptyResult() }
    is_expanded.value = true
  }

  /** Leave the import, dropping both sources' drafts. */
  function close() {
    discardDraft()
    shell.exitMode()
  }

  /** Leave without importing — the same exit, sounded as a refusal rather than a mode change. */
  function dismiss() {
    discardDraft()
    shell.exitMode('digi_powerdown')
  }

  /**
   * Add the previewed cards to the end of the deck.
   *
   * A batch that would take the deck past its card limit is refused whole, so
   * a member never lands with part of their file imported.
   */
  async function commit() {
    if (!has_cards.value || importing.value) return
    if (!(await editor.guardAddCards(cards.value.length))) return

    const count = cards.value.length
    importing.value = true

    try {
      await bulk_insert.mutateAsync({ deck_id: editor.deck_id, cards: cards.value })
    } catch (error) {
      if (!editor.handleLimitError(error)) notice.error(t('deck-view.card-import.error'))
      return
    } finally {
      importing.value = false
    }

    notice.success(t('toast.success.cards-imported', { count }))
    close()
  }

  return {
    source,
    layout,
    file_name,
    pasted_text,
    cards,
    skipped,
    refusal,
    refusal_message,
    importing,
    is_expanded,
    has_cards,
    clear,
    loadFile,
    loadText,
    setSource,
    setLayout,
    toggleExpanded,
    dismissRefusal,
    openSkippedLines,
    close,
    dismiss,
    commit
  }
}
