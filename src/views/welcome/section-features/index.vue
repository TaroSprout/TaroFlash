<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { createFeatureReveal } from '@/utils/animations/welcome/feature-reveal'
import { createStackReveal } from '@/utils/animations/welcome/stack-reveal'
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

// Every card starts on its cover and flips to front when its trigger fires.
const sides = ref<CardSide[]>(features.map(() => 'cover'))

// Mobile: index of the active card — the one lifted to the top of the deck and
// flipped to front. Only one at a time; -1 before the first trigger and once
// scrolled past the last, so the ends of the section show the resting stack.
const activeIndex = ref(-1)

const row = useTemplateRef<HTMLElement>('row')

let teardowns: (() => void)[] = []

// Desktop: single justified row that scroll-flips. Tablet: a 2×2 grid so four
// cards never break to an awkward 3+1. Mobile: an overlapped column that reveals
// on scroll (overlap + reveal are in <style>, keyed off data-stack/data-reveal).
const row_layout = computed(() => {
  if (width.value === 'desktop') return 'flex flex-wrap items-stretch justify-center gap-2'
  if (width.value === 'tablet') return 'grid grid-cols-[auto_auto] justify-center gap-2'
  return 'flex flex-col items-center'
})

onMounted(buildReveals)

onBeforeUnmount(teardownAll)

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

function teardownAll() {
  teardowns.forEach((teardown) => teardown())
  teardowns = []
}

// Mobile: cards sit in a static overlapped deck. Scrolling cycles which card is
// active; the active card lifts to the top of the z-stack (CSS, data-active) and
// flips to front while every other card rests on its cover. A trailing trigger
// past the last card clears the active state so the deck resets at the bottom.
function revealStack(): () => void {
  if (!row.value) return () => {}

  const items = [...row.value.children] as HTMLElement[]
  row.value.style.setProperty('--card-h', `${items[0].offsetHeight}px`)
  activeIndex.value = -1
  sides.value = features.map(() => 'cover')

  function reachCard(index: number, entering: boolean) {
    const next = entering ? index : index - 1
    activeIndex.value = next
    sides.value = features.map((_, i) => (i === next ? 'front' : 'cover'))
  }

  const teardownReveal = createStackReveal(row.value, features.length + 1, reachCard)

  return () => {
    teardownReveal()
    row.value?.style.removeProperty('--card-h')
  }
}

function buildReveals() {
  teardownAll()
  if (!row.value) return

  if (width.value === 'mobile') {
    teardowns = [revealStack()]
    return
  }

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

      <ul
        ref="row"
        data-testid="welcome-features__row"
        :class="row_layout"
        :data-stack="width === 'mobile' || undefined"
      >
        <li
          v-for="(feature, index) in features"
          :key="feature.key"
          :data-testid="`welcome-features__card-${feature.key}`"
          :data-active="index === activeIndex"
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

<style scoped>
/* Mobile: overlap the cards into a deck, each peeking --stack-peek above the next
 * (--card-h is measured and set on the row in JS). The active card "comes forward"
 * via a plain 2D scale, not a 3D translateZ: a 3D transform on the li (which isn't
 * preserve-3d) flattens then re-projects the card's own flip, which both clips the
 * flip and stutters on mobile. A scale reads almost identically, stays 2D, and
 * lets the flip render in the card's own perspective. z-index carries paint order. */
[data-stack] > li {
  transition: transform 0.4s ease;
  transform: scale(1);
}

[data-stack] > li:not(:first-child) {
  margin-top: calc(var(--stack-peek, 50px) - var(--card-h, 0px));
}

[data-stack] > li[data-active='true'] {
  z-index: 10;
  transform: scale(var(--stack-lift, 1.08));
}
</style>
