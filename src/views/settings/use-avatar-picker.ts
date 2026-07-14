import AvatarPickerModal from '@/components/member/avatar-picker-modal.vue'
import type { MemberEditor } from '@/composables/member/editor'
import { useModal } from '@/composables/modal'
import type { SettingsRecede } from './layout'

/**
 * Opens the avatar picker over a receded settings modal and stages the
 * chosen avatar onto the member editor's cover. Mirrors the change-card
 * modal's recede/open/restore choreography (see tab-subscription/use-change-cc-click.ts).
 *
 * Takes `editor`/`recede` as params rather than injecting them internally —
 * settings/index.vue is the component that provides both keys, and Vue's
 * inject() only sees a parent's provides, not a component's own, so it can't
 * self-inject what it just provided.
 */
export function useAvatarPicker(editor: MemberEditor, recede?: SettingsRecede) {
  const modal = useModal()

  async function onEditAvatar() {
    recede?.recede()
    const avatar = await modal.open<string>(AvatarPickerModal, {
      mode: 'popup',
      backdrop: true,
      props: { selected: editor.cover.avatar ?? 'frog' }
    }).response
    recede?.restore()

    if (avatar) editor.cover.avatar = avatar
  }

  return { onEditAvatar }
}
