<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import PaintTarget from './paint-target.vue'
import UiIcon from '@/components/ui-kit/icon.vue'
import type { Mode, StationName } from './catalog'
import { injectColorTuner } from './use-color-tuner'

type StationPreviewProps = {
  mode: Mode
  station: StationName
  open: boolean
}

// Each station gets its own framing so the page reads flat against the backdrop while a float
// reads as lifted off it — the same separation the real chrome carries.
const FRAMING: Record<StationName, string> = {
  page: 'rounded-1',
  panel: 'rounded-2 ring-1 ring-black/10',
  window: 'rounded-4 shadow-[0_6px_16px_var(--shadow-color)]',
  float: 'rounded-3 shadow-[0_10px_28px_var(--shadow-color)] ring-1 ring-black/25'
}

const { mode, station, open } = defineProps<StationPreviewProps>()

const emit = defineEmits<{
  (e: 'open-roles', anchor: HTMLElement): void
}>()

const { t } = useI18n()
const tuner = injectColorTuner()

const unanswered = computed(() => tuner.unansweredCount(mode, station))

function onOpenRoles(event: MouseEvent) {
  emit('open-roles', event.currentTarget as HTMLElement)
}
</script>

<template>
  <section
    :data-testid="`station-preview__${mode}-${station}`"
    class="flex flex-col gap-1.5 min-w-0"
  >
    <header data-testid="station-preview__header" class="flex items-center gap-2 text-base">
      <span class="font-semibold">{{ station }}</span>

      <span
        v-if="unanswered > 0"
        data-testid="station-preview__unanswered"
        class="rounded-full px-1.5 bg-(--color-accent) text-(--color-on-accent)"
      >
        {{ t('admin.color-page.preview.unanswered-count', { count: unanswered }) }}
      </span>

      <button
        type="button"
        data-testid="station-preview__roles-button"
        :data-active="open"
        class="ml-auto rounded-2 px-2 py-0.5 cursor-pointer bg-raised text-ink data-[active=true]:bg-(--color-accent) data-[active=true]:text-(--color-on-accent)"
        @click="onOpenRoles"
      >
        {{ t('admin.color-page.preview.roles-button') }}
      </button>
    </header>

    <paint-target
      element_id="canvas"
      :mode="mode"
      :station="station"
      tag="article"
      :class="['flex flex-col gap-2.5 p-3', FRAMING[station]]"
    >
      <div data-testid="station-preview__row" class="flex items-start gap-2">
        <div class="flex flex-col gap-1 min-w-0 flex-1">
          <paint-target
            element_id="title"
            :mode="mode"
            :station="station"
            tag="p"
            class="text-base"
          >
            {{ t('admin.color-page.preview.title') }}
          </paint-target>

          <paint-target
            element_id="subtitle"
            :mode="mode"
            :station="station"
            tag="p"
            class="text-base"
          >
            {{ t('admin.color-page.preview.subtitle') }}
          </paint-target>
        </div>

        <paint-target
          element_id="chip"
          :mode="mode"
          :station="station"
          tag="span"
          class="shrink-0 rounded-full px-2 py-0.5 text-base"
        >
          {{ t('admin.color-page.preview.chip') }}
        </paint-target>
      </div>

      <paint-target
        element_id="field"
        :mode="mode"
        :station="station"
        class="rounded-2 px-2.5 py-1.5 text-base"
      >
        {{ t('admin.color-page.preview.field') }}
      </paint-target>

      <paint-target element_id="rule" :mode="mode" :station="station" class="h-px w-full" />

      <div data-testid="station-preview__actions" class="flex items-center gap-2">
        <paint-target
          element_id="action"
          :mode="mode"
          :station="station"
          tag="span"
          class="rounded-2 px-3 py-1 text-base"
        >
          {{ t('admin.color-page.preview.action') }}
        </paint-target>

        <paint-target
          element_id="action-caret"
          :mode="mode"
          :station="station"
          tag="span"
          class="rounded-2 px-2 py-1 text-base"
        >
          <ui-icon src="carat-down" class="w-4 h-4" />
        </paint-target>
      </div>

      <div data-testid="station-preview__placeholder" class="flex flex-col gap-1">
        <paint-target
          element_id="placeholder"
          :mode="mode"
          :station="station"
          class="h-2.5 w-full rounded-full"
        />

        <paint-target
          element_id="placeholder-sweep"
          :mode="mode"
          :station="station"
          class="h-2.5 w-1/3 rounded-full"
        />
      </div>
    </paint-target>
  </section>
</template>
