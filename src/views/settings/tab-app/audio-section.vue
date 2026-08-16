<script setup lang="ts">
import { inject, onBeforeUnmount, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import UiSlider from '@/components/ui-kit/slider.vue'
import UiToggle from '@/components/ui-kit/toggle.vue'
import LabeledSection from '@/components/layout-kit/labeled-section.vue'
import { memberEditorKey } from '@/composables/member/editor'
import { discardVolumePreview, previewMemberVolumes } from '@/sfx/volume-seam'

const { t } = useI18n()
const editor = inject(memberEditorKey)!

onBeforeUnmount(() => discardVolumePreview())

// Only the sliders live-preview — mute is excluded, so the preview always plays unmuted; mute itself applies on save via App.vue.
watch(
  () => [
    editor.draft.preferences.audio.interface_sounds,
    editor.draft.preferences.audio.hover_sounds
  ],
  ([interface_sounds, hover_sounds]) =>
    previewMemberVolumes({ muted: false, interface_sounds, hover_sounds })
)
</script>

<template>
  <labeled-section :label="t('settings.app.section.audio')" class="pb-24">
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
        preview_bus="interface"
      />
      <ui-slider
        v-model="editor.draft.preferences.audio.hover_sounds"
        :min="0"
        :max="10"
        :label="t('settings.app.audio.hover-sounds')"
        preview_bus="hover"
      />
    </div>
  </labeled-section>
</template>
