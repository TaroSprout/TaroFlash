import AvatarPickerModal from '@/components/member/avatar-picker-modal.vue'
import type { MemberEditor } from '@/composables/member/editor'
import { useModal } from '@/composables/modal'

/** Opens the avatar picker and stages the chosen avatar onto the member editor's cover. */
export function useAvatarPicker(editor: MemberEditor) {
  const modal = useModal()

  async function onEditAvatar() {
    const avatar = await modal.open<string>(AvatarPickerModal, {
      mode: 'popup',
      backdrop: true,
      props: { selected: editor.cover.avatar ?? 'frog' }
    }).response

    if (avatar) editor.cover.avatar = avatar
  }

  return { onEditAvatar }
}
