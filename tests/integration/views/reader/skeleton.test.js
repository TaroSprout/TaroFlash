import { describe, test, expect } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import ReaderSkeleton from '@/views/reader/skeleton.vue'

describe('ReaderSkeleton', () => {
  test('renders the skeleton root', () => {
    const wrapper = shallowMount(ReaderSkeleton)

    expect(wrapper.find('[data-testid="reader-skeleton"]').exists()).toBe(true)
  })

  test('renders one placeholder line per configured width', () => {
    const wrapper = shallowMount(ReaderSkeleton)

    expect(wrapper.findAll('[data-testid="reader-skeleton__line"]')).toHaveLength(9)
  })

  test('each line carries a distinct width utility class', () => {
    const wrapper = shallowMount(ReaderSkeleton)

    const classes = wrapper
      .findAll('[data-testid="reader-skeleton__line"]')
      .map((line) => line.classes().find((c) => c.startsWith('w-')))

    expect(classes).toEqual([
      'w-full',
      'w-11/12',
      'w-full',
      'w-10/12',
      'w-full',
      'w-9/12',
      'w-full',
      'w-11/12',
      'w-8/12'
    ])
  })
})
