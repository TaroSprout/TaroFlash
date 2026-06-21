<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import UiIcon from '@/components/ui-kit/icon.vue'
import Card from '@/components/card/index.vue'

type FeatureCardProps = {
  feature_key: string
  icon: string
  accent: string
}

const { feature_key, icon, accent } = defineProps<FeatureCardProps>()

const { t } = useI18n()
</script>

<template>
  <card size="lg" :style="{ '--accent': accent }">
    <template #front>
      <div
        data-testid="feature-card__face"
        class="grid grid-rows-[56px_2rem_100px] content-center gap-2 size-full rounded-(--face-radius) bg-white dark:bg-stone-700 px-8 text-center"
      >
        <ui-icon
          data-testid="feature-card__icon"
          :src="icon"
          class="size-10 justify-self-center text-(--accent)"
        />

        <h3 class="text-2xl text-brown-700 dark:text-brown-100">
          {{ t(`welcome-view.features.${feature_key}.heading`) }}
        </h3>

        <p class="text-base leading-relaxed text-brown-500 dark:text-brown-300">
          {{ t(`welcome-view.features.${feature_key}.description`) }}
        </p>
      </div>
    </template>
  </card>
</template>
