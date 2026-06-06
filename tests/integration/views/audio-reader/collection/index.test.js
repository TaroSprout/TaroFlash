import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount, flushPromises } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const {
  collectionDataRef,
  lessonsDataRef,
  mutateAsyncMock,
  uploadModalOpenMock,
  readerModalOpenMock,
  alertWarnMock,
  routerPushMock
} = vi.hoisted(() => ({
  collectionDataRef: { value: { id: 1, title: 'JLPT N5' } },
  lessonsDataRef: { value: [] },
  mutateAsyncMock: vi.fn().mockResolvedValue(undefined),
  uploadModalOpenMock: vi.fn(),
  readerModalOpenMock: vi.fn(),
  alertWarnMock: vi.fn().mockReturnValue({ response: Promise.resolve(true) }),
  routerPushMock: vi.fn()
}))

vi.mock('@/api/lessons', () => ({
  useLessonCollectionQuery: () => ({
    data: collectionDataRef,
    error: { value: null }
  }),
  useLessonsByCollectionQuery: () => ({
    data: lessonsDataRef,
    error: { value: null }
  }),
  useDeleteLessonMutation: () => ({ mutateAsync: mutateAsyncMock })
}))

vi.mock('@/composables/modals/use-upload-lesson-modal', () => ({
  useUploadLessonModal: () => ({ open: uploadModalOpenMock })
}))

vi.mock('@/composables/modals/use-lesson-reader-modal', () => ({
  useLessonReaderModal: () => ({ open: readerModalOpenMock })
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

const LessonCardStub = defineComponent({
  name: 'LessonCard',
  props: ['lesson'],
  emits: ['open', 'delete'],
  setup(props, { emit }) {
    return () =>
      h('div', { 'data-testid': 'lesson-card', 'data-lesson-id': props.lesson.id }, [
        h('button', { 'data-testid': 'lesson-card__open', onClick: () => emit('open') }, 'Open'),
        h(
          'button',
          { 'data-testid': 'lesson-card__delete', onClick: () => emit('delete') },
          'Delete'
        )
      ])
  }
})

const CollectionHeroStub = defineComponent({
  name: 'CollectionHero',
  props: ['collection', 'lessonCount'],
  emits: ['upload'],
  setup(props, { emit }) {
    return () =>
      h('div', { 'data-testid': 'collection-hero', 'data-lesson-count': props.lessonCount }, [
        h('button', { 'data-testid': 'collection-view__new', onClick: () => emit('upload') }, 'New')
      ])
  }
})

// ── Component import (after mocks) ────────────────────────────────────────────

import CollectionView from '@/views/audio-reader/collection/index.vue'

// ── Helpers ───────────────────────────────────────────────────────────────────

const LESSONS = [
  { id: 10, title: 'Lesson One', created_at: '2026-06-01T00:00:00Z' },
  { id: 11, title: 'Lesson Two', created_at: '2026-06-02T00:00:00Z' }
]

function mountView(props = {}) {
  return shallowMount(CollectionView, {
    props: { id: '1', ...props },
    global: {
      stubs: { LessonCard: LessonCardStub, CollectionHero: CollectionHeroStub }
    }
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  lessonsDataRef.value = []
  mutateAsyncMock.mockClear()
  uploadModalOpenMock.mockClear()
  readerModalOpenMock.mockClear()
  alertWarnMock.mockReturnValue({ response: Promise.resolve(true) })
  routerPushMock.mockClear()
})

describe('CollectionView', () => {
  describe('empty state', () => {
    test('shows collection-view__empty when there are no lessons', () => {
      lessonsDataRef.value = []
      const wrapper = mountView()
      expect(wrapper.find('[data-testid="collection-view__empty"]').exists()).toBe(true)
    })

    test('does not render collection-view__list when empty', () => {
      lessonsDataRef.value = []
      const wrapper = mountView()
      expect(wrapper.find('[data-testid="collection-view__list"]').exists()).toBe(false)
    })
  })

  describe('lesson list', () => {
    test('renders collection-view__list when lessons are present', () => {
      lessonsDataRef.value = LESSONS
      const wrapper = mountView()
      expect(wrapper.find('[data-testid="collection-view__list"]').exists()).toBe(true)
    })

    test('renders one lesson-card per lesson', () => {
      lessonsDataRef.value = LESSONS
      const wrapper = mountView()
      expect(wrapper.findAll('[data-testid="lesson-card"]')).toHaveLength(2)
    })

    test('does not show collection-view__empty when lessons are present', () => {
      lessonsDataRef.value = LESSONS
      const wrapper = mountView()
      expect(wrapper.find('[data-testid="collection-view__empty"]').exists()).toBe(false)
    })
  })

  describe('hero sidebar', () => {
    test('renders collection-hero when the collection is loaded', () => {
      const wrapper = mountView()
      expect(wrapper.find('[data-testid="collection-hero"]').exists()).toBe(true)
    })

    test('passes the lesson count to collection-hero', () => {
      lessonsDataRef.value = LESSONS
      const wrapper = mountView()
      expect(wrapper.find('[data-testid="collection-hero"]').attributes('data-lesson-count')).toBe(
        '2'
      )
    })
  })

  describe('opening a lesson', () => {
    test('clicking a lesson card open calls useLessonReaderModal().open with the lesson id', async () => {
      lessonsDataRef.value = LESSONS
      const wrapper = mountView()
      await wrapper.find('[data-testid="lesson-card__open"]').trigger('click')
      expect(readerModalOpenMock).toHaveBeenCalledWith(LESSONS[0].id)
    })
  })

  describe('uploading a new lesson', () => {
    test('collection-hero upload event calls useUploadLessonModal().open with the numeric id', async () => {
      const wrapper = mountView({ id: '5' })
      await wrapper.find('[data-testid="collection-view__new"]').trigger('click')
      expect(uploadModalOpenMock).toHaveBeenCalledWith(5)
    })
  })

  describe('deleting a lesson', () => {
    test('confirming delete calls mutateAsync with { id, collection_id }', async () => {
      lessonsDataRef.value = LESSONS
      alertWarnMock.mockReturnValue({ response: Promise.resolve(true) })
      const wrapper = mountView({ id: '1' })

      await wrapper.find('[data-testid="lesson-card__delete"]').trigger('click')
      await flushPromises()

      expect(mutateAsyncMock).toHaveBeenCalledWith({ id: LESSONS[0].id, collection_id: 1 })
    })

    test('cancelling delete does not call mutateAsync', async () => {
      lessonsDataRef.value = LESSONS
      alertWarnMock.mockReturnValue({ response: Promise.resolve(false) })
      const wrapper = mountView({ id: '1' })

      await wrapper.find('[data-testid="lesson-card__delete"]').trigger('click')
      await flushPromises()

      expect(mutateAsyncMock).not.toHaveBeenCalled()
    })
  })
})
