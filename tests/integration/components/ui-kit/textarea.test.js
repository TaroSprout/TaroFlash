import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h, useAttrs } from 'vue'
import UiTextarea from '@/components/ui-kit/textarea.vue'
import { vSfx } from '@/sfx/directive'

// UiTooltip uses @floating-ui/vue and Teleport; stub it so the slot content
// (the textarea markup) renders in the wrapper tree.
const TooltipStub = defineComponent({
  name: 'UiTooltip',
  inheritAttrs: false,
  setup(_p, { slots }) {
    const attrs = useAttrs()
    return () => h('label', { ...attrs }, slots.default?.())
  }
})

vi.mock('@/composables/ui/media-query', () => ({
  useMatchMedia: vi.fn(() => ({ value: false }))
}))

const { mockEmitSfx } = vi.hoisted(() => ({
  mockEmitSfx: vi.fn()
}))

vi.mock('@/sfx/bus', () => ({
  emitSfx: mockEmitSfx,
  emitHoverSfx: vi.fn()
}))

function mountTextarea(props = {}) {
  return mount(UiTextarea, {
    props,
    global: { stubs: { UiTooltip: TooltipStub } }
  })
}

function mountTextareaWithSfx(props = {}) {
  return mount(UiTextarea, {
    props,
    global: {
      stubs: { UiTooltip: TooltipStub },
      directives: { sfx: vSfx }
    }
  })
}

describe('UiTextarea — max_chars', () => {
  test('wires maxlength attribute onto the <textarea> when max_chars is set [obligation]', () => {
    const wrapper = mountTextarea({ max_chars: 100 })
    const ta = wrapper.find('textarea')
    expect(ta.attributes('maxlength')).toBe('100')
  })

  test('does not set maxlength attribute when max_chars is omitted', () => {
    const wrapper = mountTextarea()
    const ta = wrapper.find('textarea')
    expect(ta.attributes('maxlength')).toBeUndefined()
  })

  test('renders the X/N counter span when max_chars is set [obligation]', () => {
    const wrapper = mountTextarea({ max_chars: 50 })
    const counter = wrapper.find('[data-testid="ui-kit-textarea-char-count"]')
    expect(counter.exists()).toBe(true)
    expect(counter.text()).toBe('0/50')
  })

  test('does not render the counter span when max_chars is omitted', () => {
    const wrapper = mountTextarea()
    expect(wrapper.find('[data-testid="ui-kit-textarea-char-count"]').exists()).toBe(false)
  })

  test('counter reflects the current character count as the model value changes', async () => {
    const wrapper = mountTextarea({ max_chars: 100, value: 'hello' })
    const counter = wrapper.find('[data-testid="ui-kit-textarea-char-count"]')
    expect(counter.text()).toBe('5/100')
  })

  test('counter does not have the --limit class when below the limit [obligation]', () => {
    const wrapper = mountTextarea({ max_chars: 100, value: 'hi' })
    const counter = wrapper.find('[data-testid="ui-kit-textarea-char-count"]')
    expect(counter.classes()).not.toContain('ui-kit-textarea-char-count--limit')
  })

  test('counter has the --limit class when at the limit [obligation]', () => {
    const wrapper = mountTextarea({ max_chars: 5, value: 'hello' })
    const counter = wrapper.find('[data-testid="ui-kit-textarea-char-count"]')
    expect(counter.classes()).toContain('ui-kit-textarea-char-count--limit')
  })

  test('counter has the --limit class when over the limit [obligation]', () => {
    // maxlength prevents the browser from going over, but the component
    // itself uses >= check so test with a value that equals max (limit case)
    const wrapper = mountTextarea({ max_chars: 3, value: 'abc' })
    const counter = wrapper.find('[data-testid="ui-kit-textarea-char-count"]')
    expect(counter.classes()).toContain('ui-kit-textarea-char-count--limit')
  })
})

describe('UiTextarea — style props', () => {
  test('textarea element is present in the DOM [obligation]', () => {
    const wrapper = mountTextarea()
    expect(wrapper.find('[data-testid="ui-kit-textarea"]').exists()).toBe(true)
    expect(wrapper.find('textarea').exists()).toBe(true)
  })

  test('textarea wrapper element has data-testid [obligation]', () => {
    const wrapper = mountTextarea({ max_chars: 20 })
    expect(wrapper.find('[data-testid="ui-kit-textarea"]').exists()).toBe(true)
  })
})

describe('UiTextarea — model binding', () => {
  test('binds value model to the textarea', async () => {
    const wrapper = mountTextarea({ value: 'initial', max_chars: 100 })
    expect(wrapper.find('[data-testid="ui-kit-textarea-char-count"]').text()).toBe('7/100')
  })

  test('emits update:value when textarea is typed into', async () => {
    const wrapper = mountTextarea({ max_chars: 50 })
    await wrapper.find('textarea').setValue('typed')
    expect(wrapper.emitted('update:value')).toBeTruthy()
  })
})

describe('UiTextarea — placeholder', () => {
  test('sets placeholder attribute on the textarea', () => {
    const wrapper = mountTextarea({ placeholder: 'Enter text…' })
    expect(wrapper.find('textarea').attributes('placeholder')).toBe('Enter text…')
  })
})

describe('UiTextarea — label', () => {
  test('renders a label span when label prop is provided', () => {
    const wrapper = mountTextarea({ label: 'Description' })
    expect(wrapper.find('span').text()).toBe('Description')
  })

  test('does not render a label span when label prop is omitted', () => {
    const wrapper = mountTextarea()
    // Only the char-count span may appear; no label span
    const spans = wrapper.findAll('span')
    spans.forEach((s) => {
      expect(s.text()).not.toBe('Description')
    })
  })
})

describe('UiTextarea — noNewlines [obligation]', () => {
  test('pressing Enter does NOT insert a newline into the model value when noNewlines is true [obligation]', async () => {
    const wrapper = mountTextarea({ value: 'hello', noNewlines: true })
    const ta = wrapper.find('textarea')
    await ta.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('update:value')).toBeFalsy()
  })

  test('pressing Enter does not preventDefault when noNewlines is false [obligation]', async () => {
    const wrapper = mountTextarea({ value: 'hello', noNewlines: false })
    const ta = wrapper.find('textarea').element
    const event = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true })
    ta.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
  })

  test('pressing Enter does not preventDefault when noNewlines is omitted [obligation]', async () => {
    const wrapper = mountTextarea({ value: 'hello' })
    const ta = wrapper.find('textarea').element
    const event = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true })
    ta.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
  })

  test('pressing Enter calls preventDefault when noNewlines is true [obligation]', async () => {
    const wrapper = mountTextarea({ value: 'hello', noNewlines: true })
    const ta = wrapper.find('textarea').element
    const event = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true })
    ta.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
  })

  test('sanitizes a pasted value containing newlines to spaces when noNewlines is true [obligation]', async () => {
    const wrapper = mountTextarea({ noNewlines: true })
    const ta = wrapper.find('textarea')
    await ta.setValue('line one\nline two\r\nline three')
    const emitted = wrapper.emitted('update:value')
    const last = emitted[emitted.length - 1][0]
    expect(last).not.toContain('\n')
    expect(last).not.toContain('\r')
  })

  test('does not sanitize newlines when noNewlines is false', async () => {
    const wrapper = mountTextarea({ noNewlines: false })
    const ta = wrapper.find('textarea')
    await ta.setValue('line one\nline two')
    const emitted = wrapper.emitted('update:value')
    const last = emitted[emitted.length - 1][0]
    expect(last).toBe('line one\nline two')
  })
})

describe('UiTextarea — max_chars behavior unaffected by noNewlines [obligation]', () => {
  test('char count still reflects value length when noNewlines is true [obligation]', () => {
    const wrapper = mountTextarea({ max_chars: 100, value: 'hello', noNewlines: true })
    const counter = wrapper.find('[data-testid="ui-kit-textarea-char-count"]')
    expect(counter.text()).toBe('5/100')
  })
})

describe('UiTextarea — sfx', () => {
  beforeEach(() => {
    mockEmitSfx.mockReset()
  })

  test('plays type_05 sfx when the <textarea> receives focus [obligation]', async () => {
    const wrapper = mountTextareaWithSfx()
    await wrapper.find('textarea').trigger('focus')
    expect(mockEmitSfx).toHaveBeenCalledWith('type_05', expect.anything())
  })
})
