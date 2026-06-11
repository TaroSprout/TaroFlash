<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'
import UiDropdownButton, {
  type DropdownOption
} from '@/components/ui-kit/dropdown-button/index.vue'
import Scrubber from '@/views/audio-reader/lesson/scrubber.vue'
import { useLocalRef } from '@/composables/use-local-ref'
import type { AudioPlayer } from '@/composables/audio-reader/use-audio-player'

type ToolbarChapter = { id: number; title: string }

type AudioToolbarProps = {
  player: AudioPlayer
  chapters: ToolbarChapter[]
  currentLessonId: number
}

const SKIP_SECONDS = 30
const SPEED_OPTIONS: DropdownOption[] = [
  { label: '0.5x', value: 0.5 },
  { label: '0.75x', value: 0.75 },
  { label: '1x', value: 1 },
  { label: '1.5x', value: 1.5 },
  { label: '2x', value: 2 }
]

const { player, chapters, currentLessonId } = defineProps<AudioToolbarProps>()

const emit = defineEmits<{
  (e: 'select-chapter', id: number): void
}>()

const { t } = useI18n()

const mode = useLocalRef<'expanded' | 'mini'>('audio-reader.toolbar-mode', 'expanded')

const is_playing = computed(() => player.is_playing.value)
const chapter_options = computed<DropdownOption[]>(() =>
  chapters.map((chapter, index) => ({ label: `${index + 1}. ${chapter.title}`, value: chapter.id }))
)
const current_chapter_label = computed(() => {
  const index = chapters.findIndex((chapter) => chapter.id === currentLessonId)
  if (index === -1) return ''
  return `${index + 1}. ${chapters[index].title}`
})
const current_speed_label = computed(() => `${player.playback_rate.value}x`)

function toggle() {
  if (player.is_playing.value) player.pause()
  else player.play()
}

function skipBack() {
  player.skip(-SKIP_SECONDS)
}

function skipForward() {
  player.skip(SKIP_SECONDS)
}

function onChapter(option: DropdownOption) {
  emit('select-chapter', Number(option.value))
}

function onSpeed(option: DropdownOption) {
  player.setPlaybackRate(Number(option.value))
}

function setMode(next: 'expanded' | 'mini') {
  mode.value = next
}
</script>

<template>
  <div data-testid="audio-toolbar" class="flex w-full min-w-0 flex-col">
    <div
      v-if="mode === 'expanded'"
      data-testid="audio-toolbar__expanded"
      class="flex flex-col gap-3"
    >
      <scrubber :player="player" layout="stacked" />

      <div data-testid="audio-toolbar__controls" class="flex items-center justify-center gap-5">
        <ui-button
          data-testid="audio-toolbar__skip-back"
          data-theme="grey-400"
          icon-left="arrow-back"
          icon-only
          size="lg"
          @click="skipBack"
        >
          {{ t('lesson-view.audio.skip-back-button') }}
        </ui-button>

        <ui-button
          data-testid="audio-toolbar__toggle"
          data-theme="grey-400"
          :icon-left="is_playing ? 'pause' : 'play'"
          icon-only
          size="xl"
          @click="toggle"
        >
          {{
            is_playing ? t('lesson-view.audio.pause-button') : t('lesson-view.audio.play-button')
          }}
        </ui-button>

        <ui-button
          data-testid="audio-toolbar__skip-forward"
          data-theme="grey-400"
          icon-left="arrow-forward"
          icon-only
          size="lg"
          @click="skipForward"
        >
          {{ t('lesson-view.audio.skip-forward-button') }}
        </ui-button>
      </div>

      <div data-testid="audio-toolbar__options" class="flex items-center justify-between gap-3">
        <ui-dropdown-button
          data-testid="audio-toolbar__chapter-select"
          data-theme="grey-400"
          icon-left="list"
          open-on-trigger
          position="top-start"
          :options="chapter_options"
          @select="onChapter"
        >
          {{ current_chapter_label }}
        </ui-dropdown-button>

        <div data-testid="audio-toolbar__options-end" class="flex items-center gap-3">
          <ui-dropdown-button
            data-testid="audio-toolbar__speed-select"
            data-theme="grey-400"
            open-on-trigger
            position="top-end"
            :options="SPEED_OPTIONS"
            @select="onSpeed"
          >
            {{ current_speed_label }}
          </ui-dropdown-button>

          <ui-button
            data-testid="audio-toolbar__collapse"
            data-theme="grey-400"
            icon-left="expand-more"
            icon-only
            size="lg"
            @click="setMode('mini')"
          >
            {{ t('lesson-view.audio.collapse-button') }}
          </ui-button>
        </div>
      </div>
    </div>

    <div v-else data-testid="audio-toolbar__mini" class="flex items-center gap-3">
      <ui-button
        data-testid="audio-toolbar__expand"
        data-theme="grey-400"
        icon-left="expand-less"
        icon-only
        size="lg"
        @click="setMode('expanded')"
      >
        {{ t('lesson-view.audio.expand-button') }}
      </ui-button>

      <ui-button
        data-testid="audio-toolbar__toggle"
        data-theme="grey-400"
        :icon-left="is_playing ? 'pause' : 'play'"
        icon-only
        size="lg"
        @click="toggle"
      >
        {{ is_playing ? t('lesson-view.audio.pause-button') : t('lesson-view.audio.play-button') }}
      </ui-button>

      <scrubber :player="player" layout="inline" />
    </div>
  </div>
</template>
