<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import StationPreview from './station-preview.vue'
import { STATIONS, type Mode, type StationName } from './catalog'
import { injectColorTuner } from './use-color-tuner'

type ModeColumnProps = {
  mode: Mode
  open_station: StationName | null
}

const { mode, open_station } = defineProps<ModeColumnProps>()

const emit = defineEmits<{
  (e: 'open-roles', station: StationName, anchor: HTMLElement): void
}>()

const { t } = useI18n()
const tuner = injectColorTuner()

// The four previews share one fill rather than each painting its own, so a station's own surface is
// judged against the ground behind it instead of against itself.
const backdrop = computed(() => ({
  backgroundColor: tuner.hexOf(tuner.backdropShade(mode)) ?? undefined
}))

const backdrop_value = computed(() => tuner.state.value.backdrops[mode] ?? '')

function onBackdrop(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  tuner.setBackdrop(mode, value === '' ? null : value)
}
</script>

<template>
  <section :data-testid="`mode-column__${mode}`" class="flex flex-col gap-2 min-w-0">
    <header data-testid="mode-column__header" class="flex items-center gap-2 text-base">
      <h3 class="font-semibold">{{ t(`admin.color-page.mode.${mode}`) }}</h3>

      <label class="ml-auto flex items-center gap-1.5">
        {{ t('admin.color-page.backdrop-label') }}
        <select
          data-testid="mode-column__backdrop"
          class="rounded-2 px-1.5 py-0.5 bg-well text-ink"
          :value="backdrop_value"
          @change="onBackdrop"
        >
          <option value="">{{ t('admin.color-page.backdrop-follow') }}</option>
          <option v-for="shade in tuner.ordered_shades.value" :key="shade.id" :value="shade.id">
            {{ shade.name }}
          </option>
        </select>
      </label>
    </header>

    <div
      data-testid="mode-column__backdrop-area"
      class="grid grid-cols-2 gap-5 rounded-4 p-5"
      :style="backdrop"
    >
      <station-preview
        v-for="station in STATIONS"
        :key="station"
        :mode="mode"
        :station="station"
        :open="open_station === station"
        @open-roles="(anchor: HTMLElement) => emit('open-roles', station, anchor)"
      />
    </div>
  </section>
</template>
