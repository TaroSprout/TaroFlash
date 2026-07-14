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
  return { cover: reactive({ avatar }) }
}

function makeRecede() {
  const order = []
  return {
    order,
    recede: {
      recede: vi.fn(() => order.push('recede')),
      restore: vi.fn(() => order.push('restore'))
    }
  }
}

beforeEach(() => {
  modalOpenMock.mockReset()
})

describe('useAvatarPicker — works as a plain function with no injection context', () => {
  test('calls recede() before opening the modal and restore() after it resolves', async () => {
    const { order, recede } = makeRecede()
    modalOpenMock.mockImplementation(() => {
      order.push('modal-open')
      return { response: Promise.resolve(undefined) }
    })
    const editor = makeEditor(undefined)
    const { onEditAvatar } = useAvatarPicker(editor, recede)

    await onEditAvatar()

    expect(order).toEqual(['recede', 'modal-open', 'restore'])
  })

  test('assigns editor.cover.avatar when the modal resolves with a truthy avatar', async () => {
    modalOpenMock.mockReturnValue({ response: Promise.resolve('panda') })
    const editor = makeEditor('owl')
    const { onEditAvatar } = useAvatarPicker(editor)

    await onEditAvatar()

    expect(editor.cover.avatar).toBe('panda')
  })

  test('leaves editor.cover.avatar unchanged when the modal resolves with undefined', async () => {
    modalOpenMock.mockReturnValue({ response: Promise.resolve(undefined) })
    const editor = makeEditor('owl')
    const { onEditAvatar } = useAvatarPicker(editor)

    await onEditAvatar()

    expect(editor.cover.avatar).toBe('owl')
  })

  test('works without a recede argument at all', async () => {
    modalOpenMock.mockReturnValue({ response: Promise.resolve(undefined) })
    const editor = makeEditor(undefined)
    const { onEditAvatar } = useAvatarPicker(editor)

    await expect(onEditAvatar()).resolves.toBeUndefined()
  })

  test('passes the current editor.cover.avatar as the selected prop to the modal', async () => {
    modalOpenMock.mockReturnValue({ response: Promise.resolve(undefined) })
    const editor = makeEditor('otter')
    const { onEditAvatar } = useAvatarPicker(editor)

    await onEditAvatar()

    expect(modalOpenMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ props: { selected: 'otter' } })
    )
  })

  test('passes "frog" as the selected prop when editor.cover.avatar is unset', async () => {
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
