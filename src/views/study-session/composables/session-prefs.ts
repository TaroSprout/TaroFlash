import { computed, reactive, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMemberStore } from '@/stores/member'
import { useNoticeStore } from '@/stores/notice-store'
import { useUpsertMemberMutation } from '@/api/members'
import { emitSfx } from '@/sfx/bus'
import { debounce } from '@/utils/debounce'
import {
  MEMBER_PREFERENCES_DEFAULTS,
  type ResolvedMemberPreferences
} from '@/utils/member/preferences'

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
  const { t } = useI18n()
  const member_store = useMemberStore()
  const notice = useNoticeStore()
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
   * namespaces pass through untouched. A failed write toasts — the local value
   * stays applied but won't have persisted, so the user needs to know.
   */
  function persist() {
    debounce(
      () => {
        if (!member_store.id) return
        return upsert_member
          .mutateAsync({
            id: member_store.id,
            preferences: {
              ...member_store.preferences,
              study: { ...member_store.preferences.study, ...local }
            }
          })
          .catch(() => {
            notice.error(t('study-session.settings-save-error'), {
              subMessage: t('study-session.settings-save-error-sub')
            })
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

  const default_study = MEMBER_PREFERENCES_DEFAULTS.study

  const is_default = computed(() =>
    (Object.keys(default_study) as (keyof StudyPrefs)[]).every(
      (key) => local[key] === default_study[key]
    )
  )

  function toggleRatings() {
    emitSfx('snappy_button_5')
    show_all_ratings.value = !show_all_ratings.value
  }

  /** Restore every study pref to its factory default (auto-saves like any edit). */
  function resetToDefaults() {
    Object.assign(local, default_study)
    dirty = true
    persist()
  }

  return {
    show_all_ratings,
    show_rating_buttons,
    show_button_preview,
    show_card_preview,
    multi_deck_ordering,
    is_default,
    toggleRatings,
    resetToDefaults
  }
}
