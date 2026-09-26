<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'
import UiOptionGroup from '@/components/ui-kit/option-group.vue'
import UiSelectMenu from '@/components/ui-kit/select-menu.vue'
import { useReaderPrefs } from './composables/reader-prefs'
import type { ParagraphDensity } from '@/utils/transcript'
import type { AudioPlayer } from './composables/audio-player'

type ReaderSettingsProps = {
  player: AudioPlayer
}

const { player } = defineProps<ReaderSettingsProps>()

const emit = defineEmits<{ (e: 'close'): void }>()

const { t } = useI18n()

const { paragraph_density } = useReaderPrefs()

const density_options = [
  {
    value: 'long' as ParagraphDensity,
    label: t('audio-reader.reader-settings.density-long')
  },
  {
    value: 'medium' as ParagraphDensity,
    label: t('audio-reader.reader-settings.density-medium')
  },
  {
    value: 'short' as ParagraphDensity,
    label: t('audio-reader.reader-settings.density-short')
  }
]

// UiSelectMenu is string-keyed, so speed round-trips through its string form and
// converts back to the number the player wants on select.
const speed_options = [
  { value: '0.5', label: '0.5x' },
  { value: '0.75', label: '0.75x' },
  { value: '1', label: '1x' },
  { value: '1.5', label: '1.5x' },
  { value: '2', label: '2x' }
]

const current_speed = computed(() => String(player.playback_rate.value))

function setSpeed(value: string) {
  player.setPlaybackRate(Number(value))
}

function setDensity(value: ParagraphDensity) {
  paragraph_density.value = value
}
</script>

<template>
  <div data-testid="reader-settings" class="flex w-full flex-col gap-6 pb-8">
    <header
      data-testid="reader-settings__header"
      class="grid w-full grid-cols-[1fr_auto_1fr] items-center"
    >
      <ui-button
        neutral
        data-testid="reader-settings__close"
        icon-only
        icon-left="close"
        class="justify-self-start"
        @press="emit('close')"
      >
        {{ t('audio-reader.reader-settings.close-button') }}
      </ui-button>

      <span
        data-testid="reader-settings__title"
        class="justify-self-center text-xl font-semibold text-ink"
      >
        {{ t('audio-reader.reader-settings.title') }}
      </span>
    </header>

    <div
      data-palette="brand"
      data-testid="reader-settings__options"
      class="mx-auto flex w-full max-w-70 flex-col gap-4"
    >
      <div data-testid="reader-settings__paragraph-density" class="flex flex-col gap-2">
        <span class="text-sm text-ink-muted">
          {{ t('audio-reader.reader-settings.paragraph-density-label') }}
        </span>
        <ui-option-group
          full_width
          size="base"
          :options="density_options"
          :value="paragraph_density"
          @update:value="setDensity"
        />
      </div>

      <div data-testid="reader-settings__speed" class="flex flex-col gap-2">
        <span class="text-sm text-ink-muted">
          {{ t('audio-reader.reader-settings.speed-label') }}
        </span>
        <ui-select-menu
          size="base"
          :options="speed_options"
          :model-value="current_speed"
          @update:model-value="setSpeed"
        />
      </div>
    </div>
  </div>
</template>
