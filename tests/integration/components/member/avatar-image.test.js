import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'

const { mockLoadAvatarUrl } = vi.hoisted(() => ({
  mockLoadAvatarUrl: vi.fn()
}))

vi.mock('@/components/member/avatars', () => ({
  loadAvatarUrl: mockLoadAvatarUrl
}))

vi.mock('@/assets/avatars/frog.svg?url', () => ({
  default: '/mock/frog.svg'
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
  test('renders the frog fallback immediately, with no placeholder, when avatar is undefined', async () => {
    const wrapper = await mountImage()

    expect(mockLoadAvatarUrl).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="avatar-image__placeholder"]').exists()).toBe(false)
    expect(wrapper.find('img').attributes('src')).toBe('/mock/frog.svg')
  })

  test('shows the shimmer placeholder, not the frog, while a set avatar has not resolved yet', async () => {
    mockLoadAvatarUrl.mockReturnValue(new Promise(() => {}))
    const wrapper = await mountImage({ avatar: 'panda' })

    const placeholder = wrapper.find('[data-testid="avatar-image__placeholder"]')
    expect(placeholder.exists()).toBe(true)
    expect(placeholder.classes()).toContain('bg-skeleton')
    expect(placeholder.classes()).toContain('bgx-diagonal-stripes')
    expect(placeholder.classes()).toContain('shimmer')
    expect(wrapper.find('img').exists()).toBe(false)
  })

  test('resolves and renders the matching SVG URL when avatar matches a known key', async () => {
    mockLoadAvatarUrl.mockReturnValue(Promise.resolve('/mock/panda.svg'))
    const wrapper = await mountImage({ avatar: 'panda' })

    expect(mockLoadAvatarUrl).toHaveBeenCalledWith('panda')
    expect(wrapper.find('[data-testid="avatar-image__placeholder"]').exists()).toBe(false)
    expect(wrapper.find('img').attributes('src')).toBe('/mock/panda.svg')
  })

  test('a resolved avatar starts at opacity-0 and only reaches opacity-100 once the img fires load', async () => {
    mockLoadAvatarUrl.mockReturnValue(Promise.resolve('/mock/panda.svg'))
    const wrapper = await mountImage({ avatar: 'panda' })

    const img = wrapper.find('img')
    expect(img.classes()).toContain('opacity-0')
    expect(img.classes()).not.toContain('opacity-100')

    await img.trigger('load')

    expect(img.classes()).toContain('opacity-100')
    expect(img.classes()).not.toContain('opacity-0')
  })

  test('the default frog render has no fade-in gate — it is opacity-100 without a load event', async () => {
    const wrapper = await mountImage()

    expect(wrapper.find('img').classes()).toContain('opacity-100')
  })

  test('changing the avatar prop shows the placeholder again, not the previous avatar, until the new url resolves', async () => {
    let resolveFirst
    mockLoadAvatarUrl.mockImplementation((key) =>
      key === 'panda' ? new Promise((resolve) => (resolveFirst = resolve)) : new Promise(() => {})
    )
    const wrapper = await mountImage({ avatar: 'panda' })
    resolveFirst('/mock/panda.svg')
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('img').attributes('src')).toBe('/mock/panda.svg')

    await wrapper.setProps({ avatar: 'otter' })
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="avatar-image__placeholder"]').exists()).toBe(true)
    expect(wrapper.find('img').exists()).toBe(false)
  })

  test('a slow first resolve settling after a second prop change does not overwrite the newer avatar', async () => {
    let resolvePanda
    let resolveOtter
    mockLoadAvatarUrl.mockImplementation((key) => {
      if (key === 'panda') return new Promise((resolve) => (resolvePanda = resolve))
      if (key === 'otter') return new Promise((resolve) => (resolveOtter = resolve))
      return new Promise(() => {})
    })

    const wrapper = await mountImage({ avatar: 'panda' })
    await wrapper.setProps({ avatar: 'otter' })
    await wrapper.vm.$nextTick()

    // The stale "panda" resolve arrives after the prop already moved to "otter".
    resolvePanda('/mock/panda.svg')
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.find('[data-testid="avatar-image__placeholder"]').exists()).toBe(true)

    resolveOtter('/mock/otter.svg')
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('img').attributes('src')).toBe('/mock/otter.svg')
  })

  test('falls back to the frog image when avatar is a stale/unknown key', async () => {
    mockLoadAvatarUrl.mockReturnValue(null)
    const wrapper = await mountImage({ avatar: 'no-longer-exists' })

    expect(mockLoadAvatarUrl).toHaveBeenCalledWith('no-longer-exists')
    expect(wrapper.find('img').attributes('src')).toBe('/mock/frog.svg')
  })
})
