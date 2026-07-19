<script setup lang="ts">
import { useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import UiIcon from '@/components/ui-kit/icon.vue'
import UiTooltip from '@/components/ui-kit/tooltip.vue'
import { popScrimReveal } from '@/utils/animations/scrim-reveal'
import { emitSfx } from '@/sfx/bus'
import { useLocalRef } from '@/composables/storage/local-ref'
import { useMatchMedia } from '@/composables/ui/media-query'

defineSlots<{
  default(): any
}>()

const ADVANCED_REVEALED_KEY = 'deck-settings-advanced-revealed'

const { t } = useI18n()

// Whether the advanced fields are showing is a per-machine preference — a
// power user shouldn't have to reveal them on every visit.
const revealed = useLocalRef(ADVANCED_REVEALED_KEY, false)

// Tracks paged-window's own phone breakpoint, so the panel collapses exactly
// when the tab drops to a single column and the reserved height would push the
// save button off screen.
const is_phone = useMatchMedia('w<md')

// Each layer's at-rest opacity is class-driven so the restored state paints
// correctly on first render; from the first toggle onwards gsap's inline
// opacity/scale wins over the class, and the two always agree on the endpoint.
const scrim = useTemplateRef<HTMLElement>('scrim')
const badge_content = useTemplateRef<HTMLElement>('badge_content')
const fields = useTemplateRef<HTMLElement>('fields')

function toggleRevealed() {
  if (!scrim.value || !badge_content.value || !fields.value) return

  revealed.value = !revealed.value
  emitSfx('snappy_button_5')
  popScrimReveal(scrim.value, badge_content.value, fields.value, revealed.value, {
    collapse: is_phone.value
  })
}
</script>

<template>
  <div data-testid="advanced-reveal" class="relative grid">
    <ui-tooltip
      element="button"
      :text="t('deck.settings-modal.review-pacing.advanced-hide-tooltip')"
      data-testid="advanced-reveal__badge"
      class="absolute -top-3 left-1/2 z-1 -translate-x-1/2 rounded-full bg-brown-300 dark:bg-stone-900 px-4 py-1 text-base text-brown-500 dark:text-brown-100"
      :class="!revealed && 'pointer-events-none'"
      @click="toggleRevealed"
    >
      <span
        ref="badge_content"
        data-testid="advanced-reveal__badge-content"
        class="flex cursor-pointer items-center gap-2"
        :class="!revealed && 'opacity-0'"
      >
        <ui-icon src="eye-close" class="size-4.5" />
        {{ t('deck.settings-modal.review-pacing.advanced-label') }}
      </span>
    </ui-tooltip>

    <button
      ref="scrim"
      type="button"
      data-testid="advanced-reveal__scrim"
      class="col-start-1 row-start-1 flex cursor-pointer flex-col items-center justify-center gap-4 text-brown-500"
      :class="revealed && 'pointer-events-none opacity-0'"
      @click="toggleRevealed"
    >
      <ui-icon src="eye" class="size-10" />
      {{ t('deck.settings-modal.review-pacing.advanced-toggle') }}
    </button>

    <div
      ref="fields"
      data-testid="advanced-reveal__fields"
      class="col-start-1 row-start-1 flex flex-col gap-4"
      :class="!revealed && 'pointer-events-none opacity-0 max-md:h-0 max-md:overflow-hidden'"
    >
      <slot></slot>
    </div>
  </div>
</template>
