<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'
import UiIcon from '@/components/ui-kit/icon.vue'
import UiDropdownButton, {
  type DropdownOption
} from '@/components/ui-kit/dropdown-button/index.vue'
import Scrubber from '@/views/audio-reader/lesson/scrubber.vue'
import { useLocalRef } from '@/composables/use-local-ref'
import { usePlayOnTap } from '@/composables/use-play-on-tap'
import { emitSfx } from '@/sfx/bus'
import type { AudioPlayer } from '@/composables/audio-reader/use-audio-player'

type ToolbarChapter = { id: number; title: string }

type AudioToolbarProps = {
  player: AudioPlayer
  chapters: ToolbarChapter[]
  currentLessonId: number
}

const SKIP_SECONDS = 15
// Striped texture that slides across a transport button while its tap-pop plays.
// `currentColor` makes the stripes track each button's own icon color.
const TAP_BGX = 'bgx-diagonal-stripes animation-safe:bgx-slide bgx-color-[currentColor]'
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

const { playing: back_playing, interceptClick: interceptBack } = usePlayOnTap({ yoyo: true })
const { playing: play_playing, interceptClick: interceptPlay } = usePlayOnTap({ yoyo: true })
const { playing: forward_playing, interceptClick: interceptForward } = usePlayOnTap({
  yoyo: true
})

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

// The transport buttons are custom markup, so they wire the tap-pop + select
// chime themselves (button.vue does this internally for kit buttons). The pop
// only fires on coarse; `onAfter` runs the action there, the bubble @click on
// fine — exactly one activation per pointer type.
function onPlayTap(e: MouseEvent) {
  emitSfx('ui.snappy_button_2')
  interceptPlay(e, { onAfter: toggle })
}

function onBackTap(e: MouseEvent) {
  emitSfx('ui.toggle_off')
  interceptBack(e, { onAfter: skipBack })
}

function onForwardTap(e: MouseEvent) {
  emitSfx('ui.toggle_on')
  interceptForward(e, { onAfter: skipForward })
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
      class="flex flex-col gap-5"
    >
      <scrubber :player="player" layout="stacked" />

      <div data-testid="audio-toolbar__controls" class="flex items-center justify-center gap-6">
        <button
          data-testid="audio-toolbar__skip-back"
          type="button"
          :aria-label="t('lesson-view.audio.skip-back-button')"
          class="flex size-13 cursor-pointer items-center justify-center rounded-full bg-brown-200 text-brown-700 transition active:scale-95 dark:bg-grey-700 dark:text-grey-200"
          :class="{ [TAP_BGX]: back_playing }"
          @click.capture="onBackTap"
          @click="skipBack"
        >
          <ui-icon src="arrow-back" class="size-6" />
        </button>

        <button
          data-testid="audio-toolbar__toggle"
          type="button"
          :aria-label="
            is_playing ? t('lesson-view.audio.pause-button') : t('lesson-view.audio.play-button')
          "
          class="flex size-18 cursor-pointer items-center justify-center rounded-full bg-blue-500 text-white transition active:scale-95 dark:bg-blue-650"
          :class="{ [TAP_BGX]: play_playing }"
          @click.capture="onPlayTap"
          @click="toggle"
        >
          <ui-icon :src="is_playing ? 'pause' : 'play'" class="size-8" />
        </button>

        <button
          data-testid="audio-toolbar__skip-forward"
          type="button"
          :aria-label="t('lesson-view.audio.skip-forward-button')"
          class="flex size-13 cursor-pointer items-center justify-center rounded-full bg-brown-200 text-brown-700 transition active:scale-95 dark:bg-grey-700 dark:text-grey-200"
          :class="{ [TAP_BGX]: forward_playing }"
          @click.capture="onForwardTap"
          @click="skipForward"
        >
          <ui-icon src="arrow-forward" class="size-6" />
        </button>
      </div>

      <div data-testid="audio-toolbar__options" class="flex items-center justify-between gap-3">
        <ui-dropdown-button
          data-testid="audio-toolbar__chapter-select"
          data-theme="brown-300"
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
            data-theme="brown-300"
            open-on-trigger
            position="top-end"
            :options="SPEED_OPTIONS"
            @select="onSpeed"
          >
            {{ current_speed_label }}
          </ui-dropdown-button>

          <ui-button
            data-testid="audio-toolbar__collapse"
            data-theme="brown-300"
            icon-left="expand-more"
            icon-only
            size="lg"
            play-on-tap
            :sfx="{ click: 'ui.select' }"
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
        data-theme="brown-300"
        icon-left="expand-less"
        icon-only
        size="lg"
        play-on-tap
        :sfx="{ click: 'ui.select' }"
        @click="setMode('expanded')"
      >
        {{ t('lesson-view.audio.expand-button') }}
      </ui-button>

      <ui-button
        :key="String(is_playing)"
        data-testid="audio-toolbar__toggle"
        data-theme="brown-300"
        :icon-left="is_playing ? 'pause' : 'play'"
        icon-only
        size="lg"
        play-on-tap
        :sfx="{ click: 'ui.snappy_button_2' }"
        @click="toggle"
      >
        {{ is_playing ? t('lesson-view.audio.pause-button') : t('lesson-view.audio.play-button') }}
      </ui-button>

      <scrubber :player="player" layout="inline" />
    </div>
  </div>
</template>
