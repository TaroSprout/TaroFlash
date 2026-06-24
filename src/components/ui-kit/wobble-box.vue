<script setup lang="ts">
// imports
import { useId } from 'vue'
import { useMatchMedia } from '@/composables/ui/media-query'

// defines
const { seed = 7 } = defineProps<{
  /** Turbulence seed — vary it to give reused instances a different wobble. */
  seed?: number
}>()

defineSlots<{ default: () => unknown }>()

// composables + state
// Filter ids must be unique per instance, or multiple boxes on one page
// reference the same <filter> and the later ones render unfiltered.
const filter_id = useId()

// The SVG displacement filter exhausts iOS Safari's GPU filter buffer and
// crashes the tab. On coarse pointers we drop the filter entirely and let the
// uneven border-radius carry the hand-drawn blob shape on its own.
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
        <!-- Blur smears the jagged displaced edge into a soft gradient, then the
             colour-matrix steepens alpha (×11, −4.5 offset) to snap it back crisp —
             leaving only a thin feathered band that reads as anti-aliasing. -->
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
/* The background lives on a pseudo-element so the displacement filter wobbles
 * only the panel's edges — slotted content above it stays crisp. Uneven corner
 * radii plus the SVG turbulence give a soft, hand-drawn, mis-shapen look. */
.wobble-box::before {
  content: '';
  position: absolute;
  z-index: 0;

  /* Supersample: render the panel at 2x, run the displacement filter, then
   * scale back to 0.5x so the browser smooths the downscale and anti-aliases
   * the wavy edge. Geometry below is doubled to compensate for the 0.5 scale. */
  left: 50%;
  top: 50%;
  width: 200%;
  height: 200%;
  transform: translate(-50%, -50%) scale(0.5);

  background-color: var(--theme-primary);
  border-radius: 4.4rem 5.8rem 4.8rem 6.2rem / 5.4rem 4.4rem 6rem 4.8rem;
  filter: var(--wobble-filter);
}
</style>
