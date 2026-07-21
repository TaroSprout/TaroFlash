import { computed, ref, watch, type InjectionKey } from 'vue'
import { useUpsertMemberMutation } from '@/api/members'
import { useMemberStore } from '@/stores/member'
import { useDraft } from '@/composables/draft'
import { MEMBER_SETTINGS_DEFAULTS, withMemberCardCoverDefaults } from '@/utils/member/defaults'
import {
  withMemberPreferencesDefaults,
  type ResolvedMemberPreferences
} from '@/utils/member/preferences'

// The editable surface of a member profile, keyed to the persisted columns so
// the draft flushes straight through the upsert mutation. Defaults are merged
// in `buildMemberBase`, so the draft is always fully populated.
export type MemberDraft = {
  display_name: string
  description: string
  preferences: ResolvedMemberPreferences
  cover_config: MemberCover
}

export type SaveMemberOutcome = 'success' | 'duplicate-name' | 'error'

/**
 * Reactive state + mutations for editing the current member's profile. A single
 * `useDraft` over the profile's editable columns backs the settings tabs and
 * the member-card preview; `is_dirty` falls out of a deep diff against the
 * last-saved base. Mirrors `useDeckEditor`, minus the pacing inheritance lens.
 */
export function useMemberEditor() {
  const member_store = useMemberStore()

  function buildMemberBase(): MemberDraft {
    return {
      display_name: member_store.display_name ?? MEMBER_SETTINGS_DEFAULTS.display_name,
      description: member_store.description ?? MEMBER_SETTINGS_DEFAULTS.description,
      preferences: withMemberPreferencesDefaults(member_store.preferences),
      cover_config: withMemberCardCoverDefaults(member_store.cover)
    }
  }

  const { state: draft, is_dirty, reset: resetChanges, rebase } = useDraft(buildMemberBase)

  const name_error = ref<string>()

  const email = computed(() => member_store.email ?? '')
  const created_at = computed(() => member_store.created_at ?? '')
  const plan = computed(() => member_store.plan ?? 'free')
  const has_name = computed(() => !!draft.display_name?.trim())

  const upsert_mutation = useUpsertMemberMutation()

  /**
   * Persist staged changes via the members upsert mutation, rebasing on success
   * so the dirty flag clears even when the modal stays open. No-op when nothing
   * changed or the member id hasn't resolved yet. Distinguishes a duplicate
   * `display_name` (Postgres `23505` on `members_display_name_key`) from any
   * other failure so the caller can show an inline field error instead of a
   * generic toast.
   */
  async function saveMember(): Promise<SaveMemberOutcome> {
    if (!is_dirty.value) return 'error'
    if (!member_store.id) return 'error'

    try {
      await upsert_mutation.mutateAsync({ id: member_store.id, ...draft })
      rebase()
      return 'success'
    } catch (error: any) {
      if (error?.code === '23505' && error?.message?.includes('members_display_name_key')) {
        return 'duplicate-name'
      }
      return 'error'
    }
  }

  watch(
    () => draft.display_name,
    () => {
      name_error.value = undefined
    }
  )

  return {
    draft,
    email,
    created_at,
    plan,
    is_dirty,
    has_name,
    name_error,
    saving: upsert_mutation.isLoading,
    saveMember,
    resetChanges
  }
}

export type MemberEditor = ReturnType<typeof useMemberEditor>

/**
 * Inject key for the settings app's editor instance. The settings root
 * provides the `useMemberEditor()` result; tabs and the floating
 * member-card preview `inject(memberEditorKey)` to read/write without
 * prop drilling.
 */
export const memberEditorKey = Symbol('memberEditor') as InjectionKey<MemberEditor>
