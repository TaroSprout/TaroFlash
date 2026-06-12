<script setup lang="ts">
import { computed, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { emitSfx } from '@/sfx/bus'
import { useLessonsByCollectionQuery, useSetCollectionProgressMutation } from '@/api/lessons'
import { useLessonReader } from '@/composables/audio-reader/use-lesson-reader'
import { useCollectionEditModal } from '@/composables/modals/use-collection-edit-modal'
import { useMatchMedia } from '@/composables/use-media-query'
import { useAnimatedHeight } from '@/composables/use-animated-height'
import { scrollClearOf } from '@/utils/animations/transcript-scroll'
import {
  footerSwapBeforeLeave,
  footerSwapEnter,
  footerSwapLeave
} from '@/utils/animations/footer-swap'
import UiButton from '@/components/ui-kit/button.vue'
import ScrollBar from '@/components/ui-kit/scroll-bar.vue'
import AudioToolbar from '@/views/audio-reader/lesson/audio-toolbar.vue'
import TranscriptView from '@/views/audio-reader/transcript/index.vue'
import TermPopover from '@/views/audio-reader/term-popover/index.vue'
import TermCard from '@/views/audio-reader/term-popover/term-card.vue'

const { collectionId, lessonId } = defineProps<{ collectionId: string; lessonId: string }>()

const { t } = useI18n()
const router = useRouter()
const edit_modal = useCollectionEditModal()
const set_progress = useSetCollectionProgressMutation()
const is_mobile = useMatchMedia('w<sm | h<sm')

const collection_id = computed(() => Number(collectionId))
const lesson_id = computed(() => Number(lessonId))

const {
  lesson,
  paragraphs,
  matches,
  audio_url,
  active_word,
  selection,
  selected_term_decks,
  popover_open,
  target_lang,
  openTerm,
  closeTerm,
  playFromHere,
  playClip,
  player
} = useLessonReader(lesson_id)

const { data: lessons_data } = useLessonsByCollectionQuery(collection_id)

const footer_bar = useTemplateRef<HTMLElement>('footer_bar')
const footer_swap = useTemplateRef<HTMLElement>('footer_swap')
const footer_term = useTemplateRef<HTMLElement>('footer_term')
const footer_toolbar = useTemplateRef<HTMLElement>('footer_toolbar')

// Gap to leave between the selected word and the footer's top edge after a reveal.
const FOOTER_CLEARANCE = 16

// True while the toolbar ⇄ term crossfade owns the footer height, so the
// content-driven height animation stands down and only tracks the baseline.
let swapping = false

const chapters = computed(() => lessons_data.value ?? [])
const current_index = computed(() => chapters.value.findIndex((c) => c.id === lesson_id.value))
const chapter_of = computed(() => ({
  current: current_index.value + 1,
  total: chapters.value.length
}))

// On a phone the term translation takes over the footer in place of the audio
// toolbar; on desktop it stays an anchored popover over the transcript.
const show_term_in_footer = computed(
  () => is_mobile.value && popover_open.value && !!selection.value
)

function goToChapter(id: number) {
  router.push({ name: 'lesson', params: { collectionId: collection_id.value, lessonId: id } })
}

function onEdit() {
  edit_modal.open(collection_id.value)
}

// Tapping outside the term dismisses it with the same cue as its close button.
function dismissTerm() {
  emitSfx('ui.snappy_button_5')
  closeTerm()
}

// Freeze the footer height before the outgoing pane pins absolute, then tween it
// to the incoming pane's height as the two crossfade.
function onFooterBeforeLeave() {
  swapping = true
  if (footer_swap.value) footerSwapBeforeLeave(footer_swap.value)()
}

function onFooterEnter(el: Element, done: () => void) {
  swapping = true
  if (footer_swap.value) footerSwapEnter(footer_swap.value)(el, done)
  else done()
}

function onFooterAfterEnter() {
  swapping = false
}

// The word was scrolled clear of the footer when the term opened, but the footer
// grows once the definition loads and can re-cover it — lift it back above the
// settled footer.
function reclearSelection() {
  const sel = selection.value
  if (!show_term_in_footer.value || !sel || !footer_bar.value) return

  const word = document.querySelector<HTMLElement>(`[data-word-index="${sel.word_index}"]`)
  if (!word) return

  scrollClearOf(window, word, footer_bar.value.getBoundingClientRect().top - FOOTER_CLEARANCE)
}

// Track whichever pane is mounted: the term card swelling as its definition loads,
// and the toolbar growing/shrinking between its mini and expanded modes. The
// crossfade between the two panes owns the height while `swapping`.
useAnimatedHeight(footer_swap, footer_term, () => !swapping, reclearSelection)
useAnimatedHeight(footer_swap, footer_toolbar, () => !swapping)

// Bookmark the chapter once it's confirmed loaded, so the dashboard reopens the
// book here next time. Reacting to the loaded lesson id (not the raw route param)
// avoids writing a bookmark for a lesson that doesn't exist.
watch(
  () => lesson.value?.id,
  (id) => {
    if (id) set_progress.mutate({ collection_id: collection_id.value, lesson_id: id })
  },
  { immediate: true }
)
</script>

<template>
  <section
    data-testid="lesson-view"
    class="flex min-h-[calc(100dvh-var(--nav-height))] flex-col gap-6 xl:flex-row"
  >
    <aside
      data-testid="lesson-view__sidebar"
      class="hidden shrink-0 flex-col gap-4 xl:flex xl:sticky xl:top-(--nav-height) xl:max-h-[calc(100dvh-var(--nav-height))] xl:w-56 xl:self-start xl:overflow-y-auto"
    >
      <header data-testid="lesson-view__header" class="flex items-center justify-between gap-4">
        <div data-testid="lesson-view__heading" class="flex flex-col gap-1">
          <h1 class="text-3xl text-brown-700 dark:text-brown-300">{{ lesson?.title }}</h1>

          <span
            v-if="chapter_of.total > 0"
            data-testid="lesson-view__chapter-of"
            class="text-base text-brown-500 dark:text-grey-400"
          >
            {{ t('lesson-view.chapter-of', chapter_of) }}
          </span>
        </div>

        <ui-button
          data-testid="lesson-view__edit"
          data-theme="grey-400"
          icon-left="settings"
          icon-only
          size="lg"
          @click="onEdit"
        >
          {{ t('lesson-view.edit-button') }}
        </ui-button>
      </header>

      <nav
        data-testid="lesson-view__chapters"
        class="flex gap-2 overflow-x-auto pb-2 xl:flex-col xl:overflow-x-visible xl:pb-0"
      >
        <button
          v-for="chapter in chapters"
          :key="chapter.id"
          data-testid="lesson-view__chapter"
          :data-active="chapter.id === lesson_id"
          type="button"
          class="shrink-0 cursor-pointer rounded-7 bg-brown-200 px-4 py-2 text-left text-base text-brown-700 data-[active=true]:bg-blue-500 data-[active=true]:text-white xl:shrink dark:bg-grey-700 dark:text-brown-200 dark:data-[active=true]:bg-blue-650"
          @click="goToChapter(chapter.id)"
        >
          <span class="line-clamp-1">{{ chapter.title }}</span>
        </button>
      </nav>
    </aside>

    <div data-testid="lesson-view__reader" class="relative flex flex-1 flex-col xl:min-w-0">
      <header
        data-testid="lesson-view__title"
        class="flex flex-col items-center px-4 pb-6 text-center xl:hidden"
      >
        <h1
          data-testid="lesson-view__title-text"
          class="text-3xl text-brown-700 dark:text-brown-300"
        >
          {{ lesson?.title }}
        </h1>
      </header>

      <div data-testid="lesson-view__transcript" class="px-0 pt-6 pb-2 sm:px-6">
        <transcript-view
          :paragraphs="paragraphs"
          :matches="matches"
          :active_word="active_word"
          :popover_open="popover_open"
          @select="openTerm"
          @dismiss="dismissTerm"
        />
      </div>

      <footer
        ref="footer_bar"
        data-testid="lesson-view__bar"
        class="w-full left-0 fixed bottom-0 rounded-t-6 z-30 bg-brown-300 p-5 pb-2 pointer-fine:pb-6 dark:bg-stone-900"
      >
        <div ref="footer_swap" data-testid="lesson-view__footer-swap" class="relative w-full">
          <transition
            :css="false"
            @before-leave="onFooterBeforeLeave"
            @enter="onFooterEnter"
            @after-enter="onFooterAfterEnter"
            @leave="footerSwapLeave"
          >
            <div
              v-if="show_term_in_footer && selection"
              key="term"
              ref="footer_term"
              data-testid="lesson-view__footer-term"
              class="pb-2"
            >
              <term-card
                :term="selection.term"
                :sentence="selection.sentence"
                :target_lang="target_lang"
                :existing_decks="selected_term_decks"
                show_back
                @back="closeTerm"
                @close="closeTerm"
                @play-from-here="playFromHere"
                @play-word="playClip"
              />
            </div>

            <div
              v-else
              key="toolbar"
              ref="footer_toolbar"
              data-testid="lesson-view__footer-toolbar"
            >
              <audio-toolbar
                :player="player"
                :chapters="chapters"
                :current-lesson-id="lesson_id"
                @select-chapter="goToChapter"
              />
            </div>
          </transition>
        </div>

        <audio
          ref="audio"
          data-testid="lesson-view__audio"
          :src="audio_url ?? undefined"
          class="hidden"
        />
      </footer>

      <scroll-bar class="fixed top-(--nav-height) right-6 bottom-6" target="html" />

      <term-popover
        v-if="selection && !is_mobile"
        :open="popover_open"
        :rect="selection.rect"
        :term="selection.term"
        :sentence="selection.sentence"
        :target_lang="target_lang"
        :existing_decks="selected_term_decks"
        @close="closeTerm"
        @play-from-here="playFromHere"
        @play-word="playClip"
      />
    </div>
  </section>
</template>
