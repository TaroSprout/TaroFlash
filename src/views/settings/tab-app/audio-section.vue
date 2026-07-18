<script setup lang="ts">
import { inject, onBeforeUnmount, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import UiSlider from '@/components/ui-kit/slider.vue'
import UiToggle from '@/components/ui-kit/toggle.vue'
import LabeledSection from '@/components/layout-kit/labeled-section.vue'
import { memberEditorKey } from '@/composables/member/editor'
import { toBusVolumes } from '@/utils/member/preferences'
import audio_player from '@/sfx/player'

const { t } = useI18n()
const editor = inject(memberEditorKey)!

onBeforeUnmount(() => audio_player.resetSettings())

watch(
  () => editor.draft.preferences.audio,
  (audio) => audio_player.previewVolumeConfig(toBusVolumes(audio)),
  { deep: true }
)
</script>

<template>
  <labeled-section :label="t('settings.app.section.audio')">
    <div data-testid="tab-app__audio" class="flex flex-col gap-3">
      <ui-toggle
        v-model:checked="editor.draft.preferences.audio.muted"
        data-testid="tab-app__mute-all"
      >
        <span data-testid="tab-app__mute-all-label">{{ t('settings.app.audio.mute-all') }}</span>
      </ui-toggle>

      <ui-slider
        v-model="editor.draft.preferences.audio.interface_sounds"
        :min="0"
        :max="10"
        :label="t('settings.app.audio.interface-sounds')"
        :sfx="{ bus: 'interface' }"
      />
      <ui-slider
        v-model="editor.draft.preferences.audio.hover_sounds"
        :min="0"
        :max="10"
        :label="t('settings.app.audio.hover-sounds')"
        :sfx="{ bus: 'hover' }"
      />
    </div>
  </labeled-section>
</template>
