import { describe, test, expect, beforeEach, afterEach, vi } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import ColorPage from '@/views/admin/color-page/index.vue'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key) => key }) }))

const ModeColumnStub = defineComponent({
  name: 'ModeColumn',
  props: ['mode', 'open_station'],
  emits: ['open-roles'],
  setup(props, { emit }) {
    return () =>
      h('section', {}, [
        h(
          'button',
          {
            'data-testid': `mode-column-stub__${props.mode}`,
            onClick: (event) => emit('open-roles', 'page', event.currentTarget)
          },
          `open ${props.mode}`
        )
      ])
  }
})

const ShadeListStub = defineComponent({
  name: 'ShadeList',
  setup: () => () => h('div', { 'data-testid': 'shade-list-stub' })
})

function mountPage() {
  return mount(ColorPage, {
    global: {
      stubs: { ModeColumn: ModeColumnStub, ShadeList: ShadeListStub }
    }
  })
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  localStorage.clear()
})

describe('ColorPage — toolbar', () => {
  test('undo is disabled with nothing to undo', () => {
    const wrapper = mountPage()
    expect(
      wrapper.find('[data-testid="admin-color-page__undo"]').attributes('disabled')
    ).toBeDefined()
  })

  test('clicking reset enables undo', async () => {
    const wrapper = mountPage()
    await wrapper.find('[data-testid="admin-color-page__reset"]').trigger('click')

    expect(
      wrapper.find('[data-testid="admin-color-page__undo"]').attributes('disabled')
    ).toBeUndefined()
  })

  test('clicking undo after a reset re-disables it', async () => {
    const wrapper = mountPage()
    await wrapper.find('[data-testid="admin-color-page__reset"]').trigger('click')
    await wrapper.find('[data-testid="admin-color-page__undo"]').trigger('click')

    expect(
      wrapper.find('[data-testid="admin-color-page__undo"]').attributes('disabled')
    ).toBeDefined()
  })
})

describe('ColorPage — role panel', () => {
  test('opening roles for a station shows the role panel', async () => {
    const wrapper = mountPage()
    expect(wrapper.find('[data-testid="admin-color-page__role-panel"]').exists()).toBe(false)

    await wrapper.find('[data-testid="mode-column-stub__light"]').trigger('click')

    expect(wrapper.find('[data-testid="admin-color-page__role-panel"]').exists()).toBe(true)
  })

  test('closing the panel from role-panel hides it', async () => {
    const wrapper = mountPage()
    await wrapper.find('[data-testid="mode-column-stub__light"]').trigger('click')

    await wrapper.find('[data-testid="role-panel__close"]').trigger('click')

    expect(wrapper.find('[data-testid="admin-color-page__role-panel"]').exists()).toBe(false)
  })
})

describe('ColorPage — redo', () => {
  test('clicking redo after an undo replays the change', async () => {
    const wrapper = mountPage()
    await wrapper.find('[data-testid="admin-color-page__reset"]').trigger('click')
    await wrapper.find('[data-testid="admin-color-page__undo"]').trigger('click')

    expect(
      wrapper.find('[data-testid="admin-color-page__redo"]').attributes('disabled')
    ).toBeUndefined()

    await wrapper.find('[data-testid="admin-color-page__redo"]').trigger('click')

    expect(
      wrapper.find('[data-testid="admin-color-page__redo"]').attributes('disabled')
    ).toBeDefined()
  })

  test('Cmd+Shift+Z redoes an undone change', async () => {
    const wrapper = mountPage()
    await wrapper.find('[data-testid="admin-color-page__reset"]').trigger('click')
    await wrapper.find('[data-testid="admin-color-page__undo"]').trigger('click')

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', metaKey: true, shiftKey: true }))
    await wrapper.vm.$nextTick()

    expect(
      wrapper.find('[data-testid="admin-color-page__redo"]').attributes('disabled')
    ).toBeDefined()
  })
})

describe('ColorPage — copy export', () => {
  test('clicking copy writes the export text to the clipboard and flips the label', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })

    const wrapper = mountPage()
    const button = wrapper.find('[data-testid="admin-color-page__copy"]')
    const before_label = button.text()

    await button.trigger('click')
    await wrapper.vm.$nextTick()

    expect(writeText).toHaveBeenCalledWith(expect.any(String))
    expect(wrapper.find('[data-testid="admin-color-page__copy"]').text()).not.toBe(before_label)
  })

  test('a further change to the export text resets the copied label', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })

    // Mount without the ShadeList stub so a real add-shade click changes the export text.
    const wrapper = mount(ColorPage, { global: { stubs: { ModeColumn: ModeColumnStub } } })
    const button = wrapper.find('[data-testid="admin-color-page__copy"]')
    const before_label = button.text()

    await button.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="admin-color-page__copy"]').text()).not.toBe(before_label)

    await wrapper.find('[data-testid="shade-list__add"]').trigger('click')

    expect(wrapper.find('[data-testid="admin-color-page__copy"]').text()).toBe(before_label)
  })
})

describe('ColorPage — panel placement', () => {
  test('placing the panel to the right of a preview flush with the left edge', async () => {
    const wrapper = mountPage()
    const section = wrapper.find('section').element
    // Flush against the left edge always leaves room to the right (panel width + gap << viewport).
    section.getBoundingClientRect = () => ({ top: 100, left: 0, right: 0, bottom: 300 })

    await wrapper.find('[data-testid="mode-column-stub__light"]').trigger('click')

    const panel = wrapper.find('[data-testid="admin-color-page__role-panel"]')
    expect(Number.parseInt(panel.attributes('style').match(/left: (-?\d+)px/)[1], 10)).toBe(12)
  })

  test('falling back below the preview when neither side has room', async () => {
    const wrapper = mountPage()
    const section = wrapper.find('section').element
    // Spanning the full viewport width leaves no room on either side.
    section.getBoundingClientRect = () => ({
      top: 100,
      left: 0,
      right: window.innerWidth,
      bottom: 300
    })

    await wrapper.find('[data-testid="mode-column-stub__light"]').trigger('click')

    const panel = wrapper.find('[data-testid="admin-color-page__role-panel"]')
    const top = Number.parseInt(panel.attributes('style').match(/top: (-?\d+)px/)[1], 10)
    expect(top).toBeGreaterThanOrEqual(300)
  })

  test('resizing the window while the panel is open re-places it', async () => {
    const wrapper = mountPage()
    const section = wrapper.find('section').element
    section.getBoundingClientRect = () => ({ top: 100, left: 100, right: 200, bottom: 300 })
    await wrapper.find('[data-testid="mode-column-stub__light"]').trigger('click')

    window.dispatchEvent(new Event('resize'))
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="admin-color-page__role-panel"]').exists()).toBe(true)
  })
})

describe('ColorPage — keydown undo shortcut [obligation]', () => {
  test('Cmd+Z inside an input does not undo the page', async () => {
    const wrapper = mountPage()
    await wrapper.find('[data-testid="admin-color-page__reset"]').trigger('click')

    const textarea = wrapper.find('[data-testid="admin-color-page__export-text"]')
    textarea.element.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'z', metaKey: true, bubbles: true })
    )
    await wrapper.vm.$nextTick()

    expect(
      wrapper.find('[data-testid="admin-color-page__undo"]').attributes('disabled')
    ).toBeUndefined()
  })

  test('Cmd+Z outside an input undoes the page and leaves the open panel open', async () => {
    const wrapper = mountPage()
    await wrapper.find('[data-testid="admin-color-page__reset"]').trigger('click')
    await wrapper.find('[data-testid="mode-column-stub__light"]').trigger('click')

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', metaKey: true }))
    await wrapper.vm.$nextTick()

    expect(
      wrapper.find('[data-testid="admin-color-page__undo"]').attributes('disabled')
    ).toBeDefined()
    expect(wrapper.find('[data-testid="admin-color-page__role-panel"]').exists()).toBe(true)
  })
})
