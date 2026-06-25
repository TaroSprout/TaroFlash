import { describe, test, expect } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import TextEditor from '@/components/card/text-editor.vue'

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeEditor(props = {}) {
  return shallowMount(TextEditor, { props })
}

function getContainer(wrapper) {
  return wrapper.find('[data-testid="text-editor-container"]')
}

function getEditorEl(wrapper) {
  return wrapper.find('[data-testid="text-editor"]')
}

function getPlaceholder(wrapper) {
  return wrapper.find('[data-testid="text-editor__placeholder"]')
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('TextEditor', () => {
  // ── Structure ──────────────────────────────────────────────────────────────

  test('renders the editor container', () => {
    const wrapper = makeEditor()
    expect(getContainer(wrapper).exists()).toBe(true)
  })

  test('renders the editor element', () => {
    const wrapper = makeEditor()
    expect(getEditorEl(wrapper).exists()).toBe(true)
  })

  // ── Default classes ────────────────────────────────────────────────────────
  // Horizontal alignment lives on the editable; vertical lives on the container.

  test('applies default horizontal alignment class when no attributes provided', () => {
    const wrapper = makeEditor()
    expect(getEditorEl(wrapper).classes()).toContain('text-editor--h-center')
  })

  test('applies default vertical alignment class on the container when no attributes provided', () => {
    const wrapper = makeEditor()
    expect(getContainer(wrapper).classes()).toContain('text-editor--v-center')
  })

  // ── Alignment classes ──────────────────────────────────────────────────────

  test('applies text-editor--h-left for left horizontal alignment', () => {
    const wrapper = makeEditor({ attributes: { horizontal_alignment: 'left' } })
    expect(getEditorEl(wrapper).classes()).toContain('text-editor--h-left')
  })

  test('applies text-editor--h-right for right horizontal alignment', () => {
    const wrapper = makeEditor({ attributes: { horizontal_alignment: 'right' } })
    expect(getEditorEl(wrapper).classes()).toContain('text-editor--h-right')
  })

  test('applies text-editor--v-top on the container for top vertical alignment', () => {
    const wrapper = makeEditor({ attributes: { vertical_alignment: 'top' } })
    expect(getContainer(wrapper).classes()).toContain('text-editor--v-top')
  })

  test('applies text-editor--v-bottom on the container for bottom vertical alignment', () => {
    const wrapper = makeEditor({ attributes: { vertical_alignment: 'bottom' } })
    expect(getContainer(wrapper).classes()).toContain('text-editor--v-bottom')
  })

  // ── Combined attributes ────────────────────────────────────────────────────

  test('applies horizontal alignment on editable and vertical alignment on container together', () => {
    const wrapper = makeEditor({
      attributes: {
        text_size: 6,
        horizontal_alignment: 'right',
        vertical_alignment: 'bottom'
      }
    })
    expect(getEditorEl(wrapper).classes()).toContain('text-editor--h-right')
    expect(getContainer(wrapper).classes()).toContain('text-editor--v-bottom')
  })

  // ── Partial attributes ─────────────────────────────────────────────────────

  test('falls back to defaults for missing attribute fields', () => {
    const wrapper = makeEditor({ attributes: { text_size: 2 } })
    expect(getEditorEl(wrapper).classes()).toContain('text-editor--h-center')
    expect(getContainer(wrapper).classes()).toContain('text-editor--v-center')
  })

  // ── contenteditable wiring ─────────────────────────────────────────────────

  test('enables plaintext-only contenteditable when not disabled', () => {
    const wrapper = makeEditor()
    expect(getEditorEl(wrapper).attributes('contenteditable')).toBe('plaintext-only')
  })

  test('disables contenteditable when disabled', () => {
    const wrapper = makeEditor({ disabled: true })
    expect(getEditorEl(wrapper).attributes('contenteditable')).toBe('false')
  })

  test('seeds initial textContent from content prop', () => {
    const wrapper = makeEditor({ content: 'hello' })
    expect(getEditorEl(wrapper).element.textContent).toBe('hello')
  })

  test('emits update with current textContent on input', async () => {
    const wrapper = makeEditor()
    const el = getEditorEl(wrapper)
    el.element.textContent = 'typed'
    await el.trigger('input')
    expect(wrapper.emitted('update')).toEqual([['typed']])
  })

  // ── Empty normalization [obligation] ───────────────────────────────────────

  test('on_input collapses whitespace-only innerText to empty string [obligation]', async () => {
    const wrapper = makeEditor({ content: 'hello' })
    const el = getEditorEl(wrapper)
    // Simulate innerText after select-all+delete — browser leaves a trailing newline
    Object.defineProperty(el.element, 'innerText', { value: '\n', writable: true })
    await el.trigger('input')
    expect(wrapper.emitted('update')).toEqual([['']])
  })

  test('on_input sets has_content false for whitespace-only input so placeholder reappears [obligation]', async () => {
    const wrapper = makeEditor({ placeholder: 'Type here...' })
    const el = getEditorEl(wrapper)
    // First type something so placeholder hides
    el.element.textContent = 'x'
    await el.trigger('input')
    expect(getPlaceholder(wrapper).exists()).toBe(false)

    // Now clear with a trailing newline (browser behavior on block content)
    Object.defineProperty(el.element, 'innerText', { value: '\n', writable: true })
    await el.trigger('input')
    expect(getPlaceholder(wrapper).exists()).toBe(true)
  })

  test('has_content seeds from trimmed content prop so whitespace-only content shows placeholder [obligation]', () => {
    const wrapper = makeEditor({ placeholder: 'Type here...', content: '   ' })
    expect(getPlaceholder(wrapper).exists()).toBe(true)
  })

  // ── Uncontrolled editable surface ──────────────────────────────────────────
  // The editable div is seeded once on mount, then owned by the browser. It must
  // not re-sync from `content` — in edit mode `content` is just the user's own
  // input echoed back, and rewriting it would snap the caret to the start. This
  // is what previously broke multi-line backspace (caret jumped to line one).

  test('editable editor ignores content prop changes after mount (caret-safe)', async () => {
    const wrapper = makeEditor({ content: 'x' })
    const el = getEditorEl(wrapper).element

    // The browser owns the editable DOM after mount (here standing in for the
    // user's typing). A later content change must not rewrite it.
    el.textContent = 'user typed\nline two'
    await wrapper.setProps({ content: 'something external' })

    expect(el.textContent).toBe('user typed\nline two')
  })

  test('disabled editor renders content reactively via Vue (no imperative sync)', async () => {
    const wrapper = makeEditor({ disabled: true, content: 'old' })
    expect(getEditorEl(wrapper).element.textContent).toBe('old')

    await wrapper.setProps({ content: 'new' })

    expect(getEditorEl(wrapper).element.textContent).toBe('new')
  })

  test('emits focus and blur on native focus events', async () => {
    const wrapper = makeEditor()
    const el = getEditorEl(wrapper)
    await el.trigger('focus')
    await el.trigger('blur')
    expect(wrapper.emitted('focus')).toHaveLength(1)
    expect(wrapper.emitted('blur')).toHaveLength(1)
  })

  // ── Placeholder ────────────────────────────────────────────────────────────

  test('shows placeholder when no content and not disabled', () => {
    const wrapper = makeEditor({ placeholder: 'Type here...' })
    const placeholder = getPlaceholder(wrapper)
    expect(placeholder.exists()).toBe(true)
    expect(placeholder.text()).toBe('Type here...')
  })

  test('hides placeholder when content prop is set', () => {
    const wrapper = makeEditor({ placeholder: 'Type here...', content: 'hi' })
    expect(getPlaceholder(wrapper).exists()).toBe(false)
  })

  test('hides placeholder after typing', async () => {
    const wrapper = makeEditor({ placeholder: 'Type here...' })
    const el = getEditorEl(wrapper)
    el.element.textContent = 'typed'
    await el.trigger('input')
    expect(getPlaceholder(wrapper).exists()).toBe(false)
  })

  test('hides placeholder when disabled', () => {
    const wrapper = makeEditor({ placeholder: 'Type here...', disabled: true })
    expect(getPlaceholder(wrapper).exists()).toBe(false)
  })

  // ── onContainerPointerDown [obligation] ─────────────────────────────────────

  test('pointerdown on the container (not editable) focuses the editor [obligation]', async () => {
    const wrapper = makeEditor()
    const container = getContainer(wrapper)
    const editorEl = getEditorEl(wrapper).element

    // Spy on focus
    let focused = false
    editorEl.focus = () => {
      focused = true
    }

    // Dispatch pointerdown whose target is the container (not the editable)
    const event = new PointerEvent('pointerdown', { bubbles: true, cancelable: true })
    Object.defineProperty(event, 'target', { value: container.element, configurable: true })
    container.element.dispatchEvent(event)

    expect(focused).toBe(true)
  })

  test('pointerdown on the container is a no-op when disabled [obligation]', async () => {
    const wrapper = makeEditor({ disabled: true })
    const container = getContainer(wrapper)

    // Disabled editor: no contenteditable element rendered, container pointerdown is a no-op
    let focused = false
    // The disabled div doesn't focus but we verify no error
    const event = new PointerEvent('pointerdown', { bubbles: true, cancelable: true })
    Object.defineProperty(event, 'target', { value: container.element, configurable: true })
    container.element.dispatchEvent(event)

    expect(focused).toBe(false)
  })

  test('pointerdown whose target IS the editable is a no-op (native caret placement) [obligation]', async () => {
    const wrapper = makeEditor()
    const editorEl = getEditorEl(wrapper).element

    let focused = false
    editorEl.focus = () => {
      focused = true
    }

    // Dispatch with target === editorEl — handler must bail
    const event = new PointerEvent('pointerdown', { bubbles: true, cancelable: true })
    Object.defineProperty(event, 'target', { value: editorEl, configurable: true })
    editorEl.dispatchEvent(event)

    expect(focused).toBe(false)
  })
})
