<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useStagedTap } from '@/composables/ui/staged-tap'

type ScriptOption = { value: TranscriptScript; label: string }

const OPTIONS: ScriptOption[] = [
  { value: 'original', label: 'audio-reader.upload.script-original' },
  { value: 'simplified', label: 'audio-reader.upload.script-simplified' },
  { value: 'traditional', label: 'audio-reader.upload.script-traditional' }
]

const script = defineModel<TranscriptScript>({ required: true })

const { t } = useI18n()

const { playing, tap } = useStagedTap({ triggerAt: 'press' })

function onOption(e: MouseEvent, value: TranscriptScript) {
  tap(
    () => {
      script.value = value
    },
    { audio: 'ui.select' }
  )(e)
}
</script>

<template>
  <div data-testid="upload-lesson__script" class="flex flex-col gap-2">
    <span class="text-sm text-ink">
      {{ t('audio-reader.upload.script-label') }}
    </span>

    <div class="flex gap-1 rounded-5 bg-well p-1">
      <button
        v-for="option in OPTIONS"
        :key="option.value"
        type="button"
        data-testid="upload-lesson__script-option"
        :data-value="option.value"
        :data-active="script === option.value"
        class="flex-1 cursor-pointer rounded-4 px-3 py-2 text-sm transition-colors data-[active=false]:text-ink data-[active=true]:bg-(--color-accent) data-[active=true]:text-(--color-on-accent) data-[active=false]:hover:bg-(--color-accent)/10"
        :data-playing="playing || null"
        v-sfx="{ hover: 'ui.hover' }"
        @click="(e) => onOption(e, option.value)"
      >
        {{ t(option.label) }}
      </button>
    </div>
  </div>
</template>
