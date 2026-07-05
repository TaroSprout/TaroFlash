<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'
import UiImage from '@/components/ui-kit/image.vue'
import UiWobbleBox from '@/components/ui-kit/wobble-box.vue'

type CommunityCalloutProps = {
  seeRoadmap: () => void
}

const { seeRoadmap } = defineProps<CommunityCalloutProps>()

const { t } = useI18n()
</script>

<template>
  <ui-wobble-box
    data-testid="community-callout"
    data-theme="blue-500"
    data-theme-dark="blue-650"
    class="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10 px-8 py-10 sm:px-12 mx-auto sm:mt-16"
  >
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
  </ui-wobble-box>
</template>
