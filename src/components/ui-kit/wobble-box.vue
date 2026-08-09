<script setup lang="ts">
import { useId } from 'vue'
import { useMatchMedia } from '@/composables/ui/media-query'

const { seed = 7 } = defineProps<{
  /** Turbulence seed — vary it to give reused instances a different wobble. */
  seed?: number
}>()

defineSlots<{ default: () => unknown }>()

// Filter ids must be unique per instance, or multiple boxes on one page
// reference the same <filter> and the later ones render unfiltered.
const filter_id = useId()

// iOS Safari's GPU filter buffer crashes the tab on this displacement filter;
// coarse pointers drop it and rely on the uneven border-radius instead.
const is_coarse = useMatchMedia('coarse')
</script>

<template>
  <div
    data-testid="ui-kit-wobble-box"
    class="wobble-box relative isolate"
    :style="{ '--wobble-filter': is_coarse ? 'none' : `url('#${filter_id}')` }"
  >
    <svg v-if="!is_coarse" width="0" height="0" class="absolute" aria-hidden="true">
      <filter :id="filter_id">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.0055"
          numOctaves="1"
          :seed="seed"
          result="noise"
        />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="14" result="displaced" />
        <feGaussianBlur in="displaced" stdDeviation="4" result="blurred" />
        <feColorMatrix
          in="blurred"
          type="matrix"
          values="1 0 0 0 0
                  0 1 0 0 0
                  0 0 1 0 0
                  0 0 0 11 -4.5"
        />
      </filter>
    </svg>

    <slot />
  </div>
</template>

<style scoped>
/* Lives on a pseudo-element so the filter wobbles only the panel's edges,
 * leaving slotted content above it crisp. */
.wobble-box::before {
  content: '';
  position: absolute;
  z-index: 0;

  /* Supersamples at 2x then scales to 0.5x so the browser anti-aliases the
   * wavy edge; geometry below is doubled to compensate. */
  left: 50%;
  top: 50%;
  width: 200%;
  height: 200%;
  transform: translate(-50%, -50%) scale(0.5);

  background-color: var(--color-accent);
  border-radius: 4.4rem 5.8rem 4.8rem 6.2rem / 5.4rem 4.4rem 6rem 4.8rem;
  filter: var(--wobble-filter);
}
</style>
