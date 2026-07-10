import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount, flushPromises } from '@vue/test-utils'
import UiImage from '@/components/ui-kit/image.vue'
import logger from '@/utils/logger'

vi.spyOn(logger, 'warn')

function mountImage(props) {
  return shallowMount(UiImage, { props })
}

describe('UiImage', () => {
  beforeEach(() => {
    vi.mocked(logger.warn).mockReset()
  })

  test('renders an eager image (shortcuts is in the eager list)', async () => {
    const wrapper = mountImage({ src: 'shortcuts' })
    await flushPromises()
    const img = wrapper.find('img')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBeTruthy()
    expect(img.attributes('alt')).toBe('shortcuts')
  })

  test('renders another eager image (darkmode-dark)', async () => {
    const wrapper = mountImage({ src: 'darkmode-dark' })
    await flushPromises()
    const img = wrapper.find('img')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBeTruthy()
  })

  test('logs a warning for a missing image', async () => {
    const wrapper = mountImage({ src: 'nonexistent-image-xyz' })
    await flushPromises()
    expect(logger.warn).toHaveBeenCalledWith('No image found for: nonexistent-image-xyz')
    expect(wrapper.find('img').exists()).toBe(false)
  })

  test('applies the size class', async () => {
    const wrapper = mountImage({ src: 'shortcuts', size: 'lg' })
    await flushPromises()
    const img = wrapper.find('img')
    expect(img.classes()).toContain('ui-kit-image--lg')
  })

  test('defaults size to unset', async () => {
    const wrapper = mountImage({ src: 'shortcuts' })
    await flushPromises()
    const img = wrapper.find('img')
    expect(img.classes()).toContain('ui-kit-image--unset')
  })

  // ── eager src resolves synchronously [obligation] ─────────────────────────

  test('an eager-whitelisted src renders its <img> synchronously, with no separate tick needed after mount [obligation]', () => {
    const wrapper = mountImage({ src: 'shortcuts' })
    const img = wrapper.find('img')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBeTruthy()
  })

  // ── reactive src prop changes [obligation] ────────────────────────────────

  test('changing src to another eager image re-resolves the rendered <img> [obligation]', async () => {
    const wrapper = mountImage({ src: 'shortcuts' })
    await flushPromises()
    const firstSrc = wrapper.find('img').attributes('src')

    await wrapper.setProps({ src: 'darkmode-dark' })
    await flushPromises()

    const secondSrc = wrapper.find('img').attributes('src')
    expect(secondSrc).toBeTruthy()
    expect(secondSrc).not.toBe(firstSrc)
    expect(wrapper.find('img').attributes('alt')).toBe('darkmode-dark')
  })

  test('changing src from an eager image to a lazy image re-resolves the rendered <img> (regression) [obligation]', async () => {
    const wrapper = mountImage({ src: 'shortcuts' })
    await flushPromises()
    expect(wrapper.find('img').exists()).toBe(true)

    await wrapper.setProps({ src: 'binder-clip' })
    await vi.waitFor(() => expect(wrapper.find('img').exists()).toBe(true))

    const img = wrapper.find('img')
    expect(img.attributes('alt')).toBe('binder-clip')
  })
})
