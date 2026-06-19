<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useStagedTap } from '@/composables/ui/staged-tap'
import { TYPE_SFX } from '@/sfx/config'

type ScriptOption = { value: TranscriptScript; label: string }

const OPTIONS: ScriptOption[] = [
  { value: 'original', label: 'audio-reader.upload.script-original' },
  { value: 'simplified', label: 'audio-reader.upload.script-simplified' },
  { value: 'traditional', label: 'audio-reader.upload.script-traditional' }
]

const script = defineModel<TranscriptScript>({ required: true })

const { t } = useI18n()

const { playing, tap } = useStagedTap({ triggerAt: 'press' })

function onCaptureOption(e: MouseEvent, value: TranscriptScript) {
  tap(
    () => {
      script.value = value
    },
    { audio: 'ui.select', captureMode: true }
  )(e)
}
</script>

<template>
  <div data-testid="upload-lesson__script" class="flex flex-col gap-2">
    <span class="text-sm text-brown-600 dark:text-grey-300">
      {{ t('audio-reader.upload.script-label') }}
    </span>

    <div class="flex gap-1 rounded-5 bg-brown-100 p-1 dark:bg-grey-800">
      <button
        v-for="option in OPTIONS"
        :key="option.value"
        type="button"
        data-testid="upload-lesson__script-option"
        :data-value="option.value"
        :data-active="script === option.value"
        class="flex-1 cursor-pointer rounded-4 px-3 py-2 text-sm transition-colors data-[active=false]:text-brown-600 data-[active=true]:bg-(--theme-primary) data-[active=true]:text-(--theme-on-primary) data-[active=false]:hover:bg-(--theme-primary)/10 dark:data-[active=false]:text-grey-300"
        :data-playing="playing || null"
        v-sfx="{ hover: TYPE_SFX }"
        @click.capture="(e) => onCaptureOption(e, option.value)"
      >
        {{ t(option.label) }}
      </button>
    </div>
  </div>
</template>
