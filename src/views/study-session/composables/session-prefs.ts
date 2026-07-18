import { ref } from 'vue'
import { useMemberStore } from '@/stores/member'
import { useUpsertMemberMutation } from '@/api/members'
import { emitSfx } from '@/sfx/bus'

/**
 * Session-scoped study preferences, behind a thin persistence seam. Today
 * `show_all_ratings` is a member-wide preference persisted via the member
 * upsert; a future session-settings table can swap the `persist` implementation
 * without the controller (its only caller) changing. Seeded once, toggled
 * locally for instant feedback, then persisted.
 */
export function useSessionPrefs() {
  const member_store = useMemberStore()
  const upsert_member = useUpsertMemberMutation()

  const show_all_ratings = ref(member_store.preferences.study.show_all_ratings)

  function persist() {
    if (!member_store.id) return
    upsert_member.mutate({
      id: member_store.id,
      preferences: {
        ...member_store.preferences,
        study: { ...member_store.preferences.study, show_all_ratings: show_all_ratings.value }
      }
    })
  }

  function toggleRatings() {
    emitSfx('snappy_button_5')
    show_all_ratings.value = !show_all_ratings.value
    persist()
  }

  return { show_all_ratings, toggleRatings }
}
