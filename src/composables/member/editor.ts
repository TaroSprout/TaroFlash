import { computed, reactive, ref, watch, type InjectionKey } from 'vue'
import { useUpsertMemberMutation } from '@/api/members'
import { useMemberStore } from '@/stores/member'
import {
  buildMemberPayload,
  hasMemberChanges,
  type ResolvedMemberPreferences
} from '@/utils/member/payload'
import { replaceReactiveContents } from '@/utils/reactive'

/**
 * Reactive state + mutations for editing the current member's profile.
 * Owns the in-flight `settings` object that the settings tabs bind into,
 * plus a `cover` object the member-card preview consumes. Mirrors `useDeckEditor`.
 */
export function useMemberEditor() {
  const member_store = useMemberStore()

  function buildInitialSettings(): { display_name?: string; description?: string } {
    return {
      display_name: member_store.display_name,
      description: member_store.description
    }
  }

  // Spread each nested group individually — `{ ...member_store.preferences }`
  // only copies the top level, so `preferences.study` etc. would still alias
  // the store's own objects and silently write through to it on edit (same
  // aliasing bug `useDeckEditor.buildInitialCardAttributes` avoids for `front`/`back`).
  function buildInitialPreferences(): ResolvedMemberPreferences {
    return {
      accessibility: { ...member_store.preferences.accessibility },
      audio: { ...member_store.preferences.audio },
      study: { ...member_store.preferences.study }
    }
  }

  function buildInitialCover(): MemberCover {
    return { ...member_store.cover }
  }

  const settings = reactive(buildInitialSettings())
  const preferences = reactive(buildInitialPreferences())
  const cover = reactive(buildInitialCover())

  const name_error = ref<string>()

  const email = computed(() => member_store.email ?? '')
  const created_at = computed(() => member_store.created_at ?? '')
  const plan = computed(() => member_store.plan ?? 'free')
  const has_name = computed(() => !!settings.display_name?.trim())

  const initial_payload = buildMemberPayload({ settings, preferences, cover })
  const is_dirty = computed(() =>
    hasMemberChanges({ settings, preferences, cover }, initial_payload)
  )

  const upsert_mutation = useUpsertMemberMutation()

  /** Persist staged changes via the members upsert mutation. No-op when nothing changed. */
  async function saveMember(): Promise<boolean> {
    if (!is_dirty.value) return false
    if (!member_store.id) return false

    try {
      await upsert_mutation.mutateAsync({
        id: member_store.id,
        ...buildMemberPayload({ settings, preferences, cover })
      })
      return true
    } catch {
      return false
    }
  }

  watch(
    () => settings.display_name,
    () => {
      name_error.value = undefined
    }
  )

  /** Discard every staged edit, restoring `settings`/`preferences`/`cover` to their last-saved values. */
  function resetChanges() {
    replaceReactiveContents(settings, buildInitialSettings())
    replaceReactiveContents(preferences, buildInitialPreferences())
    replaceReactiveContents(cover, buildInitialCover())
  }

  return {
    settings,
    preferences,
    cover,
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
