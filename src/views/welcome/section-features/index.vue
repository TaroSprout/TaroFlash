<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import SectionHeader from '../section-header.vue'
import FeatureCard from './feature-card.vue'

type Feature = {
  key: string
  icon: string
  accent: string
}

const { t } = useI18n()

const features: Feature[] = [
  { key: 'experience', icon: 'paint-brush', accent: 'var(--color-purple-500)' },
  { key: 'mobile', icon: 'apps', accent: 'var(--color-blue-500)' },
  { key: 'scheduling', icon: 'schedule', accent: 'var(--color-pink-500)' },
  { key: 'portable', icon: 'list', accent: 'var(--color-orange-700)' }
]
</script>

<template>
  <section data-testid="welcome-features" class="w-full bg-green-500 dark:bg-green-800 py-30">
    <div class="w-full max-w-(--page-width) mx-auto px-4 sm:px-16 flex flex-col gap-14">
      <section-header
        data-theme="green-500"
        data-theme-dark="green-800"
        :heading="t('welcome-view.features.heading')"
        :subtitle="t('welcome-view.features.subtitle')"
      />

      <ul
        data-testid="welcome-features__row"
        class="flex flex-wrap items-stretch justify-center gap-2"
      >
        <li
          v-for="feature in features"
          :key="feature.key"
          :data-testid="`welcome-features__card-${feature.key}`"
        >
          <feature-card :feature_key="feature.key" :icon="feature.icon" :accent="feature.accent" />
        </li>
      </ul>
    </div>
  </section>
</template>
