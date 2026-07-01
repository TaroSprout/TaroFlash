import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { shallowMount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, ref, nextTick } from 'vue'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────
// Plain-object refs suffice for state the script reads via .value (watch, onMounted).
// For values that Vue's template auto-unwraps (selection, popover_open)
// we need real Vue refs — created at module level after imports so the template
// reactive system sees them as refs and auto-unwraps them correctly.

const {
  lessonRef,
  paragraphsRef,
  audioUrlRef,
  activeWordRef,
  targetLang,
  openTermMock,
  closeTermMock,
  playFromHereMock,
  playClipMock,
  playerRef,
  chaptersRef,
  progressMutate,
  useReaderProgressMock,
  editModalOpenMock,
  routerPushMock,
  emitSfxMock
} = vi.hoisted(() => ({
  lessonRef: { value: { id: 2, title: 'Hiragana Basics' } },
  paragraphsRef: { value: [] },
  audioUrlRef: { value: null },
  activeWordRef: { value: null },
  targetLang: 'English',
  openTermMock: vi.fn(),
  closeTermMock: vi.fn(),
  playFromHereMock: vi.fn(),
  playClipMock: vi.fn(),
  playerRef: { is_playing: { value: false } },
  chaptersRef: { value: [] },
  progressMutate: vi.fn(),
  useReaderProgressMock: vi.fn(() => ({ restored: { value: true } })),
  editModalOpenMock: vi.fn(),
  routerPushMock: vi.fn(),
  emitSfxMock: vi.fn()
}))

// Real Vue refs for template-reactive state. Created here (after imports) so
// `ref()` is available. The vi.mock factories below close over these variables.
const selectionRef = ref(null)
const popoverOpenRef = ref(false)
// Drives `useMatchMedia('w>=xl')` — false = mobile (term in dock), true = desktop
// (term in sidebar). Defaults mobile; desktop tests flip it.
const isDesktopRef = ref(false)

vi.mock('@/composables/audio-reader/lesson-reader', () => ({
  useLessonReader: () => ({
    lesson: lessonRef,
    paragraphs: paragraphsRef,
    audio_url: audioUrlRef,
    active_word: activeWordRef,
    selection: selectionRef,
    popover_open: popoverOpenRef,
    target_lang: targetLang,
    openTerm: openTermMock,
    closeTerm: closeTermMock,
    playFromHere: playFromHereMock,
    playClip: playClipMock,
    player: playerRef
  })
}))

vi.mock('@/composables/audio-reader/reader-progress', () => ({
  useReaderProgress: useReaderProgressMock
}))

vi.mock('@/composables/ui/animated-height', () => ({
  useAnimatedHeight: vi.fn()
}))

vi.mock('@/composables/ui/media-query', () => ({
  useMatchMedia: () => isDesktopRef
}))

vi.mock('@/utils/animations/transcript-scroll', () => ({
  cancelScroll: vi.fn(),
  scrollClearOf: vi.fn(),
  scrollLineIntoView: vi.fn(),
  scrollWordIntoDeadzone: vi.fn()
}))

vi.mock('@/api/lessons', () => ({
  useLessonsByCollectionQuery: () => ({ data: chaptersRef }),
  useSetCollectionProgressMutation: () => ({ mutate: progressMutate }),
  useLessonCollectionsQuery: () => ({ data: { value: [] } }),
  useLessonCollectionQuery: () => ({ data: { value: null } }),
  useLessonQuery: () => ({ data: { value: null }, error: { value: null } }),
  useLessonAudioUrlQuery: () => ({ data: { value: null } }),
  useStartLessonMutation: () => ({ mutateAsync: vi.fn() }),
  useDeleteLessonMutation: () => ({ mutateAsync: vi.fn() }),
  useRetryLessonMutation: () => ({ mutateAsync: vi.fn() }),
  useCreateLessonCollectionMutation: () => ({ mutateAsync: vi.fn() }),
  useDeleteLessonCollectionMutation: () => ({ mutateAsync: vi.fn() }),
  useTranslateTermMutation: () => ({ mutateAsync: vi.fn() }),
  resolveCollectionEntryLesson: vi.fn(),
  EdgeFunctionError: class EdgeFunctionError extends Error {}
}))

vi.mock('@/composables/audio-reader/collection-edit-modal', () => ({
  useCollectionEditModal: () => ({ open: editModalOpenMock })
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: routerPushMock })
}))

vi.mock('@/sfx/bus', () => ({
  emitSfx: emitSfxMock,
  emitHoverSfx: vi.fn()
}))

// ── Stubs ──────────────────────────────────────────────────────────────────────

// ── Stubs ──────────────────────────────────────────────────────────────────────

const UiButtonStub = defineComponent({
  name: 'UiButton',
  inheritAttrs: false,
  props: ['iconLeft', 'iconOnly', 'size', 'sfx'],
  emits: ['press'],
  setup(_p, { slots, attrs, emit }) {
    return () =>
      h(
        'button',
        {
          ...attrs,
          onClick: (e) => {
            attrs.onClick?.(e)
            emit('press')
          }
        },
        [slots.default?.()]
      )
  }
})

// Controllable follow state so tests can simulate the transcript exposing
// following/follow_direction/resumeFollow (the lesson view reads these via ref="transcript").
const transcriptFollowing = ref(true)
const transcriptFollowDirection = ref('down')
const transcriptResumeMock = vi.fn()

const TranscriptViewStub = defineComponent({
  name: 'TranscriptView',
  props: ['paragraphs', 'active_word', 'popover_open'],
  emits: ['select', 'dismiss'],
  setup(_props, { emit, expose }) {
    expose({
      following: transcriptFollowing,
      follow_direction: transcriptFollowDirection,
      resumeFollow: transcriptResumeMock
    })
    return () =>
      h('div', { 'data-testid': 'transcript-view-stub' }, [
        h('button', {
          'data-testid': 'transcript-stub__dismiss',
          onClick: () => emit('dismiss')
        })
      ])
  }
})

const TermCardStub = defineComponent({
  name: 'TermCard',
  props: ['term', 'sentence', 'target_lang', 'show_back'],
  emits: ['back', 'close', 'play-from-here', 'play-word'],
  setup(_props, { emit }) {
    return () =>
      h('div', { 'data-testid': 'term-card-stub' }, [
        h('button', { 'data-testid': 'term-card-stub__back', onClick: () => emit('back') }),
        h('button', { 'data-testid': 'term-card-stub__close', onClick: () => emit('close') }),
        h('button', {
          'data-testid': 'term-card-stub__play-from-here',
          onClick: () => emit('play-from-here')
        }),
        h('button', {
          'data-testid': 'term-card-stub__play-word',
          onClick: () => emit('play-word')
        })
      ])
  }
})

// Renders the dock's content inline so its panes are assertable — the real
// component teleports into the host, which isn't mounted in this view test.
// Also render the `above` slot inline so the resume-follow button is assertable.
const MobileDockStub = defineComponent({
  name: 'MobileDock',
  setup(_props, { slots }) {
    return () =>
      h('div', { 'data-testid': 'mobile-dock-stub' }, [slots.above?.(), slots.default?.()])
  }
})

// Passthrough — render the active pane directly (no crossfade transition) so the
// dock-placement assertions see exactly one pane at a time.
const CrossfadeResizeStub = defineComponent({
  name: 'CrossfadeResize',
  setup(_props, { slots }) {
    return () => h('div', { 'data-testid': 'crossfade-resize-stub' }, slots.default?.())
  }
})

// ── Component import (after mocks) ────────────────────────────────────────────

import LessonView from '@/views/audio-reader/lesson/index.vue'
import AudioToolbar from '@/views/audio-reader/lesson/audio-toolbar.vue'
import { useAnimatedHeight } from '@/composables/ui/animated-height'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const CHAPTERS = [
  { id: 1, title: 'Chapter One' },
  { id: 2, title: 'Chapter Two' },
  { id: 3, title: 'Chapter Three' }
]

const COLLECTION_ID = '5'
const LESSON_ID = '2'

function mountView(props = {}) {
  return shallowMount(LessonView, {
    props: { collectionId: COLLECTION_ID, lessonId: LESSON_ID, ...props },
    global: {
      stubs: {
        Teleport: true,
        TranscriptView: TranscriptViewStub,
        TermCard: TermCardStub,
        MobileDock: MobileDockStub,
        CrossfadeResize: CrossfadeResizeStub,
        UiButton: UiButtonStub
      }
    }
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  lessonRef.value = { id: 2, title: 'Hiragana Basics' }
  chaptersRef.value = []
  selectionRef.value = null
  popoverOpenRef.value = false
  isDesktopRef.value = false
  progressMutate.mockClear()
  editModalOpenMock.mockClear()
  routerPushMock.mockClear()
  useReaderProgressMock.mockClear()
  openTermMock.mockClear()
  closeTermMock.mockClear()
  playFromHereMock.mockClear()
  playClipMock.mockClear()
  emitSfxMock.mockClear()
  transcriptFollowing.value = true
  transcriptFollowDirection.value = 'down'
  transcriptResumeMock.mockClear()
  // Fire rAF callbacks synchronously so show_term_in_dock_deferred flips
  // in the same tick as nextTick() — avoids the one-frame lag in tests.
  vi.stubGlobal('requestAnimationFrame', (cb) => cb())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('LessonView', () => {
  describe('progress tracking', () => {
    test('hands the collection id, lesson id, and player to useReaderProgress', async () => {
      mountView()
      await flushPromises()

      expect(useReaderProgressMock).toHaveBeenCalledOnce()
      const [collectionArg, lessonArg, playerArg] = useReaderProgressMock.mock.calls[0]
      expect(collectionArg.value).toBe(5)
      expect(lessonArg.value).toBe(2)
      expect(playerArg).toBe(playerRef)
    })
  })

  describe('chapter navigation via toolbar', () => {
    test('the audio toolbar select-chapter event navigates to that chapter', async () => {
      chaptersRef.value = CHAPTERS
      const wrapper = mountView({ lessonId: '2' })

      wrapper.findComponent(AudioToolbar).vm.$emit('select-chapter', 1)
      await flushPromises()

      expect(routerPushMock).toHaveBeenCalledWith({
        name: 'lesson',
        params: { collectionId: 5, lessonId: 1 }
      })
    })
  })

  describe('chapter list', () => {
    test('current chapter button has data-active="true"', () => {
      chaptersRef.value = CHAPTERS
      const wrapper = mountView({ lessonId: '2' })

      const buttons = wrapper.findAll('[data-testid="lesson-view__chapter"]')
      const active = buttons.filter((b) => b.attributes('data-active') === 'true')

      expect(active).toHaveLength(1)
      // chapter id 2 is at index 1
      expect(buttons[1].attributes('data-active')).toBe('true')
    })

    test('clicking a chapter button calls push with lesson name and params', async () => {
      chaptersRef.value = CHAPTERS
      const wrapper = mountView({ lessonId: '2' })

      const buttons = wrapper.findAll('[data-testid="lesson-view__chapter"]')
      await buttons[0].trigger('click')

      expect(routerPushMock).toHaveBeenCalledWith({
        name: 'lesson',
        params: { collectionId: 5, lessonId: 1 }
      })
    })
  })

  describe('chapter-of display', () => {
    test('renders chapter-of text when chapters are present', () => {
      chaptersRef.value = CHAPTERS
      const wrapper = mountView({ lessonId: '2' })

      expect(wrapper.find('[data-testid="lesson-view__chapter-of"]').exists()).toBe(true)
    })

    test('does not render chapter-of when there are no chapters', () => {
      chaptersRef.value = []
      const wrapper = mountView()

      expect(wrapper.find('[data-testid="lesson-view__chapter-of"]').exists()).toBe(false)
    })
  })

  describe('mobile title', () => {
    test('renders a centered lesson-title heading above the transcript', () => {
      const wrapper = mountView()
      expect(wrapper.find('[data-testid="lesson-view__title-text"]').exists()).toBe(true)
    })
  })

  describe('edit button', () => {
    test('clicking lesson-view__edit opens the collection edit modal', async () => {
      const wrapper = mountView()
      await wrapper.find('[data-testid="lesson-view__edit"]').trigger('click')

      expect(editModalOpenMock).toHaveBeenCalledOnce()
      expect(editModalOpenMock).toHaveBeenCalledWith(5)
    })
  })

  describe('term card placement — dock vs sidebar [obligation]', () => {
    test('dock shows toolbar by default (no selection, popover closed)', () => {
      const wrapper = mountView()

      expect(wrapper.find('[data-testid="lesson-view__dock-toolbar"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="lesson-view__dock-term"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="lesson-view__sidebar-term"]').exists()).toBe(false)
    })

    // [obligation] Below xl the committed term card lives in the dock; the sidebar
    // stays on its chapter list.
    test('dock shows term-card on mobile when popover open and selection set [obligation]', async () => {
      isDesktopRef.value = false
      const wrapper = mountView()
      // Set state after mount so the watch fires and the deferred rAF executes.
      selectionRef.value = { term: 'hello', sentence: 'say hello', word_index: 3, rect: {} }
      popoverOpenRef.value = true
      await nextTick()

      expect(wrapper.find('[data-testid="lesson-view__dock-term"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="lesson-view__dock-toolbar"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="lesson-view__sidebar-term"]').exists()).toBe(false)
    })

    // [obligation] At xl+ the term card moves to the sidebar (replacing the chapter
    // list) and the dock falls back to its toolbar — only one term-card mounts.
    test('sidebar shows term-card on desktop when popover open and selection set [obligation]', async () => {
      isDesktopRef.value = true
      popoverOpenRef.value = true
      selectionRef.value = { term: 'hello', sentence: 'say hello', word_index: 3, rect: {} }

      const wrapper = mountView()
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-testid="lesson-view__sidebar-term"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="lesson-view__chapters"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="lesson-view__dock-term"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="lesson-view__dock-toolbar"]').exists()).toBe(true)
      expect(wrapper.findAllComponents({ name: 'TermCard' })).toHaveLength(1)
    })

    test('dock shows toolbar when popover is closed even with selection [obligation]', async () => {
      popoverOpenRef.value = false
      selectionRef.value = { term: 'hello', sentence: 'say hello', word_index: 3, rect: {} }

      const wrapper = mountView()
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-testid="lesson-view__dock-toolbar"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="lesson-view__dock-term"]').exists()).toBe(false)
    })

    test('dock shows toolbar when popover open but no selection [obligation]', async () => {
      popoverOpenRef.value = true
      selectionRef.value = null

      const wrapper = mountView()
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-testid="lesson-view__dock-toolbar"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="lesson-view__dock-term"]').exists()).toBe(false)
    })

    test('term-card receives the selection term and sentence [obligation]', async () => {
      const wrapper = mountView()
      selectionRef.value = {
        term: 'konnichiwa',
        sentence: 'konnichiwa world',
        word_index: 0,
        rect: {}
      }
      popoverOpenRef.value = true
      await nextTick()

      const termCard = wrapper.findComponent({ name: 'TermCard' })
      expect(termCard.exists()).toBe(true)
      expect(termCard.props('term')).toBe('konnichiwa')
      expect(termCard.props('sentence')).toBe('konnichiwa world')
    })

    test('term-card back event calls closeTerm [obligation]', async () => {
      const wrapper = mountView()
      selectionRef.value = { term: 'hi', sentence: 'say hi', word_index: 1, rect: {} }
      popoverOpenRef.value = true
      await nextTick()

      await wrapper.find('[data-testid="term-card-stub__back"]').trigger('click')
      expect(closeTermMock).toHaveBeenCalledOnce()
    })

    test('term-card close event calls closeTerm [obligation]', async () => {
      const wrapper = mountView()
      selectionRef.value = { term: 'hi', sentence: 'say hi', word_index: 1, rect: {} }
      popoverOpenRef.value = true
      await nextTick()

      await wrapper.find('[data-testid="term-card-stub__close"]').trigger('click')
      expect(closeTermMock).toHaveBeenCalledOnce()
    })

    test('term-card play-from-here event calls playFromHere [obligation]', async () => {
      const wrapper = mountView()
      selectionRef.value = { term: 'hi', sentence: 'say hi', word_index: 1, rect: {} }
      popoverOpenRef.value = true
      await nextTick()

      await wrapper.find('[data-testid="term-card-stub__play-from-here"]').trigger('click')
      expect(playFromHereMock).toHaveBeenCalledOnce()
    })

    test('term-card play-from-here event also resumes transcript follow [obligation]', async () => {
      const wrapper = mountView()
      selectionRef.value = { term: 'hi', sentence: 'say hi', word_index: 1, rect: {} }
      popoverOpenRef.value = true
      await nextTick()

      await wrapper.find('[data-testid="term-card-stub__play-from-here"]').trigger('click')

      expect(transcriptResumeMock).toHaveBeenCalledOnce()
      expect(playFromHereMock).toHaveBeenCalledOnce()
    })

    test('term-card play-word event calls playClip [obligation]', async () => {
      const wrapper = mountView()
      selectionRef.value = { term: 'hi', sentence: 'say hi', word_index: 1, rect: {} }
      popoverOpenRef.value = true
      await nextTick()

      await wrapper.find('[data-testid="term-card-stub__play-word"]').trigger('click')
      expect(playClipMock).toHaveBeenCalledOnce()
    })
  })

  describe('dismissTerm — transcript dismiss event [obligation]', () => {
    test('transcript dismiss event calls closeTerm [obligation]', async () => {
      popoverOpenRef.value = true
      selectionRef.value = { term: 'hi', sentence: 'say hi', word_index: 1, rect: {} }

      const wrapper = mountView()
      await wrapper.vm.$nextTick()

      await wrapper.find('[data-testid="transcript-stub__dismiss"]').trigger('click')

      expect(closeTermMock).toHaveBeenCalledOnce()
    })

    test('transcript dismiss event emits ui.snappy_button_5 [obligation]', async () => {
      popoverOpenRef.value = true
      selectionRef.value = { term: 'hi', sentence: 'say hi', word_index: 1, rect: {} }

      const wrapper = mountView()
      await wrapper.vm.$nextTick()

      await wrapper.find('[data-testid="transcript-stub__dismiss"]').trigger('click')

      expect(emitSfxMock).toHaveBeenCalledWith('snappy_button_5')
    })

    test('closeTerm alone does NOT emit ui.snappy_button_5 [obligation]', async () => {
      const wrapper = mountView()
      selectionRef.value = { term: 'hi', sentence: 'say hi', word_index: 1, rect: {} }
      popoverOpenRef.value = true
      await nextTick()

      // Trigger close via term-card's close event (not dismiss)
      await wrapper.find('[data-testid="term-card-stub__close"]').trigger('click')

      // closeTermMock was called but sfx was NOT emitted (sfx only in dismissTerm)
      expect(closeTermMock).toHaveBeenCalledOnce()
      expect(emitSfxMock).not.toHaveBeenCalledWith('snappy_button_5')
    })
  })

  describe('dock layout', () => {
    test('useAnimatedHeight is wired during setup', () => {
      vi.clearAllMocks()
      mountView()

      // Wired once for the dock term pane and once for the dock toolbar pane
      expect(useAnimatedHeight).toHaveBeenCalledTimes(2)
    })
  })

  describe('follow-button visibility [obligation]', () => {
    // show_follow_button = transcript.value?.following === false
    // When transcript.following flips false, the resume button appears.
    test('resume-follow button is hidden when transcript.following is true [obligation]', async () => {
      transcriptFollowing.value = true
      const wrapper = mountView()
      await nextTick()

      expect(wrapper.find('[data-testid="lesson-view__resume-follow"]').exists()).toBe(false)
    })

    test('resume-follow button renders in dock when transcript.following is false [obligation]', async () => {
      transcriptFollowing.value = false
      const wrapper = mountView()
      await nextTick()

      expect(wrapper.find('[data-testid="lesson-view__resume-follow"]').exists()).toBe(true)
    })

    test('resume-follow desktop button renders when transcript.following is false [obligation]', async () => {
      transcriptFollowing.value = false
      const wrapper = mountView()
      await nextTick()

      expect(wrapper.find('[data-testid="lesson-view__resume-follow-desktop"]').exists()).toBe(true)
    })

    test('resume-follow button is hidden again when transcript.following returns to true [obligation]', async () => {
      transcriptFollowing.value = false
      const wrapper = mountView()
      await nextTick()
      expect(wrapper.find('[data-testid="lesson-view__resume-follow"]').exists()).toBe(true)

      transcriptFollowing.value = true
      await nextTick()

      expect(wrapper.find('[data-testid="lesson-view__resume-follow"]').exists()).toBe(false)
    })

    test('follow_direction prop matches transcript follow_direction [obligation]', async () => {
      transcriptFollowing.value = false
      transcriptFollowDirection.value = 'up'
      const wrapper = mountView()
      await nextTick()

      // ResumeFollowButton stub is shallowed — find it by name and check its prop.
      const btn = wrapper.findComponent({ name: 'ResumeFollowButton' })
      expect(btn.exists()).toBe(true)
      expect(btn.props('direction')).toBe('up')
    })

    test('clicking resume-follow button calls transcript.resumeFollow [obligation]', async () => {
      transcriptFollowing.value = false
      const wrapper = mountView()
      await nextTick()

      // shallowMount auto-stubs ResumeFollowButton — emit the Vue event via vm.$emit
      // so the parent's @resume="resumeFollow" handler fires.
      const btn = wrapper.findComponent({ name: 'ResumeFollowButton' })
      expect(btn.exists()).toBe(true)
      await btn.vm.$emit('resume')
      await nextTick()

      expect(transcriptResumeMock).toHaveBeenCalledTimes(1)
    })
  })
})
