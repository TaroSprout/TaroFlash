import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { nextTick } from 'vue'
import { useSessionPrefs } from '@/views/study-session/composables/session-prefs'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

// The real member store is a reactive Pinia store — session-prefs.ts's watch()
// depends on that reactivity to pick up a later-arriving fetch. A plain object
// mock would never trigger the watcher, so this test double is `reactive()`.
const { DEFAULT_STUDY, mockUpsertMember, mockMemberStore } = await vi.hoisted(async () => {
  const { reactive } = await import('vue')
  const DEFAULT_STUDY = {
    show_all_ratings: false,
    show_rating_buttons: true,
    show_button_preview: false,
    show_card_preview: true,
    multi_deck_ordering: 'random'
  }
  return {
    DEFAULT_STUDY,
    mockUpsertMember: { mutate: vi.fn(), mutateAsync: vi.fn(() => Promise.resolve()) },
    mockMemberStore: reactive({
      id: 'member-1',
      preferences: { study: { ...DEFAULT_STUDY } }
    })
  }
})

const { mockEmitSfx } = vi.hoisted(() => ({ mockEmitSfx: vi.fn() }))
const { mockNotice } = vi.hoisted(() => ({ mockNotice: { error: vi.fn() } }))

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key) => key }) }))

vi.mock('@/stores/notice-store', () => ({
  useNoticeStore: () => mockNotice
}))

vi.mock('@/stores/member', () => ({
  useMemberStore: () => mockMemberStore
}))

vi.mock('@/api/members', () => ({
  useUpsertMemberMutation: () => mockUpsertMember
}))

vi.mock('@/sfx/bus', () => ({
  emitSfx: mockEmitSfx,
  emitStudySfx: vi.fn(),
  emitHoverSfx: vi.fn()
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

const PERSIST_DELAY = 400

function runPersistTimer() {
  vi.advanceTimersByTime(PERSIST_DELAY)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useSessionPrefs', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockUpsertMember.mutateAsync.mockClear()
    mockUpsertMember.mutateAsync.mockImplementation(() => Promise.resolve())
    mockNotice.error.mockClear()
    mockEmitSfx.mockClear()
    mockMemberStore.id = 'member-1'
    mockMemberStore.preferences = { study: { ...DEFAULT_STUDY } }
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ── Seeding from the member store ─────────────────────────────────────────

  test('seeds every pref from member_store.preferences.study at creation', () => {
    mockMemberStore.preferences = {
      study: {
        show_all_ratings: true,
        show_rating_buttons: false,
        show_button_preview: true,
        show_card_preview: false,
        multi_deck_ordering: 'sequential'
      }
    }
    const prefs = useSessionPrefs()

    expect(prefs.show_all_ratings.value).toBe(true)
    expect(prefs.show_rating_buttons.value).toBe(false)
    expect(prefs.show_button_preview.value).toBe(true)
    expect(prefs.show_card_preview.value).toBe(false)
    expect(prefs.multi_deck_ordering.value).toBe('sequential')
  })

  // ── Hydration continues until the first edit (dirty) ─────────
  // A hook created before the member query resolves must reflect the loaded
  // values once they arrive, and must not clobber real stored prefs once the
  // member has made an edit (auth-restore race).

  test('reflects a member_store.preferences update that arrives after creation, before any edit', async () => {
    mockMemberStore.preferences = { study: { ...DEFAULT_STUDY, show_all_ratings: false } }
    const prefs = useSessionPrefs()
    expect(prefs.show_all_ratings.value).toBe(false)

    // The store's query resolves later with the real stored value.
    mockMemberStore.preferences = { study: { ...DEFAULT_STUDY, show_all_ratings: true } }
    await nextTick()

    expect(prefs.show_all_ratings.value).toBe(true)
  })

  test('stops hydrating from the store once the member has made a local edit (dirty)', async () => {
    mockMemberStore.preferences = { study: { ...DEFAULT_STUDY, show_all_ratings: false } }
    const prefs = useSessionPrefs()

    prefs.show_all_ratings.value = true // local edit -> dirty
    runPersistTimer()

    // A later store update (e.g. a stale re-fetch) must not clobber the edit.
    mockMemberStore.preferences = { study: { ...DEFAULT_STUDY, show_all_ratings: false } }
    await Promise.resolve()

    expect(prefs.show_all_ratings.value).toBe(true)
  })

  // ── Creating + seeding must NOT auto-save ────────────────────

  test('creating the hook and having the store hydrate later does not call the upsert mutation', async () => {
    const prefs = useSessionPrefs()
    void prefs

    mockMemberStore.preferences = { study: { ...DEFAULT_STUDY, show_all_ratings: true } }
    await Promise.resolve()
    runPersistTimer()
    await Promise.resolve()

    expect(mockUpsertMember.mutateAsync).not.toHaveBeenCalled()
  })

  // ── A user edit persists the WHOLE study blob, debounced ─────

  test('editing one pref upserts all five study keys from the current local state', () => {
    const prefs = useSessionPrefs()

    prefs.show_card_preview.value = false
    runPersistTimer()

    expect(mockUpsertMember.mutateAsync).toHaveBeenCalledWith({
      id: 'member-1',
      preferences: {
        study: {
          show_all_ratings: false,
          show_rating_buttons: true,
          show_button_preview: false,
          show_card_preview: false,
          multi_deck_ordering: 'random'
        }
      }
    })
  })

  test('audio/accessibility namespaces pass through untouched on save', () => {
    mockMemberStore.preferences = {
      study: { ...DEFAULT_STUDY },
      audio: { muted: true, interface_sounds: 3, hover_sounds: 2 },
      accessibility: { left_hand: true }
    }
    const prefs = useSessionPrefs()

    prefs.multi_deck_ordering.value = 'even_spread'
    runPersistTimer()

    expect(mockUpsertMember.mutateAsync).toHaveBeenCalledWith({
      id: 'member-1',
      preferences: {
        audio: { muted: true, interface_sounds: 3, hover_sounds: 2 },
        accessibility: { left_hand: true },
        study: { ...DEFAULT_STUDY, multi_deck_ordering: 'even_spread' }
      }
    })
  })

  test('multiple edits before the debounce fires coalesce into a single upsert', () => {
    const prefs = useSessionPrefs()

    prefs.show_card_preview.value = false
    prefs.show_rating_buttons.value = false
    runPersistTimer()

    expect(mockUpsertMember.mutateAsync).toHaveBeenCalledTimes(1)
  })

  test('is a no-op upsert when the member store has no id', () => {
    mockMemberStore.id = undefined
    const prefs = useSessionPrefs()

    prefs.show_all_ratings.value = true
    runPersistTimer()

    expect(mockUpsertMember.mutateAsync).not.toHaveBeenCalled()
  })

  test('toasts an error when the save fails, keeping the local value applied', async () => {
    mockUpsertMember.mutateAsync.mockRejectedValueOnce(new Error('network down'))
    const prefs = useSessionPrefs()

    prefs.show_card_preview.value = false
    await vi.advanceTimersByTimeAsync(PERSIST_DELAY)

    expect(mockNotice.error).toHaveBeenCalledWith('study-session.settings-save-error', {
      subMessage: 'study-session.settings-save-error-sub'
    })
    // The local value stays applied even though the write didn't persist.
    expect(prefs.show_card_preview.value).toBe(false)
  })

  test('does not toast when the save succeeds', async () => {
    const prefs = useSessionPrefs()

    prefs.show_card_preview.value = false
    await vi.advanceTimersByTimeAsync(PERSIST_DELAY)

    expect(mockNotice.error).not.toHaveBeenCalled()
  })

  // ── toggleRatings ──────────────────────────────────────────────────────────

  test('toggleRatings flips show_all_ratings instantly', () => {
    const prefs = useSessionPrefs()
    expect(prefs.show_all_ratings.value).toBe(false)

    prefs.toggleRatings()

    expect(prefs.show_all_ratings.value).toBe(true)
  })

  test('toggleRatings plays the ui.press sfx', () => {
    const prefs = useSessionPrefs()
    prefs.toggleRatings()
    expect(mockEmitSfx).toHaveBeenCalledWith('ui.press')
  })

  test('toggleRatings persists via the member upsert', () => {
    const prefs = useSessionPrefs()
    prefs.toggleRatings()
    runPersistTimer()

    expect(mockUpsertMember.mutateAsync).toHaveBeenCalledWith({
      id: 'member-1',
      preferences: { study: { ...DEFAULT_STUDY, show_all_ratings: true } }
    })
  })

  // ── is_default ─────────────────────────────────────────────────────────────

  test('is_default is true when every local pref matches the factory default', () => {
    const prefs = useSessionPrefs()
    expect(prefs.is_default.value).toBe(true)
  })

  test('is_default is false once any pref diverges from default', () => {
    const prefs = useSessionPrefs()
    prefs.show_card_preview.value = false
    expect(prefs.is_default.value).toBe(false)
  })

  // ── resetToDefaults ────────────────────────────────────────────────────────

  test('resetToDefaults restores every pref to its factory default', () => {
    mockMemberStore.preferences = {
      study: {
        show_all_ratings: true,
        show_rating_buttons: false,
        show_button_preview: true,
        show_card_preview: false,
        multi_deck_ordering: 'sequential'
      }
    }
    const prefs = useSessionPrefs()

    prefs.resetToDefaults()

    expect(prefs.show_all_ratings.value).toBe(false)
    expect(prefs.show_rating_buttons.value).toBe(true)
    expect(prefs.show_button_preview.value).toBe(false)
    expect(prefs.show_card_preview.value).toBe(true)
    expect(prefs.multi_deck_ordering.value).toBe('random')
  })

  test('resetToDefaults auto-saves like any edit', () => {
    const prefs = useSessionPrefs()
    prefs.resetToDefaults()
    runPersistTimer()

    expect(mockUpsertMember.mutateAsync).toHaveBeenCalledWith({
      id: 'member-1',
      preferences: { study: { ...DEFAULT_STUDY } }
    })
  })
})
