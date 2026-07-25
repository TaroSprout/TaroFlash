import { computed, reactive, watch } from 'vue'
import { useMemberStore } from '@/stores/member'
import { useUpsertMemberMutation } from '@/api/members'
import { emitSfx } from '@/sfx/bus'
import { debounce } from '@/utils/debounce'
import type { ResolvedMemberPreferences } from '@/utils/member/preferences'

type StudyPrefs = ResolvedMemberPreferences['study']

const PERSIST_DELAY = 400
const PERSIST_KEY = 'session-prefs-persist'

/**
 * Member-wide study-session preferences, behind a thin persistence seam. All
 * five live under `members.preferences.study` jsonb (already plumbed); a future
 * session-settings table can swap `persist` without the controller (its only
 * caller) changing.
 *
 * Each pref is a writable computed: reads are instant/live and writes both
 * update local state and auto-save — no draft/staging, no Save button. `persist`
 * writes the whole `study` blob and is debounced so flipping several controls
 * coalesces into one upsert.
 *
 * The member `preferences` computed starts as defaults and flips to the fetched
 * values when the query resolves; `local` is kept in sync with it until the
 * member's first edit (`dirty`), so a session that mounts before the fetch lands
 * can't seed defaults and later clobber real stored prefs on the first save.
 */
export function useSessionPrefs() {
  const member_store = useMemberStore()
  const upsert_member = useUpsertMemberMutation()

  const local = reactive<StudyPrefs>({ ...member_store.preferences.study })

  let dirty = false

  watch(
    () => member_store.preferences.study,
    (study) => {
      if (!dirty) Object.assign(local, study)
    }
  )

  /**
   * Debounced write of the whole `study` blob. Writing every key each time (not
   * a diff) keeps concurrent auto-saves last-write-wins safe; non-study
   * namespaces pass through untouched.
   */
  function persist() {
    debounce(
      () => {
        if (!member_store.id) return
        upsert_member.mutate({
          id: member_store.id,
          preferences: {
            ...member_store.preferences,
            study: { ...member_store.preferences.study, ...local }
          }
        })
      },
      { delay: PERSIST_DELAY, key: PERSIST_KEY }
    )
  }

  /** Local edit → mark dirty (stops store hydration) and auto-save. */
  function write<K extends keyof StudyPrefs>(key: K, value: StudyPrefs[K]) {
    local[key] = value
    dirty = true
    persist()
  }

  function bindable<K extends keyof StudyPrefs>(key: K) {
    return computed<StudyPrefs[K]>({
      get: () => local[key],
      set: (value) => write(key, value)
    })
  }

  const show_all_ratings = bindable('show_all_ratings')
  const show_rating_buttons = bindable('show_rating_buttons')
  const show_button_preview = bindable('show_button_preview')
  const show_card_preview = bindable('show_card_preview')
  const multi_deck_ordering = bindable('multi_deck_ordering')

  function toggleRatings() {
    emitSfx('snappy_button_5')
    show_all_ratings.value = !show_all_ratings.value
  }

  return {
    show_all_ratings,
    show_rating_buttons,
    show_button_preview,
    show_card_preview,
    multi_deck_ordering,
    toggleRatings
  }
}
