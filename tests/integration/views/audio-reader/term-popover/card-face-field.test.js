import { describe, test, expect } from 'vite-plus/test'
import { mount } from '@vue/test-utils'

import CardFaceField from '@/views/audio-reader/term-popover/card-face-field.vue'

// The real <Card> registers the global v-sfx directive; stub it so a bare mount
// doesn't warn on an unresolved directive.
function mountField(props = {}) {
  return mount(CardFaceField, {
    props: { side: 'front', text: 'Dog', placeholder: 'Front of the card', ...props },
    global: { directives: { sfx: {} } }
  })
}

describe('CardFaceField', () => {
  test('renders a real card face in edit mode for the given side', () => {
    const wrapper = mountField({ side: 'front' })
    expect(wrapper.find('[data-testid="card-face-field"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="card-face__front"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="card-face__back"]').exists()).toBe(false)
  })

  test('renders the back face when side is back', () => {
    const wrapper = mountField({ side: 'back', text: '犬' })
    expect(wrapper.find('[data-testid="card-face__back"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="card-face__front"]').exists()).toBe(false)
  })

  test('renders an editable text editor seeded with the text', () => {
    const wrapper = mountField({ text: 'Dog' })
    const editor = wrapper.find('[data-testid="card-face__front"] [data-testid="text-editor"]')
    expect(editor.exists()).toBe(true)
    expect(editor.attributes('contenteditable')).toBe('plaintext-only')
  })

  test('forwards editor input as an update:text event', async () => {
    const wrapper = mountField()
    await wrapper.find('[data-testid="text-editor"]').trigger('input')

    expect(wrapper.emitted('update:text')).toBeTruthy()
  })
})
