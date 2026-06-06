<script setup lang="ts">
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useLessonsByCollectionQuery, useSetCollectionProgressMutation } from '@/api/lessons'
import { useLessonReader } from '@/composables/audio-reader/use-lesson-reader'
import { useCollectionEditModal } from '@/composables/modals/use-collection-edit-modal'
import UiButton from '@/components/ui-kit/button.vue'
import TranscriptView from '@/views/audio-reader/transcript/index.vue'
import TermPopover from '@/views/audio-reader/term-popover/index.vue'

// Translate into the app language. A per-member target language can replace this
// later; admin-only v1 is English.
const TARGET_LANG = 'English'

const { collectionId, lessonId } = defineProps<{ collectionId: string; lessonId: string }>()

const { t } = useI18n()
const router = useRouter()
const edit_modal = useCollectionEditModal()
const set_progress = useSetCollectionProgressMutation()

const collection_id = computed(() => Number(collectionId))
const lesson_id = computed(() => Number(lessonId))

const { lesson, paragraphs, audio_url, active_word, selection, popover_open, openTerm, closeTerm } =
  useLessonReader(lesson_id)

const { data: lessons_data } = useLessonsByCollectionQuery(collection_id)

const chapters = computed(() => lessons_data.value ?? [])
const current_index = computed(() => chapters.value.findIndex((c) => c.id === lesson_id.value))
const prev_chapter = computed(() => chapters.value[current_index.value - 1])
const next_chapter = computed(() => chapters.value[current_index.value + 1])
const chapter_of = computed(() => ({
  current: current_index.value + 1,
  total: chapters.value.length
}))

function goToChapter(id: number) {
  router.push({ name: 'lesson', params: { collectionId: collection_id.value, lessonId: id } })
}

function onEdit() {
  edit_modal.open(collection_id.value)
}

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
  <section data-testid="lesson-view" class="flex h-full flex-col gap-6 xl:flex-row">
    <nav
      data-testid="lesson-view__chapters"
      class="flex shrink-0 gap-2 overflow-x-auto pb-2 xl:w-56 xl:flex-col xl:overflow-x-visible xl:overflow-y-auto xl:pb-0"
    >
      <button
        v-for="(chapter, index) in chapters"
        :key="chapter.id"
        data-testid="lesson-view__chapter"
        :data-active="chapter.id === lesson_id"
        type="button"
        class="shrink-0 rounded-7 bg-brown-200 px-4 py-2 text-left text-base text-brown-700 data-[active=true]:bg-blue-500 data-[active=true]:text-white xl:shrink dark:bg-grey-700 dark:text-brown-200 dark:data-[active=true]:bg-blue-650"
        @click="goToChapter(chapter.id)"
      >
        <span class="line-clamp-1">{{ index + 1 }}. {{ chapter.title }}</span>
      </button>
    </nav>

    <div data-testid="lesson-view__reader" class="flex min-h-0 flex-1 flex-col gap-4">
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

      <div
        data-testid="lesson-view__transcript"
        class="min-h-0 flex-1 overflow-y-auto rounded-7 bg-brown-100 px-6 pt-6 pb-2 dark:bg-grey-800"
      >
        <transcript-view
          :paragraphs="paragraphs"
          :active_word="active_word"
          :popover_open="popover_open"
          @select="openTerm"
        />
      </div>

      <term-popover
        v-if="selection"
        :open="popover_open"
        :rect="selection.rect"
        :term="selection.term"
        :sentence="selection.sentence"
        :target_lang="TARGET_LANG"
        @close="closeTerm"
      />

      <footer
        data-testid="lesson-view__bar"
        class="flex items-center gap-3 border-t border-brown-300 pt-3 dark:border-grey-700"
      >
        <ui-button
          data-testid="lesson-view__prev"
          data-theme="grey-400"
          icon-left="chevron-left"
          icon-only
          size="lg"
          :disabled="!prev_chapter"
          @click="prev_chapter && goToChapter(prev_chapter.id)"
        >
          {{ t('lesson-view.prev-button') }}
        </ui-button>

        <audio
          ref="audio"
          data-testid="lesson-view__audio"
          :src="audio_url ?? undefined"
          controls
          class="w-full"
        />

        <ui-button
          data-testid="lesson-view__next"
          data-theme="grey-400"
          icon-left="chevron-right"
          icon-only
          size="lg"
          :disabled="!next_chapter"
          @click="next_chapter && goToChapter(next_chapter.id)"
        >
          {{ t('lesson-view.next-button') }}
        </ui-button>
      </footer>
    </div>
  </section>
</template>
