import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount, flushPromises } from '@vue/test-utils'

import CardGridDeleteButton from '@/views/deck/card-grid/delete-button.vue'
import UiButton from '@/components/ui-kit/button.vue'
import { cardEditorKey } from '@/views/deck/composables'

function makeEditor({ onDeleteCardImmediate = vi.fn() } = {}) {
  return { actions: { onDeleteCardImmediate } }
}

function mountDeleteButton({ props = {}, editor } = {}) {
  const ed = editor ?? makeEditor()
  return {
    wrapper: mount(CardGridDeleteButton, {
      props: { card_id: 1, ...props },
      global: { provide: { [cardEditorKey]: ed } }
    }),
    editor: ed
  }
}

describe('card-grid/delete-button', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  test('renders the delete button', () => {
    const { wrapper } = mountDeleteButton()
    expect(wrapper.find('[data-testid="card-grid-item__delete-button"]').exists()).toBe(true)
  })

  test('the icon-only tooltip carries the reused item-options delete label', async () => {
    const { wrapper } = mountDeleteButton()
    const button = wrapper.find('[data-testid="card-grid-item__delete-button"]')

    await button.trigger('pointerenter', { pointerType: 'mouse' })
    await flushPromises()

    expect(document.querySelector('[data-testid="ui-tooltip"]')?.textContent).toBe('Delete')
  })

  test('clicking calls onDeleteCardImmediate with the card id and its positioned grid cell [obligation]', async () => {
    const editor = makeEditor()
    const grid_item_el = document.createElement('div')
    grid_item_el.setAttribute('data-testid', 'card-grid__item')
    document.body.appendChild(grid_item_el)

    const wrapper = mount(CardGridDeleteButton, {
      props: { card_id: 42 },
      attachTo: grid_item_el,
      global: { provide: { [cardEditorKey]: editor } }
    })

    await wrapper.find('[data-testid="card-grid-item__delete-button"]').trigger('click')
    await flushPromises()

    expect(editor.actions.onDeleteCardImmediate).toHaveBeenCalledWith(42, grid_item_el)

    wrapper.unmount()
    grid_item_el.remove()
  })

  test('sets its own loading state while the delete is in flight, and clears it after [obligation]', async () => {
    let resolveDelete
    const onDeleteCardImmediate = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveDelete = resolve
        })
    )
    const { wrapper } = mountDeleteButton({ editor: makeEditor({ onDeleteCardImmediate }) })
    const button = wrapper.find('[data-testid="card-grid-item__delete-button"]')

    button.trigger('click')
    await flushPromises()
    expect(wrapper.findComponent(UiButton).props('loading')).toBe(true)

    resolveDelete()
    await flushPromises()
    expect(wrapper.findComponent(UiButton).props('loading')).toBe(false)
  })
})
