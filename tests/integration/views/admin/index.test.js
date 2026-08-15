import { describe, test, expect, vi } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import Admin from '@/views/admin/index.vue'

vi.mock('@/views/admin/feedback-page/index.vue', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    default: defineComponent({
      name: 'FeedbackPage',
      setup: () => () => h('div', { 'data-testid': 'feedback-page-stub' })
    })
  }
})

vi.mock('@/views/admin/color-page/index.vue', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    default: defineComponent({
      name: 'ColorPage',
      setup: () => () => h('div', { 'data-testid': 'color-page-stub' })
    })
  }
})

const PagedWindowStub = defineComponent({
  name: 'PagedWindow',
  props: {
    title: String,
    pages: { type: Array, default: () => [] },
    active: String,
    scroll_body: { type: Boolean, default: undefined }
  },
  emits: ['close', 'update:active'],
  setup(props, { slots, emit }) {
    return () =>
      h('div', { 'data-testid': 'admin-container', 'data-title': props.title }, [
        h('button', { 'data-testid': 'pw__close', onClick: () => emit('close') }, 'close'),
        h(
          'div',
          { 'data-testid': 'pw__default' },
          slots.default?.({ displayed_page: props.active })
        )
      ])
  }
})

function mountAdmin(close = vi.fn()) {
  return {
    close,
    wrapper: mount(Admin, {
      props: { close },
      global: { stubs: { PagedWindow: PagedWindowStub } }
    })
  }
}

describe('Admin — chrome', () => {
  test('passes the Admin Tools title to PagedWindow', () => {
    const { wrapper } = mountAdmin()
    expect(wrapper.find('[data-testid="admin-container"]').attributes('data-title')).toBe(
      'Admin Tools'
    )
  })

  test('registers the feedback and colors pages', () => {
    const { wrapper } = mountAdmin()
    const pw = wrapper.findComponent(PagedWindowStub)
    expect(pw.props('pages').map((p) => p.value)).toEqual(['feedback', 'colors'])
  })

  test('close event forwards to the close prop', async () => {
    const { wrapper, close } = mountAdmin()
    await wrapper.find('[data-testid="pw__close"]').trigger('click')
    expect(close).toHaveBeenCalledOnce()
  })

  test('active_page starts on feedback and follows the v-model:active binding', async () => {
    const { wrapper } = mountAdmin()
    const pw = wrapper.findComponent(PagedWindowStub)
    expect(pw.props('active')).toBe('feedback')

    pw.vm.$emit('update:active', 'other')
    await nextTick()

    expect(wrapper.findComponent(PagedWindowStub).props('active')).toBe('other')
  })

  test('opts the window body into scroll_body', () => {
    const { wrapper } = mountAdmin()
    expect(wrapper.findComponent(PagedWindowStub).props('scroll_body')).toBe(true)
  })
})

describe('Admin — content [obligation]', () => {
  test('renders the feedback page by default', () => {
    const { wrapper } = mountAdmin()
    expect(wrapper.find('[data-testid="feedback-page-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="color-page-stub"]').exists()).toBe(false)
  })

  test('renders the colour page only when displayed_page is "colors"', async () => {
    const { wrapper } = mountAdmin()
    const pw = wrapper.findComponent(PagedWindowStub)

    pw.vm.$emit('update:active', 'colors')
    await nextTick()

    expect(wrapper.find('[data-testid="color-page-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="feedback-page-stub"]').exists()).toBe(false)
  })

  test('falls back to the feedback page for any other displayed_page value', async () => {
    const { wrapper } = mountAdmin()
    const pw = wrapper.findComponent(PagedWindowStub)

    pw.vm.$emit('update:active', 'somewhere-else')
    await nextTick()

    expect(wrapper.find('[data-testid="feedback-page-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="color-page-stub"]').exists()).toBe(false)
  })
})
