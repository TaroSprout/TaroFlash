import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount, flushPromises } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const { collectionsDataRef, mutateAsyncMock, createModalOpenMock, alertWarnMock, routerPushMock } =
  vi.hoisted(() => ({
    collectionsDataRef: { value: [] },
    mutateAsyncMock: vi.fn().mockResolvedValue(undefined),
    createModalOpenMock: vi.fn().mockReturnValue({ response: Promise.resolve(undefined) }),
    alertWarnMock: vi.fn().mockReturnValue({ response: Promise.resolve(true) }),
    routerPushMock: vi.fn()
  }))

vi.mock('@/api/lessons', () => ({
  useLessonCollectionsQuery: () => ({
    data: collectionsDataRef,
    error: { value: null }
  }),
  useDeleteLessonCollectionMutation: () => ({ mutateAsync: mutateAsyncMock })
}))

vi.mock('@/composables/modals/use-collection-create-modal', () => ({
  useCollectionCreateModal: () => ({ open: createModalOpenMock })
}))

vi.mock('@/composables/toast', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() })
}))

vi.mock('@/composables/alert', () => ({
  useAlert: () => ({ warn: alertWarnMock })
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: routerPushMock })
}))

// ── Stubs ──────────────────────────────────────────────────────────────────────

const CollectionCardStub = defineComponent({
  name: 'CollectionCard',
  props: ['collection'],
  emits: ['open', 'delete'],
  setup(props, { emit }) {
    return () =>
      h('div', { 'data-testid': 'collection-card', 'data-collection-id': props.collection.id }, [
        h(
          'button',
          { 'data-testid': 'collection-card__open', onClick: () => emit('open') },
          'Open'
        ),
        h(
          'button',
          { 'data-testid': 'collection-card__delete', onClick: () => emit('delete') },
          'Delete'
        )
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
      stubs: { CollectionCard: CollectionCardStub }
    }
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  collectionsDataRef.value = []
  mutateAsyncMock.mockClear()
  createModalOpenMock.mockReturnValue({ response: Promise.resolve(undefined) })
  alertWarnMock.mockReturnValue({ response: Promise.resolve(true) })
  routerPushMock.mockClear()
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
    test('clicking a collection card open pushes to lesson-collection route', async () => {
      collectionsDataRef.value = COLLECTIONS
      const wrapper = mountSection()
      await wrapper.find('[data-testid="collection-card__open"]').trigger('click')
      expect(routerPushMock).toHaveBeenCalledWith({
        name: 'lesson-collection',
        params: { id: COLLECTIONS[0].id }
      })
    })
  })

  describe('creating a collection', () => {
    test('clicking audio-reader-section__new opens the create modal', async () => {
      const wrapper = mountSection()
      await wrapper.find('[data-testid="audio-reader-section__new"]').trigger('click')
      expect(createModalOpenMock).toHaveBeenCalled()
    })

    test('navigates to the new collection when the modal resolves with one', async () => {
      const newCollection = { id: 99, title: 'New', lesson_count: 0, created_at: '' }
      createModalOpenMock.mockReturnValue({ response: Promise.resolve(newCollection) })
      const wrapper = mountSection()
      await wrapper.find('[data-testid="audio-reader-section__new"]').trigger('click')
      await flushPromises()
      expect(routerPushMock).toHaveBeenCalledWith({
        name: 'lesson-collection',
        params: { id: newCollection.id }
      })
    })

    test('does not navigate when the modal is cancelled', async () => {
      createModalOpenMock.mockReturnValue({ response: Promise.resolve(undefined) })
      const wrapper = mountSection()
      await wrapper.find('[data-testid="audio-reader-section__new"]').trigger('click')
      await flushPromises()
      expect(routerPushMock).not.toHaveBeenCalled()
    })
  })

  describe('deleting a collection', () => {
    test('confirming delete calls mutateAsync with the collection id', async () => {
      collectionsDataRef.value = COLLECTIONS
      alertWarnMock.mockReturnValue({ response: Promise.resolve(true) })
      const wrapper = mountSection()

      await wrapper.find('[data-testid="collection-card__delete"]').trigger('click')
      await flushPromises()

      expect(mutateAsyncMock).toHaveBeenCalledWith(COLLECTIONS[0].id)
    })

    test('cancelling delete does not call mutateAsync', async () => {
      collectionsDataRef.value = COLLECTIONS
      alertWarnMock.mockReturnValue({ response: Promise.resolve(false) })
      const wrapper = mountSection()

      await wrapper.find('[data-testid="collection-card__delete"]').trigger('click')
      await flushPromises()

      expect(mutateAsyncMock).not.toHaveBeenCalled()
    })
  })
})
