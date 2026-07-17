import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { reactive } from 'vue'

const { modalOpenMock } = vi.hoisted(() => ({ modalOpenMock: vi.fn() }))

vi.mock('@/composables/modal', () => ({
  useModal: () => ({ open: modalOpenMock })
}))

vi.mock('@/components/member/avatar-picker-modal.vue', () => ({
  default: { name: 'AvatarPickerModal' }
}))

import { useAvatarPicker } from '@/views/settings/use-avatar-picker'

function makeEditor(avatar) {
  return { draft: reactive({ cover_config: { avatar } }) }
}

beforeEach(() => {
  modalOpenMock.mockReset()
})

describe('useAvatarPicker', () => {
  test('opens the avatar picker modal and awaits its response', async () => {
    modalOpenMock.mockReturnValue({ response: Promise.resolve(undefined) })
    const editor = makeEditor(undefined)
    const { onEditAvatar } = useAvatarPicker(editor)

    await expect(onEditAvatar()).resolves.toBeUndefined()
    expect(modalOpenMock).toHaveBeenCalledOnce()
  })

  test('assigns editor.draft.cover_config.avatar when the modal resolves with a truthy avatar', async () => {
    modalOpenMock.mockReturnValue({ response: Promise.resolve('panda') })
    const editor = makeEditor('owl')
    const { onEditAvatar } = useAvatarPicker(editor)

    await onEditAvatar()

    expect(editor.draft.cover_config.avatar).toBe('panda')
  })

  test('leaves editor.draft.cover_config.avatar unchanged when the modal resolves with undefined', async () => {
    modalOpenMock.mockReturnValue({ response: Promise.resolve(undefined) })
    const editor = makeEditor('owl')
    const { onEditAvatar } = useAvatarPicker(editor)

    await onEditAvatar()

    expect(editor.draft.cover_config.avatar).toBe('owl')
  })

  test('passes the current editor.draft.cover_config.avatar as the selected prop to the modal', async () => {
    modalOpenMock.mockReturnValue({ response: Promise.resolve(undefined) })
    const editor = makeEditor('otter')
    const { onEditAvatar } = useAvatarPicker(editor)

    await onEditAvatar()

    expect(modalOpenMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ props: { selected: 'otter' } })
    )
  })

  test('passes "frog" as the selected prop when editor.draft.cover_config.avatar is unset', async () => {
    modalOpenMock.mockReturnValue({ response: Promise.resolve(undefined) })
    const editor = makeEditor(undefined)
    const { onEditAvatar } = useAvatarPicker(editor)

    await onEditAvatar()

    expect(modalOpenMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ props: { selected: 'frog' } })
    )
  })
})
