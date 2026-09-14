import AvatarPickerModal from '@/components/member/avatar-picker-modal.vue'
import type { MemberEditor } from '@/composables/member/editor'
import { useOverlay } from '@/composables/overlay/use-overlay'

/** Opens the avatar picker and stages the chosen avatar onto the member editor's cover. */
export function useAvatarPicker(editor: MemberEditor) {
  const { open } = useOverlay()

  async function onEditAvatar() {
    const avatar = await open<string>(AvatarPickerModal, {
      presentation: 'popup',
      props: { selected: editor.draft.cover_config.avatar ?? 'frog' }
    }).result

    if (avatar) editor.draft.cover_config.avatar = avatar
  }

  return { onEditAvatar }
}
