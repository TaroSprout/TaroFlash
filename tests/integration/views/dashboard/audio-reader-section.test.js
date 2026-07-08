import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const { collectionsDataRef, openCollectionMock, editModalOpenMock, createModalOpenMock } =
  vi.hoisted(() => ({
    collectionsDataRef: { value: [] },
    openCollectionMock: vi.fn(),
    editModalOpenMock: vi.fn(),
    createModalOpenMock: vi.fn().mockReturnValue({ response: Promise.resolve(undefined) })
  }))

vi.mock('@/api/lessons', () => ({
  useLessonCollectionsQuery: () => ({
    data: collectionsDataRef,
    error: { value: null }
  })
}))

vi.mock('@/composables/audio-reader/open-collection', () => ({
  useOpenCollection: () => ({ openCollection: openCollectionMock })
}))

vi.mock('@/composables/audio-reader/collection-edit-modal', () => ({
  useCollectionEditModal: () => ({ open: editModalOpenMock })
}))

vi.mock('@/composables/audio-reader/collection-create-modal', () => ({
  useCollectionCreateModal: () => ({ open: createModalOpenMock })
}))

vi.mock('@/stores/notice-store', () => ({
  useNoticeStore: () => ({ success: vi.fn(), error: vi.fn() })
}))

// ── Stubs ──────────────────────────────────────────────────────────────────────

const UiButtonStub = defineComponent({
  name: 'UiButton',
  inheritAttrs: false,
  props: ['iconLeft', 'size', 'sfx'],
  emits: ['press'],
  setup(_p, { slots, attrs, emit }) {
    return () =>
      h(
        'button',
        {
          'data-testid': attrs['data-testid'] ?? 'ui-button',
          onClick: (e) => {
            attrs.onClick?.(e)
            emit('press')
          }
        },
        [slots.default?.()]
      )
  }
})

const CollectionCardStub = defineComponent({
  name: 'CollectionCard',
  props: ['collection'],
  emits: ['open', 'edit'],
  setup(props, { emit }) {
    return () =>
      h('div', { 'data-testid': 'collection-card', 'data-collection-id': props.collection.id }, [
        h(
          'button',
          { 'data-testid': 'collection-card__open', onClick: () => emit('open') },
          'Open'
        ),
        h('button', { 'data-testid': 'collection-card__edit', onClick: () => emit('edit') }, 'Edit')
      ])
  }
})

// ── Component import (after mocks) ────────────────────────────────────────────

import AudioReaderSection from '@/views/dashboard/audio-reader-section.vue'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const COLLECTIONS = [
  { id: 1, title: 'JLPT N5', lesson_count: 3, created_at: '2026-06-01T00:00:00Z' },
  { id: 2, title: 'JLPT N4', lesson_count: 5, created_at: '2026-05-01T00:00:00Z' }
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function mountSection() {
  return shallowMount(AudioReaderSection, {
    global: {
      stubs: { CollectionCard: CollectionCardStub, UiButton: UiButtonStub }
    }
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  collectionsDataRef.value = []
  openCollectionMock.mockClear()
  editModalOpenMock.mockClear()
  createModalOpenMock.mockReturnValue({ response: Promise.resolve(undefined) })
})

describe('AudioReaderSection', () => {
  describe('empty state', () => {
    test('shows audio-reader-section__empty when there are no collections', () => {
      collectionsDataRef.value = []
      const wrapper = mountSection()
      expect(wrapper.find('[data-testid="audio-reader-section__empty"]').exists()).toBe(true)
    })

    test('does not render audio-reader-section__list when empty', () => {
      collectionsDataRef.value = []
      const wrapper = mountSection()
      expect(wrapper.find('[data-testid="audio-reader-section__list"]').exists()).toBe(false)
    })
  })

  describe('collection list', () => {
    test('renders audio-reader-section__list when collections are present', () => {
      collectionsDataRef.value = COLLECTIONS
      const wrapper = mountSection()
      expect(wrapper.find('[data-testid="audio-reader-section__list"]').exists()).toBe(true)
    })

    test('renders one collection-card per collection', () => {
      collectionsDataRef.value = COLLECTIONS
      const wrapper = mountSection()
      expect(wrapper.findAll('[data-testid="collection-card"]')).toHaveLength(2)
    })

    test('does not show audio-reader-section__empty when collections are present', () => {
      collectionsDataRef.value = COLLECTIONS
      const wrapper = mountSection()
      expect(wrapper.find('[data-testid="audio-reader-section__empty"]').exists()).toBe(false)
    })
  })

  describe('opening a collection', () => {
    test('clicking a collection card open calls openCollection with the collection', async () => {
      collectionsDataRef.value = COLLECTIONS
      const wrapper = mountSection()
      await wrapper.find('[data-testid="collection-card__open"]').trigger('click')
      expect(openCollectionMock).toHaveBeenCalledWith(COLLECTIONS[0])
    })
  })

  describe('editing a collection', () => {
    test('clicking a collection card edit calls editModal.open with the collection id', async () => {
      collectionsDataRef.value = COLLECTIONS
      const wrapper = mountSection()
      await wrapper.find('[data-testid="collection-card__edit"]').trigger('click')
      expect(editModalOpenMock).toHaveBeenCalledWith(COLLECTIONS[0].id)
    })
  })

  describe('creating a collection', () => {
    test('clicking audio-reader-section__new opens the create modal', async () => {
      const wrapper = mountSection()
      await wrapper.find('[data-testid="audio-reader-section__new"]').trigger('click')
      expect(createModalOpenMock).toHaveBeenCalled()
    })

    test('opens edit modal for the new collection when the create modal resolves with one', async () => {
      const newCollection = { id: 99, title: 'New', lesson_count: 0, created_at: '' }
      createModalOpenMock.mockReturnValue({ response: Promise.resolve(newCollection) })
      const wrapper = mountSection()
      await wrapper.find('[data-testid="audio-reader-section__new"]').trigger('click')
      await flushPromises()
      expect(editModalOpenMock).toHaveBeenCalledWith(newCollection.id)
    })

    test('does not open edit modal when the create modal is cancelled', async () => {
      createModalOpenMock.mockReturnValue({ response: Promise.resolve(undefined) })
      const wrapper = mountSection()
      await wrapper.find('[data-testid="audio-reader-section__new"]').trigger('click')
      await flushPromises()
      expect(editModalOpenMock).not.toHaveBeenCalled()
    })
  })
})
