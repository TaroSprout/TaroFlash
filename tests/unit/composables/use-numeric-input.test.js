import { describe, test, expect } from 'vite-plus/test'
import { ref } from 'vue'
import { useNumericInput } from '@/composables/ui/numeric-input'

function makeInput() {
  const value = ref(50)
  const handlers = useNumericInput(value, { min: () => 1, max: () => 100 })
  const el = document.createElement('input')
  el.type = 'text'
  return { value, handlers, el }
}

describe('useNumericInput', () => {
  test('clamp keeps numbers within bounds', () => {
    const { handlers } = makeInput()
    expect(handlers.clamp(50)).toBe(50)
    expect(handlers.clamp(-1)).toBe(1)
    expect(handlers.clamp(999)).toBe(100)
  })

  test('onInput parses numeric input and writes the clamped value', () => {
    const { value, handlers, el } = makeInput()
    el.value = '42'
    handlers.onInput({ target: el })
    expect(value.value).toBe(42)
  })

  test('onInput clamps values above max', () => {
    const { value, handlers, el } = makeInput()
    el.value = '999'
    handlers.onInput({ target: el })
    expect(value.value).toBe(100)
  })

  test('onInput clamps values below min', () => {
    const { value, handlers, el } = makeInput()
    el.value = '-5'
    handlers.onInput({ target: el })
    expect(value.value).toBe(1)
  })

  test('onInput skips empty input (does not write)', () => {
    const { value, handlers, el } = makeInput()
    el.value = ''
    handlers.onInput({ target: el })
    expect(value.value).toBe(50)
  })

  test('onInput skips non-finite input (does not write)', () => {
    const { value, handlers, el } = makeInput()
    el.value = 'abc'
    handlers.onInput({ target: el })
    expect(value.value).toBe(50)
  })

  test('onBeforeInput allows digits', () => {
    const { handlers } = makeInput()
    let prevented = false
    handlers.onBeforeInput({ data: '7', preventDefault: () => (prevented = true) })
    expect(prevented).toBe(false)
  })

  test('onBeforeInput blocks letters', () => {
    const { handlers } = makeInput()
    let prevented = false
    handlers.onBeforeInput({ data: 'a', preventDefault: () => (prevented = true) })
    expect(prevented).toBe(true)
  })

  test('onBeforeInput blocks "-" when min is non-negative', () => {
    const { handlers } = makeInput()
    let prevented = false
    handlers.onBeforeInput({ data: '-', preventDefault: () => (prevented = true) })
    expect(prevented).toBe(true)
  })

  test('onBeforeInput allows "-" when min is negative', () => {
    const value = ref(0)
    const handlers = useNumericInput(value, { min: () => -10, max: () => 10 })
    let prevented = false
    handlers.onBeforeInput({ data: '-', preventDefault: () => (prevented = true) })
    expect(prevented).toBe(false)
  })

  test('onBeforeInput skips when data is null (e.g. composition events)', () => {
    const { handlers } = makeInput()
    let prevented = false
    handlers.onBeforeInput({ data: null, preventDefault: () => (prevented = true) })
    expect(prevented).toBe(false)
  })

  test('onFocus selects the input', () => {
    const { handlers, el } = makeInput()
    el.value = '50'
    document.body.appendChild(el)
    el.focus()
    handlers.onFocus({ target: el })
    expect(el.selectionStart).toBe(0)
    expect(el.selectionEnd).toBe(2)
    document.body.removeChild(el)
  })

  test('onBlur snaps blank input back to the model value', () => {
    const { value, handlers, el } = makeInput()
    el.value = ''
    handlers.onBlur({ target: el })
    expect(el.value).toBe('50')
    expect(value.value).toBe(50)
  })

  test('onBlur snaps non-finite input back to the model value', () => {
    const { value, handlers, el } = makeInput()
    el.value = 'abc'
    handlers.onBlur({ target: el })
    expect(el.value).toBe('50')
    expect(value.value).toBe(50)
  })

  test('onBlur clamps + writes a finite-but-out-of-range input', () => {
    const { value, handlers, el } = makeInput()
    el.value = '500'
    handlers.onBlur({ target: el })
    expect(value.value).toBe(100)
    expect(el.value).toBe('100')
  })
})
