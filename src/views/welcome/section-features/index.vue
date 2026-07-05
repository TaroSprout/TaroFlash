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

// Tablet and mobile render the cards as a 2-column grid; desktop as one row.
const GRID_COLUMNS = 2

// Every card starts on its cover and flips to front when its trigger fires.
const sides = ref<CardSide[]>(features.map(() => 'cover'))

const row = useTemplateRef<HTMLElement>('row')

let teardowns: (() => void)[] = []

// Desktop: single justified row that scroll-flips. Tablet and mobile: a 2×2
// grid so each row of two flips together on its own trigger.
const row_layout = computed(() => {
  if (width.value === 'desktop') return 'flex flex-wrap items-stretch justify-center gap-2'
  return 'grid grid-cols-[auto_auto] justify-center gap-2'
})

onMounted(buildReveals)

onBeforeUnmount(teardownAll)

function setSide(index: number, side: CardSide) {
  sides.value[index] = side
}

// Pair each ScrollTrigger's controlled card indices with the element whose scroll
// position gates them: desktop flips the whole row off the <ul>; tablet and
// mobile flip each grid row off its leading <li>, so both cards in a row flip
// together.
function revealGroups(): { trigger: Element; indices: number[] }[] {
  if (!row.value) return []
  if (width.value === 'desktop') return [{ trigger: row.value, indices: features.map((_, i) => i) }]

  const items = [...row.value.children] as HTMLElement[]
  const groups: { trigger: Element; indices: number[] }[] = []
  for (let start = 0; start < items.length; start += GRID_COLUMNS) {
    const indices = items.slice(start, start + GRID_COLUMNS).map((_, offset) => start + offset)
    groups.push({ trigger: items[start], indices })
  }
  return groups
}

function teardownAll() {
  teardowns.forEach((teardown) => teardown())
  teardowns = []
}

function buildReveals() {
  teardownAll()
  if (!row.value) return

  sides.value = features.map(() => 'cover')
  teardowns = revealGroups().map(({ trigger, indices }) => {
    const reveal = createFeatureReveal(trigger, indices, (index, active) =>
      setSide(index, active ? 'front' : 'cover')
    )
    return () => reveal.kill()
  })
}

watch(width, buildReveals, { flush: 'post' })
</script>

<template>
  <section
    data-testid="welcome-features"
    class="w-full bg-brown-100 dark:bg-grey-900 py-12 sm:py-32"
  >
    <div class="w-full max-w-(--page-width) mx-auto px-4 sm:px-16 flex flex-col gap-14">
      <section-header
        data-theme="brown-100"
        data-theme-dark="green-800"
        :heading="t('welcome-view.features.heading')"
        :subtitle="t('welcome-view.features.subtitle')"
      />

      <ul ref="row" data-testid="welcome-features__row" :class="row_layout">
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
