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

const SKIP_SECONDS = 10
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
  chapters.map((chapter) => ({ label: chapter.title, value: chapter.id }))
)
const current_chapter_label = computed(
  () => chapters.find((chapter) => chapter.id === currentLessonId)?.title ?? ''
)
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
  emitSfx(player.is_playing.value ? 'ui.snappy_button_3' : 'ui.snappy_button_2')
  interceptPlay(e, { onAfter: toggle })
}

function onBackTap(e: MouseEvent) {
  emitSfx('ui.snappy_button_5')
  interceptBack(e, { onAfter: skipBack })
}

function onForwardTap(e: MouseEvent) {
  emitSfx('ui.snappy_button_5')
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
          data-theme="brown-200"
          data-theme-dark="grey-700"
          :aria-label="t('lesson-view.audio.skip-back-button')"
          class="flex size-13 cursor-pointer items-center justify-center rounded-full bg-(--theme-primary) text-(--theme-on-primary) transition active:scale-95"
          :class="{ [TAP_BGX]: back_playing }"
          @click.capture="onBackTap"
          @click="skipBack"
        >
          <ui-icon src="skip-backward-10" class="size-6" />
        </button>

        <button
          data-testid="audio-toolbar__toggle"
          type="button"
          data-theme="blue-500"
          data-theme-dark="blue-650"
          :aria-label="
            is_playing ? t('lesson-view.audio.pause-button') : t('lesson-view.audio.play-button')
          "
          class="flex size-18 cursor-pointer items-center justify-center rounded-full bg-(--theme-primary) text-(--theme-on-primary) transition active:scale-95"
          :class="{ [TAP_BGX]: play_playing }"
          @click.capture="onPlayTap"
          @click="toggle"
        >
          <ui-icon :src="is_playing ? 'pause' : 'play'" class="size-8" />
        </button>

        <button
          data-testid="audio-toolbar__skip-forward"
          type="button"
          data-theme="brown-200"
          data-theme-dark="grey-700"
          :aria-label="t('lesson-view.audio.skip-forward-button')"
          class="flex size-13 cursor-pointer items-center justify-center rounded-full bg-(--theme-primary) text-(--theme-on-primary) transition active:scale-95"
          :class="{ [TAP_BGX]: forward_playing }"
          @click.capture="onForwardTap"
          @click="skipForward"
        >
          <ui-icon src="skip-forward-10" class="size-6" />
        </button>
      </div>

      <div data-testid="audio-toolbar__options" class="grid grid-cols-[68px_1fr_68px] items-center">
        <div data-testid="audio-toolbar__options-start" class="flex justify-start">
          <ui-button
            data-testid="audio-toolbar__collapse"
            data-theme="brown-100"
            data-theme-dark="stone-700"
            icon-left="minimize"
            variant="ghost"
            icon-only
            play-on-tap
            :sfx="{ click: 'ui.select' }"
            @click="setMode('mini')"
          />
        </div>

        <div data-testid="audio-toolbar__options-center" class="flex justify-center">
          <ui-dropdown-button
            data-testid="audio-toolbar__chapter-select"
            data-theme="brown-100"
            data-theme-dark="stone-700"
            icon-left="browser-content"
            variant="ghost"
            open-on-trigger
            hide-trigger
            shadow
            position="top-start"
            :options="chapter_options"
            @select="onChapter"
          >
            {{ current_chapter_label }}
          </ui-dropdown-button>
        </div>

        <div data-testid="audio-toolbar__options-end" class="flex justify-end">
          <ui-dropdown-button
            data-testid="audio-toolbar__speed-select"
            data-theme="brown-100"
            data-theme-dark="stone-700"
            icon-left="stopwatch"
            variant="ghost"
            open-on-trigger
            hide-trigger
            shadow
            position="top-end"
            :options="SPEED_OPTIONS"
            @select="onSpeed"
          >
            {{ current_speed_label }}
          </ui-dropdown-button>
        </div>
      </div>
    </div>

    <div v-else data-testid="audio-toolbar__mini" class="flex items-center gap-3">
      <ui-button
        data-testid="audio-toolbar__expand"
        data-theme="brown-300"
        icon-left="maximize"
        icon-only
        play-on-tap
        :sfx="{ click: 'ui.select' }"
        @click="setMode('expanded')"
      />

      <button
        data-testid="audio-toolbar__toggle"
        type="button"
        data-theme="blue-500"
        data-theme-dark="blue-650"
        :aria-label="
          is_playing ? t('lesson-view.audio.pause-button') : t('lesson-view.audio.play-button')
        "
        class="flex size-11 cursor-pointer items-center justify-center rounded-full bg-(--theme-primary) text-(--theme-on-primary) transition active:scale-95"
        :class="{ [TAP_BGX]: play_playing }"
        @click.capture="onPlayTap"
        @click="toggle"
      >
        <ui-icon :src="is_playing ? 'pause' : 'play'" class="size-5" />
      </button>

      <scrubber :player="player" layout="inline" />
    </div>
  </div>
</template>
