<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { createFeatureReveal } from '@/utils/animations/welcome/feature-reveal'
import { useWelcomeWidth } from '../welcome-layout'
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

type SectionFeaturesProps = {
  seeRoadmap: () => void
}

const { seeRoadmap } = defineProps<SectionFeaturesProps>()

const { t } = useI18n()
const width = useWelcomeWidth()

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

// Tablet renders the cards as a 2-column grid; desktop as one row.
const TABLET_COLUMNS = 2

// Desktop and tablet start covered and flip on scroll; mobile shows fronts
// directly (its reveal is handled later).
const sides = ref<CardSide[]>(features.map(() => (width.value === 'mobile' ? 'front' : 'cover')))

const row = useTemplateRef<HTMLElement>('row')

let reveals: ScrollTrigger[] = []

// Desktop: single justified row that scroll-flips. Tablet: a 2×2 grid so four
// cards never break to an awkward 3+1. Mobile: a single stacked column.
const row_layout = computed(() => {
  if (width.value === 'desktop') return 'flex flex-wrap items-stretch justify-center'
  if (width.value === 'tablet') return 'grid grid-cols-[auto_auto] justify-center'
  return 'flex flex-col items-center'
})

onMounted(buildReveals)

onBeforeUnmount(() => reveals.forEach((reveal) => reveal.kill()))

function setSide(index: number, side: CardSide) {
  sides.value[index] = side
}

// Pair each ScrollTrigger's controlled card indices with the element whose scroll
// position gates them: desktop flips the whole row off the <ul>; tablet flips
// each grid row off its leading <li>, so both cards in a row flip together.
function revealGroups(): { trigger: Element; indices: number[] }[] {
  if (!row.value) return []
  if (width.value === 'desktop') return [{ trigger: row.value, indices: features.map((_, i) => i) }]

  const items = [...row.value.children] as HTMLElement[]
  const groups: { trigger: Element; indices: number[] }[] = []
  for (let start = 0; start < items.length; start += TABLET_COLUMNS) {
    const indices = items.slice(start, start + TABLET_COLUMNS).map((_, offset) => start + offset)
    groups.push({ trigger: items[start], indices })
  }
  return groups
}

function buildReveals() {
  reveals.forEach((reveal) => reveal.kill())
  reveals = []

  if (width.value === 'mobile') {
    sides.value = features.map(() => 'front')
    return
  }

  sides.value = features.map(() => 'cover')
  reveals = revealGroups().map(({ trigger, indices }) =>
    createFeatureReveal(trigger, indices, setSide)
  )
}

watch(width, buildReveals, { flush: 'post' })
</script>

<template>
  <section data-testid="welcome-features" class="w-full bg-brown-100 dark:bg-grey-900 py-32">
    <div class="w-full max-w-(--page-width) mx-auto px-4 sm:px-16 flex flex-col gap-14">
      <section-header
        data-theme="brown-100"
        data-theme-dark="green-800"
        :heading="t('welcome-view.features.heading')"
        :subtitle="t('welcome-view.features.subtitle')"
      />

      <ul ref="row" data-testid="welcome-features__row" class="gap-2" :class="row_layout">
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

      <community-callout :see-roadmap="seeRoadmap" />
    </div>
  </section>
</template>
