import { ref } from 'vue'
import { useMemberStore } from '@/stores/member'
import { useUpsertMemberMutation } from '@/api/members'
import { emitSfx } from '@/sfx/bus'
import { debounce } from '@/utils/debounce'

const PERSIST_DELAY = 400
const PERSIST_KEY = 'session-prefs-persist'

/**
 * Member-wide study-session preferences, behind a thin persistence seam. All
 * five live under `members.preferences.study` jsonb (already plumbed); a future
 * session-settings table can swap `persist` without the controller (its only
 * caller) changing. Each pref is seeded once, mutated locally for instant live
 * feedback, then auto-saved — no draft/staging, no Save button. `persist` writes
 * the whole `study` blob from the local refs and is debounced so flipping
 * several controls on the settings page coalesces into one upsert.
 */
export function useSessionPrefs() {
  const member_store = useMemberStore()
  const upsert_member = useUpsertMemberMutation()

  const study = member_store.preferences.study

  const show_all_ratings = ref(study.show_all_ratings)
  const show_rating_buttons = ref(study.show_rating_buttons)
  const show_button_preview = ref(study.show_button_preview)
  const show_card_preview = ref(study.show_card_preview)
  const multi_deck_ordering = ref<MultiDeckOrdering>(study.multi_deck_ordering)

  /**
   * Debounced write of the whole `study` blob from the current refs. Writing
   * every key each time (not a diff) keeps concurrent auto-saves last-write-wins
   * safe; non-study namespaces pass through untouched.
   */
  function persist() {
    debounce(
      () => {
        if (!member_store.id) return
        upsert_member.mutate({
          id: member_store.id,
          preferences: {
            ...member_store.preferences,
            study: {
              ...member_store.preferences.study,
              show_all_ratings: show_all_ratings.value,
              show_rating_buttons: show_rating_buttons.value,
              show_button_preview: show_button_preview.value,
              show_card_preview: show_card_preview.value,
              multi_deck_ordering: multi_deck_ordering.value
            }
          }
        })
      },
      { delay: PERSIST_DELAY, key: PERSIST_KEY }
    )
  }

  function toggleRatings() {
    emitSfx('snappy_button_5')
    show_all_ratings.value = !show_all_ratings.value
    persist()
  }

  return {
    show_all_ratings,
    show_rating_buttons,
    show_button_preview,
    show_card_preview,
    multi_deck_ordering,
    persist,
    toggleRatings
  }
}
