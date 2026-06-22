<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'
import UiImage from '@/components/ui-kit/image.vue'

type CommunityCalloutProps = {
  seeRoadmap: () => void
}

const { seeRoadmap } = defineProps<CommunityCalloutProps>()

const { t } = useI18n()
</script>

<template>
  <div
    data-testid="community-callout"
    data-theme="green-500"
    class="community-callout relative isolate flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10 px-8 py-10 sm:px-12 mx-auto mt-16"
  >
    <svg width="0" height="0" class="absolute" aria-hidden="true">
      <filter id="community-callout-wobble">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.0055"
          numOctaves="1"
          seed="7"
          result="noise"
        />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="14" />
      </filter>
    </svg>

    <ui-image
      data-testid="community-callout__image"
      src="feedback-hover"
      size="xl"
      class="relative shrink-0"
    />

    <div
      data-testid="community-callout__copy"
      class="relative flex flex-col gap-4 text-center sm:text-left"
    >
      <div data-testid="community-callout__text" class="flex flex-col">
        <h3 class="text-3xl text-(--theme-on-primary)">
          {{ t('welcome-view.features.callout.heading') }}
        </h3>

        <p class="text-lg leading-relaxed text-(--theme-neutral)">
          {{ t('welcome-view.features.callout.description') }}
        </p>
      </div>

      <ui-button
        data-testid="community-callout__roadmap-link"
        inverted
        size="sm"
        icon-left="arrow-down"
        class="self-center sm:self-start"
        :sfx="{ press: 'snappy_button_5' }"
        @press="seeRoadmap()"
      >
        {{ t('welcome-view.features.callout.roadmap-link') }}
      </ui-button>
    </div>
  </div>
</template>

<style scoped>
/* The background lives on a pseudo-element so the displacement filter wobbles
 * only the panel's edges — the text and image above it stay crisp. Uneven
 * corner radii plus the SVG turbulence give a soft, hand-drawn, mis-shapen look. */
.community-callout::before {
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
  filter: url('#community-callout-wobble');
}
</style>
