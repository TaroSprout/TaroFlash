import { describe, test, expect } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import TextEditor from '@/components/text-editor/text-editor.vue'

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeEditor(props = {}) {
  return shallowMount(TextEditor, { props })
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
    expect(wrapper.find('[data-testid="text-editor-container"]').exists()).toBe(true)
  })

  test('renders the editor element', () => {
    const wrapper = makeEditor()
    expect(getEditorEl(wrapper).exists()).toBe(true)
  })

  // ── Default classes ────────────────────────────────────────────────────────

  test('applies default font-size of 30px (level 4) when no attributes provided', () => {
    const wrapper = makeEditor()
    expect(getEditorEl(wrapper).attributes('style')).toContain('font-size: 30px')
  })

  test('applies default horizontal alignment class when no attributes provided', () => {
    const wrapper = makeEditor()
    expect(getEditorEl(wrapper).classes()).toContain('text-editor--h-center')
  })

  test('applies default vertical alignment class when no attributes provided', () => {
    const wrapper = makeEditor()
    expect(getEditorEl(wrapper).classes()).toContain('text-editor--v-center')
  })

  // ── Font size by level ─────────────────────────────────────────────────────

  test('level 1 maps to 16px', () => {
    const wrapper = makeEditor({ attributes: { text_size: 1 } })
    expect(getEditorEl(wrapper).attributes('style')).toContain('font-size: 16px')
  })

  test('level 2 maps to 20px', () => {
    const wrapper = makeEditor({ attributes: { text_size: 2 } })
    expect(getEditorEl(wrapper).attributes('style')).toContain('font-size: 20px')
  })

  test('level 4 maps to 30px (default level)', () => {
    const wrapper = makeEditor({ attributes: { text_size: 4 } })
    expect(getEditorEl(wrapper).attributes('style')).toContain('font-size: 30px')
  })

  test('level 10 maps to 84px (max)', () => {
    const wrapper = makeEditor({ attributes: { text_size: 10 } })
    expect(getEditorEl(wrapper).attributes('style')).toContain('font-size: 84px')
  })

  test('level above 10 clamps to 84px', () => {
    const wrapper = makeEditor({ attributes: { text_size: 99 } })
    expect(getEditorEl(wrapper).attributes('style')).toContain('font-size: 84px')
  })

  test('level below 1 clamps to 16px', () => {
    const wrapper = makeEditor({ attributes: { text_size: 0 } })
    expect(getEditorEl(wrapper).attributes('style')).toContain('font-size: 16px')
  })

  test('non-integer level rounds to nearest level', () => {
    const wrapper = makeEditor({ attributes: { text_size: 3.7 } })
    expect(getEditorEl(wrapper).attributes('style')).toContain('font-size: 30px')
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

  test('applies text-editor--v-top for top vertical alignment', () => {
    const wrapper = makeEditor({ attributes: { vertical_alignment: 'top' } })
    expect(getEditorEl(wrapper).classes()).toContain('text-editor--v-top')
  })

  test('applies text-editor--v-bottom for bottom vertical alignment', () => {
    const wrapper = makeEditor({ attributes: { vertical_alignment: 'bottom' } })
    expect(getEditorEl(wrapper).classes()).toContain('text-editor--v-bottom')
  })

  // ── Combined attributes ────────────────────────────────────────────────────

  test('applies all three attribute renderings together', () => {
    const wrapper = makeEditor({
      attributes: {
        text_size: 6,
        horizontal_alignment: 'right',
        vertical_alignment: 'bottom'
      }
    })
    const el = getEditorEl(wrapper)
    expect(el.attributes('style')).toContain('font-size: 44px')
    expect(el.classes()).toContain('text-editor--h-right')
    expect(el.classes()).toContain('text-editor--v-bottom')
  })

  // ── Partial attributes ─────────────────────────────────────────────────────

  test('falls back to defaults for missing attribute fields', () => {
    const wrapper = makeEditor({ attributes: { text_size: 2 } })
    const el = getEditorEl(wrapper)
    expect(el.attributes('style')).toContain('font-size: 20px')
    expect(el.classes()).toContain('text-editor--h-center')
    expect(el.classes()).toContain('text-editor--v-center')
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
})
