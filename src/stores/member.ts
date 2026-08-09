import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useCurrentMemberQuery } from '@/api/members'
import { withMemberPreferencesDefaults } from '@/utils/member/preferences'
import { withMemberCardCoverDefaults } from '@/utils/member/defaults'
import { useSessionStore } from './session'

export const useMemberStore = defineStore('member', () => {
  const session = useSessionStore()
  const query = useCurrentMemberQuery()
  const member = query.data
  const error = query.error
  const status = query.status

  // From the session, which lands in one step — a profile still loading reads as nobody.
  const id = computed(() => session.user?.id)
  const display_name = computed(() => member.value?.display_name)
  const description = computed(() => member.value?.description)
  // From the session: the profile's copy is written once at signup and never updated.
  const email = computed(() => session.user?.email)
  const created_at = computed(() => member.value?.created_at)
  const avatar_url = computed(() => member.value?.avatar_url)
  const role = computed(() => member.value?.role)
  const plan = computed(() => member.value?.plan)
  const deck_limit = computed(() => member.value?.plans?.deck_limit ?? null)
  const cards_per_deck_limit = computed(() => member.value?.plans?.cards_per_deck_limit ?? null)
  const preferences = computed(() => withMemberPreferencesDefaults(member.value?.preferences))
  const cover = computed(() => withMemberCardCoverDefaults(member.value?.cover_config))

  const has_member = computed(() => Boolean(id.value))

  // Signed in, but the account behind it is gone. Only meaningful once the
  // profile has finished loading — it reads as absent while still in flight.
  // →[K:deleted-account-token-outlives-deletion]
  const profile_missing = computed(
    () => session.authenticated && status.value === 'success' && member.value == null
  )

  // Deletion asked for but not yet carried out — still recoverable, unlike `profile_missing`.
  const pending_deletion = computed(() => Boolean(member.value?.delete_at))
  const delete_at = computed(() => member.value?.delete_at ?? null)

  return {
    has_member,
    profile_missing,
    pending_deletion,
    delete_at,
    display_name,
    description,
    email,
    created_at,
    id,
    avatar_url,
    role,
    plan,
    deck_limit,
    cards_per_deck_limit,
    preferences,
    cover,
    error
  }
})
