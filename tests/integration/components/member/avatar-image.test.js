import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'

const { mockLoadAvatarUrl } = vi.hoisted(() => ({
  mockLoadAvatarUrl: vi.fn()
}))

vi.mock('@/components/member/avatars', () => ({
  loadAvatarUrl: mockLoadAvatarUrl
}))

vi.mock('@/assets/images/avatar_default.png', () => ({
  default: '/mock/avatar_default.png'
}))

import AvatarImage from '@/components/member/avatar-image.vue'

beforeEach(() => {
  mockLoadAvatarUrl.mockReset()
})

async function mountImage(props = {}) {
  const wrapper = shallowMount(AvatarImage, { props })
  await wrapper.vm.$nextTick()
  await Promise.resolve()
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('AvatarImage', () => {
  test('renders the default avatar when avatar prop is undefined', async () => {
    const wrapper = await mountImage()
    expect(mockLoadAvatarUrl).not.toHaveBeenCalled()
    expect(wrapper.find('img').attributes('src')).toBe('/mock/avatar_default.png')
  })

  test('resolves and renders the matching SVG URL when avatar matches a known key', async () => {
    mockLoadAvatarUrl.mockReturnValue(Promise.resolve('/mock/panda.svg'))
    const wrapper = await mountImage({ avatar: 'panda' })

    expect(mockLoadAvatarUrl).toHaveBeenCalledWith('panda')
    expect(wrapper.find('img').attributes('src')).toBe('/mock/panda.svg')
  })

  test('falls back to the default image when avatar is a stale/unknown key', async () => {
    mockLoadAvatarUrl.mockReturnValue(null)
    const wrapper = await mountImage({ avatar: 'no-longer-exists' })

    expect(mockLoadAvatarUrl).toHaveBeenCalledWith('no-longer-exists')
    expect(wrapper.find('img').attributes('src')).toBe('/mock/avatar_default.png')
  })
})
