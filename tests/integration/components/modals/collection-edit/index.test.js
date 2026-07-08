import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const {
  collectionDataRef,
  lessonsDataRef,
  refetchMock,
  deleteLessonMutateAsync,
  retryLessonMutateAsync,
  deleteCollectionMutateAsync,
  uploadModalOpenMock,
  alertWarnMock,
  routerPushMock,
  noticeErrorMock
} = vi.hoisted(() => ({
  collectionDataRef: { value: { id: 1, title: 'JLPT N5' } },
  lessonsDataRef: { value: [] },
  refetchMock: vi.fn(),
  deleteLessonMutateAsync: vi.fn().mockResolvedValue(undefined),
  retryLessonMutateAsync: vi.fn().mockResolvedValue(undefined),
  deleteCollectionMutateAsync: vi.fn().mockResolvedValue(undefined),
  uploadModalOpenMock: vi.fn(),
  alertWarnMock: vi.fn().mockReturnValue({ response: Promise.resolve(true) }),
  routerPushMock: vi.fn(),
  noticeErrorMock: vi.fn()
}))

// Must be a real Vue ref so the component's watch(lessons_error) is valid.
const lessonsErrorRef = ref(null)

vi.mock('@/api/lessons', () => ({
  useLessonCollectionQuery: () => ({
    data: collectionDataRef
  }),
  useLessonsByCollectionQuery: () => ({
    data: lessonsDataRef,
    error: lessonsErrorRef,
    refetch: refetchMock
  }),
  useDeleteLessonMutation: () => ({ mutateAsync: deleteLessonMutateAsync }),
  useRetryLessonMutation: () => ({ mutateAsync: retryLessonMutateAsync }),
  useDeleteLessonCollectionMutation: () => ({ mutateAsync: deleteCollectionMutateAsync })
}))

vi.mock('@/composables/audio-reader/upload-lesson-modal', () => ({
  useUploadLessonModal: () => ({ open: uploadModalOpenMock })
}))

vi.mock('@/stores/notice-store', () => ({
  useNoticeStore: () => ({ success: vi.fn(), error: noticeErrorMock })
}))

vi.mock('@/composables/alert', () => ({
  useAlert: () => ({ warn: alertWarnMock })
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: routerPushMock })
}))

// ── Stubs ──────────────────────────────────────────────────────────────────────

const UiButtonStub = defineComponent({
  name: 'UiButton',
  inheritAttrs: false,
  emits: ['press'],
  setup(_p, { slots, attrs, emit }) {
    return () => h('button', { ...attrs, onClick: () => emit('press') }, slots.default?.())
  }
})

const MobileSheetStub = defineComponent({
  name: 'MobileSheet',
  emits: ['close'],
  setup(_p, { slots, emit }) {
    return () =>
      h('div', { 'data-testid': 'mobile-sheet-stub' }, [
        h('button', { 'data-testid': 'mobile-sheet-stub__close', onClick: () => emit('close') }),
        slots.default?.()
      ])
  }
})

const LessonCardStub = defineComponent({
  name: 'LessonCard',
  props: ['lesson'],
  emits: ['open', 'retry', 'delete'],
  setup(props, { emit }) {
    return () =>
      h('div', { 'data-testid': 'lesson-card', 'data-lesson-id': props.lesson.id }, [
        h('button', { 'data-testid': 'lesson-card__open', onClick: () => emit('open') }, 'Open'),
        h('button', { 'data-testid': 'lesson-card__retry', onClick: () => emit('retry') }, 'Retry'),
        h(
          'button',
          { 'data-testid': 'lesson-card__delete', onClick: () => emit('delete') },
          'Delete'
        )
      ])
  }
})

// ── Component import (after mocks) ────────────────────────────────────────────

import CollectionEditModal from '@/components/modals/collection-edit/index.vue'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const LESSONS = [
  { id: 10, title: 'Lesson One', status: 'ready', created_at: '2026-06-01T00:00:00Z' },
  { id: 11, title: 'Lesson Two', status: 'ready', created_at: '2026-06-02T00:00:00Z' }
]

function mountModal(props = {}) {
  const closeMock = vi.fn()
  const wrapper = shallowMount(CollectionEditModal, {
    props: { collection_id: 1, close: closeMock, ...props },
    global: {
      stubs: { UiButton: UiButtonStub, MobileSheet: MobileSheetStub, LessonCard: LessonCardStub }
    }
  })
  return { wrapper, closeMock }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  collectionDataRef.value = { id: 1, title: 'JLPT N5' }
  lessonsDataRef.value = []
  lessonsErrorRef.value = null
  deleteLessonMutateAsync.mockClear()
  deleteLessonMutateAsync.mockResolvedValue(undefined)
  retryLessonMutateAsync.mockClear()
  retryLessonMutateAsync.mockResolvedValue(undefined)
  deleteCollectionMutateAsync.mockClear()
  deleteCollectionMutateAsync.mockResolvedValue(undefined)
  uploadModalOpenMock.mockClear()
  alertWarnMock.mockReturnValue({ response: Promise.resolve(true) })
  routerPushMock.mockClear()
  refetchMock.mockClear()
  noticeErrorMock.mockClear()
})

describe('CollectionEditModal', () => {
  describe('empty state', () => {
    test('shows collection-edit__empty when there are no lessons', () => {
      lessonsDataRef.value = []
      const { wrapper } = mountModal()
      expect(wrapper.find('[data-testid="collection-edit__empty"]').exists()).toBe(true)
    })

    test('does not render collection-edit__list when empty', () => {
      lessonsDataRef.value = []
      const { wrapper } = mountModal()
      expect(wrapper.find('[data-testid="collection-edit__list"]').exists()).toBe(false)
    })
  })

  describe('lesson list', () => {
    test('renders one lesson-card per lesson', () => {
      lessonsDataRef.value = LESSONS
      const { wrapper } = mountModal()
      expect(wrapper.findAll('[data-testid="lesson-card"]')).toHaveLength(2)
    })

    test('does not show collection-edit__empty when lessons are present', () => {
      lessonsDataRef.value = LESSONS
      const { wrapper } = mountModal()
      expect(wrapper.find('[data-testid="collection-edit__empty"]').exists()).toBe(false)
    })
  })

  describe('upload button', () => {
    test('collection-edit__upload opens the upload modal with the collection id', async () => {
      const { wrapper } = mountModal({ collection_id: 3 })
      await wrapper.find('[data-testid="collection-edit__upload"]').trigger('click')
      expect(uploadModalOpenMock).toHaveBeenCalledWith(3)
    })
  })

  describe('opening a lesson', () => {
    test('opening a ready lesson navigates to lesson route and calls close', async () => {
      lessonsDataRef.value = LESSONS
      const { wrapper, closeMock } = mountModal({ collection_id: 1 })

      await wrapper.find('[data-testid="lesson-card__open"]').trigger('click')

      expect(routerPushMock).toHaveBeenCalledWith({
        name: 'lesson',
        params: { collectionId: 1, lessonId: LESSONS[0].id }
      })
      expect(closeMock).toHaveBeenCalledOnce()
    })

    test('does not navigate for a lesson that is not ready', async () => {
      lessonsDataRef.value = [{ id: 12, title: 'Processing', status: 'processing' }]
      const { wrapper, closeMock } = mountModal()

      await wrapper.find('[data-testid="lesson-card__open"]').trigger('click')

      expect(routerPushMock).not.toHaveBeenCalled()
      expect(closeMock).not.toHaveBeenCalled()
    })
  })

  describe('deleting a lesson', () => {
    test('confirming delete calls mutateAsync with { id, collection_id }', async () => {
      lessonsDataRef.value = LESSONS
      alertWarnMock.mockReturnValue({ response: Promise.resolve(true) })
      const { wrapper } = mountModal({ collection_id: 1 })

      await wrapper.find('[data-testid="lesson-card__delete"]').trigger('click')
      await flushPromises()

      expect(deleteLessonMutateAsync).toHaveBeenCalledWith({
        id: LESSONS[0].id,
        collection_id: 1
      })
    })

    test('cancelling delete does not call mutateAsync', async () => {
      lessonsDataRef.value = LESSONS
      alertWarnMock.mockReturnValue({ response: Promise.resolve(false) })
      const { wrapper } = mountModal({ collection_id: 1 })

      await wrapper.find('[data-testid="lesson-card__delete"]').trigger('click')
      await flushPromises()

      expect(deleteLessonMutateAsync).not.toHaveBeenCalled()
    })

    test('shows a panel notice when the delete mutation rejects', async () => {
      lessonsDataRef.value = LESSONS
      deleteLessonMutateAsync.mockRejectedValueOnce(new Error('boom'))
      const { wrapper } = mountModal({ collection_id: 1 })

      await wrapper.find('[data-testid="lesson-card__delete"]').trigger('click')
      await flushPromises()

      expect(noticeErrorMock).toHaveBeenCalledWith(
        "Couldn't delete that lesson. Try again.",
        expect.objectContaining({ variant: 'panel' })
      )
    })
  })

  describe('retrying a lesson', () => {
    test('retry calls mutateAsync with { id, collection_id }', async () => {
      lessonsDataRef.value = LESSONS
      const { wrapper } = mountModal({ collection_id: 1 })

      await wrapper.find('[data-testid="lesson-card__retry"]').trigger('click')
      await flushPromises()

      expect(retryLessonMutateAsync).toHaveBeenCalledWith({
        id: LESSONS[0].id,
        collection_id: 1
      })
    })

    test('shows a panel notice when the retry mutation rejects', async () => {
      lessonsDataRef.value = LESSONS
      retryLessonMutateAsync.mockRejectedValueOnce(new Error('boom'))
      const { wrapper } = mountModal({ collection_id: 1 })

      await wrapper.find('[data-testid="lesson-card__retry"]').trigger('click')
      await flushPromises()

      expect(noticeErrorMock).toHaveBeenCalledWith(
        "Couldn't restart that lesson. Try again.",
        expect.objectContaining({ variant: 'panel' })
      )
    })
  })

  describe('deleting the collection', () => {
    test('confirming delete calls mutateAsync with collection_id, then close and navigate to dashboard', async () => {
      alertWarnMock.mockReturnValue({ response: Promise.resolve(true) })
      const { wrapper, closeMock } = mountModal({ collection_id: 1 })

      await wrapper.find('[data-testid="collection-edit__delete"]').trigger('click')
      await flushPromises()

      expect(deleteCollectionMutateAsync).toHaveBeenCalledWith(1)
      expect(closeMock).toHaveBeenCalledOnce()
      expect(routerPushMock).toHaveBeenCalledWith({ name: 'dashboard' })
    })

    test('cancelling collection delete does not call mutateAsync or close', async () => {
      alertWarnMock.mockReturnValue({ response: Promise.resolve(false) })
      const { wrapper, closeMock } = mountModal({ collection_id: 1 })

      await wrapper.find('[data-testid="collection-edit__delete"]').trigger('click')
      await flushPromises()

      expect(deleteCollectionMutateAsync).not.toHaveBeenCalled()
      expect(closeMock).not.toHaveBeenCalled()
    })

    test('shows a panel notice and does not close when the collection delete mutation rejects', async () => {
      deleteCollectionMutateAsync.mockRejectedValueOnce(new Error('boom'))
      const { wrapper, closeMock } = mountModal({ collection_id: 1 })

      await wrapper.find('[data-testid="collection-edit__delete"]').trigger('click')
      await flushPromises()

      expect(noticeErrorMock).toHaveBeenCalledWith(
        "Couldn't delete that collection. Try again.",
        expect.objectContaining({ variant: 'panel' })
      )
      expect(closeMock).not.toHaveBeenCalled()
      expect(routerPushMock).not.toHaveBeenCalledWith({ name: 'dashboard' })
    })
  })

  describe('lessons_error watch', () => {
    test('shows a notice with the error message when lessons_error becomes truthy', async () => {
      const { wrapper } = mountModal({ collection_id: 1 })
      lessonsErrorRef.value = new Error('network down')
      await flushPromises()

      expect(noticeErrorMock).toHaveBeenCalledWith('network down')
      wrapper.unmount()
    })
  })
})
