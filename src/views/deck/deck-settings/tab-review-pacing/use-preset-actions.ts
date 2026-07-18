import { computed, ref, type ComputedRef, type InjectionKey, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDeletePresetMutation, useUpsertPresetMutation } from '@/api/review-pacing'
import { useMemberDecksQuery } from '@/api/decks'
import { useAlert } from '@/composables/alert'
import { usePrompt } from '@/composables/prompt'
import { useNoticeStore } from '@/stores/notice-store'
import type { DeckDraft } from '@/composables/deck/editor'
import type { PacingFields } from './use-pacing-fields'

// A wrapper rather than `T | undefined` because delete resolves to void — a bare
// undefined can't distinguish success from failure there.
type WriteResult<T> = { ok: true; data: T } | { ok: false }

export type PresetActions = {
  // The system preset is shared app-wide, so it can only be forked — never
  // renamed, edited or deleted.
  is_system_preset: ComputedRef<boolean>
  has_overrides: ComputedRef<boolean>
  busy: Ref<boolean>
  onFork: () => Promise<void>
  onPush: () => Promise<void>
  onRename: () => Promise<void>
  onDelete: () => Promise<void>
}

export const presetActionsKey: InjectionKey<PresetActions> = Symbol('preset-actions')

/**
 * Preset lifecycle actions for the Review Pacing tab — fork, push, rename, delete.
 *
 * Pull is deck-local and already lives on the fields themselves (per-field reset
 * + reset-all). Push is global: it rewrites the preset every following deck reads
 * from, so it's all-or-nothing and confirmed, never per-field.
 *
 * Preset writes hit the server immediately; the deck's own link and overrides are
 * staged on the draft, so the deck half lands on Save like every other edit here.
 *
 * @example
 * provide(presetActionsKey, usePresetActions(pacing, draft, deck))
 */
export function usePresetActions(
  pacing: PacingFields,
  draft: DeckDraft,
  deck: Deck
): PresetActions {
  const { t } = useI18n()
  const alert = useAlert()
  const prompt = usePrompt()
  const notice = useNoticeStore()

  const upsert_mutation = useUpsertPresetMutation()
  const delete_mutation = useDeletePresetMutation()
  const decks_query = useMemberDecksQuery()

  const busy = ref(false)

  const is_system_preset = computed(() => !!pacing.selected_preset.value?.is_system)
  const has_overrides = computed(() => pacing.override_count.value > 0)

  // Blast radius for the global actions. Excludes the deck being edited — the
  // user can already see what happens to it, so the count is only interesting
  // as "what else does this touch".
  const other_follower_count = computed(() => {
    const id = pacing.selected_preset.value?.id
    if (!id) return 0
    return (decks_query.data.value ?? []).filter(
      (other) => other.review_pacing_preset_id === id && other.id !== deck.id
    ).length
  })

  /** Saves the deck's current values as a brand-new preset and follows it. */
  async function onFork() {
    const name = await prompt.ask({
      title: t('deck.settings-modal.review-pacing.fork-prompt-title'),
      message: t('deck.settings-modal.review-pacing.fork-prompt-message'),
      label: t('deck.settings-modal.review-pacing.name-label'),
      placeholder: t('deck.settings-modal.review-pacing.name-placeholder'),
      confirmLabel: t('deck.settings-modal.review-pacing.fork-prompt-confirm')
    }).response
    if (!name) return

    const created = await runWrite(
      () => upsert_mutation.mutateAsync({ name, ...pacing.resolved_pacing.value }),
      'fork-failed'
    )
    if (!created.ok) return

    // The new preset already holds these values verbatim, so the overrides that
    // produced it are now pure noise — drop them and follow it cleanly.
    draft.review_pacing_preset_id = created.data.id
    pacing.resetAllOverrides()
    notice.success(t('toast.success.preset-created'), { variant: 'panel' })
  }

  /** Promotes the deck's overrides into the followed preset — hits every deck on it. */
  async function onPush() {
    const preset = pacing.selected_preset.value
    if (!preset || preset.is_system) return

    const confirmed = await alert.warn({
      title: t('alert.push-preset.title'),
      message: t('alert.push-preset.message', other_follower_count.value, {
        named: { name: preset.name, count: other_follower_count.value }
      }),
      confirmLabel: t('alert.push-preset.confirm')
    }).response
    if (!confirmed) return

    const saved = await runWrite(
      () =>
        upsert_mutation.mutateAsync({
          id: preset.id,
          name: preset.name,
          ...pacing.resolved_pacing.value
        }),
      'push-failed'
    )
    if (!saved.ok) return

    // Without this the deck keeps overrides identical to the preset it just
    // wrote — divergence badges lit while nothing actually differs.
    pacing.resetAllOverrides()
    notice.success(t('toast.success.preset-updated'), { variant: 'panel' })
  }

  async function onRename() {
    const preset = pacing.selected_preset.value
    if (!preset || preset.is_system) return

    const name = await prompt.ask({
      title: t('deck.settings-modal.review-pacing.rename-prompt-title'),
      label: t('deck.settings-modal.review-pacing.name-label'),
      initialValue: preset.name,
      confirmLabel: t('deck.settings-modal.review-pacing.rename-prompt-confirm')
    }).response
    if (!name || name === preset.name) return

    const saved = await runWrite(
      () => upsert_mutation.mutateAsync({ id: preset.id, name, ...pacing.resolved_pacing.value }),
      'rename-failed'
    )
    if (!saved.ok) return

    notice.success(t('toast.success.preset-renamed'), { variant: 'panel' })
  }

  async function onDelete() {
    const preset = pacing.selected_preset.value
    if (!preset || preset.is_system) return

    const confirmed = await alert.warn({
      title: t('alert.delete-preset.title'),
      message: t('alert.delete-preset.message', other_follower_count.value, {
        named: { name: preset.name, count: other_follower_count.value }
      }),
      confirmLabel: t('alert.delete-preset.confirm'),
      confirmAudio: 'trash_crumple_short'
    }).response
    if (!confirmed) return

    const deleted = await runWrite(() => delete_mutation.mutateAsync(preset.id), 'delete-failed')
    if (!deleted.ok) return

    // The FK is ON DELETE SET NULL, so the server already dropped the link —
    // mirror that on the draft or Save would write the dead id straight back.
    draft.review_pacing_preset_id = null
    notice.success(t('toast.success.preset-deleted'), { variant: 'panel' })
  }

  /** Runs a preset write under the shared busy flag, surfacing failures as a notice. */
  async function runWrite<T>(write: () => Promise<T>, error_key: string): Promise<WriteResult<T>> {
    busy.value = true
    try {
      return { ok: true, data: await write() }
    } catch {
      notice.error(t(`toast.error.preset-${error_key}`), { variant: 'panel' })
      return { ok: false }
    } finally {
      busy.value = false
    }
  }

  return { is_system_preset, has_overrides, busy, onFork, onPush, onRename, onDelete }
}
