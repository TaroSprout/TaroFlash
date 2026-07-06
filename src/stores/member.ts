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

  // `id` is sourced from the session (set synchronously once auth restores),
  // not the member-profile query. Downstream api calls that scope queries by
  // member_id read this field synchronously, so racing against a pending
  // profile fetch would stringify `undefined` into the query and fail.
  const id = computed(() => session.user?.id)
  const display_name = computed(() => member.value?.display_name)
  const description = computed(() => member.value?.description)
  // Sourced from the session, not the member-profile query — the `members`
  // row's email is only set once at signup and goes stale after an email
  // change, while the session always reflects the current auth email.
  const email = computed(() => session.user?.email)
  const created_at = computed(() => member.value?.created_at)
  const avatar_url = computed(() => member.value?.avatar_url)
  const updated_at = computed(() => member.value?.updated_at)
  const role = computed(() => member.value?.role)
  const plan = computed(() => member.value?.plan)
  const preferences = computed(() => withMemberPreferencesDefaults(member.value?.preferences))
  const cover = computed(() => withMemberCardCoverDefaults(member.value?.cover_config))

  const has_member = computed(() => Boolean(id.value))

  return {
    has_member,
    display_name,
    description,
    email,
    created_at,
    id,
    avatar_url,
    updated_at,
    role,
    plan,
    preferences,
    cover
  }
})
