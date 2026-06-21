<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import SectionHeader from '../section-header.vue'
import FeatureCard from './feature-card.vue'

type Feature = {
  key: string
  icon: string
  accent: string
  accent_dark: string
}

const { t } = useI18n()

const features: Feature[] = [
  {
    key: 'experience',
    icon: 'paint-brush',
    accent: 'var(--color-purple-500)',
    accent_dark: 'var(--color-purple-700)'
  },
  {
    key: 'mobile',
    icon: 'mobile-phone',
    accent: 'var(--color-blue-500)',
    accent_dark: 'var(--color-blue-650)'
  },
  {
    key: 'scheduling',
    icon: 'clock',
    accent: 'var(--color-pink-500)',
    accent_dark: 'var(--color-pink-700)'
  },
  {
    key: 'upcoming',
    icon: 'shooting-star',
    accent: 'var(--color-yellow-500)',
    accent_dark: 'var(--color-yellow-700)'
  }
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
          <feature-card
            :feature_key="feature.key"
            :icon="feature.icon"
            :accent="feature.accent"
            :accent_dark="feature.accent_dark"
          />
        </li>
      </ul>
    </div>
  </section>
</template>
