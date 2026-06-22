<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMatchMedia } from '@/composables/ui/media-query'
import { createFeatureReveal } from '@/utils/animations/welcome/feature-reveal'
import SectionHeader from '../section-header.vue'
import CommunityCallout from './community-callout.vue'
import FeatureCard from './feature-card.vue'

type Feature = {
  key: string
  icon: string
  accent: string
  accent_dark: string
  cover: DeckCover
}

const { t } = useI18n()
const is_desktop = useMatchMedia('w>=md')

const features: Feature[] = [
  {
    key: 'experience',
    icon: 'paint-brush',
    accent: 'var(--color-purple-500)',
    accent_dark: 'var(--color-purple-700)',
    cover: {
      theme: 'purple-500',
      theme_dark: 'purple-700',
      pattern: 'diagonal-stripes',
      icon: 'paint-brush'
    }
  },
  {
    key: 'mobile',
    icon: 'mobile-phone',
    accent: 'var(--color-green-500)',
    accent_dark: 'var(--color-green-800)',
    cover: {
      theme: 'green-500',
      theme_dark: 'green-800',
      pattern: 'squiggle',
      icon: 'mobile-phone'
    }
  },
  {
    key: 'scheduling',
    icon: 'clock',
    accent: 'var(--color-pink-500)',
    accent_dark: 'var(--color-pink-700)',
    cover: { theme: 'pink-500', theme_dark: 'pink-700', pattern: 'aztec', icon: 'clock' }
  },
  {
    key: 'upcoming',
    icon: 'shooting-star',
    accent: 'var(--color-yellow-500)',
    accent_dark: 'var(--color-yellow-700)',
    cover: {
      theme: 'yellow-500',
      theme_dark: 'yellow-700',
      pattern: 'bank-note',
      icon: 'shooting-star'
    }
  }
]

// Desktop reveals each card cover→front on scroll; mobile shows the front
// directly (its reveal is handled later).
const sides = ref<CardSide[]>(features.map(() => (is_desktop.value ? 'cover' : 'front')))

const row = useTemplateRef<HTMLElement>('row')

let reveal: ScrollTrigger | undefined

onMounted(() => {
  if (!is_desktop.value || !row.value) return
  reveal = createFeatureReveal(row.value, features.length, (index, side) => {
    sides.value[index] = side
  })
})

onBeforeUnmount(() => reveal?.kill())
</script>

<template>
  <section data-testid="welcome-features" class="w-full bg-brown-100 dark:bg-grey-900 py-30">
    <div class="w-full max-w-(--page-width) mx-auto px-4 sm:px-16 flex flex-col gap-14">
      <section-header
        data-theme="brown-100"
        data-theme-dark="green-800"
        :heading="t('welcome-view.features.heading')"
        :subtitle="t('welcome-view.features.subtitle')"
      />

      <ul
        ref="row"
        data-testid="welcome-features__row"
        class="flex flex-wrap items-stretch justify-center gap-2"
      >
        <li
          v-for="(feature, index) in features"
          :key="feature.key"
          :data-testid="`welcome-features__card-${feature.key}`"
        >
          <feature-card
            :feature_key="feature.key"
            :icon="feature.icon"
            :accent="feature.accent"
            :accent_dark="feature.accent_dark"
            :cover="feature.cover"
            :side="sides[index]"
          />
        </li>
      </ul>

      <community-callout />
    </div>
  </section>
</template>
