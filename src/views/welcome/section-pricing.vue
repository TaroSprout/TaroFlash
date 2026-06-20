<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { PLANS } from '@/config/plans'
import UiIcon from '@/components/ui-kit/icon.vue'
import UiButton from '@/components/ui-kit/button.vue'
import UiImage from '@/components/ui-kit/image.vue'
import SectionHeader from './section-header.vue'

type PlanFeature = {
  key: string
  ok: boolean
  count?: number | null
}

type Plan = {
  key: 'free' | 'full'
  theme: string
  accent: string
  featured: boolean
  payment: boolean
  features: PlanFeature[]
}

type PricingProps = {
  signup: (payment?: boolean) => void
}

const { signup } = defineProps<PricingProps>()

const { t } = useI18n()

const plans: Plan[] = [
  {
    key: 'free',
    theme: 'brown-700',
    accent: 'var(--color-brown-500)',
    featured: false,
    payment: false,
    features: [
      { key: 'decks', ok: true, count: PLANS.free.deckLimit },
      { key: 'cards', ok: true, count: PLANS.free.cardsPerDeckLimit },
      { key: 'deck-images', ok: true },
      { key: 'no-card-images', ok: false }
    ]
  },
  {
    key: 'full',
    theme: 'blue-500',
    accent: 'var(--color-blue-500)',
    featured: true,
    payment: true,
    features: [
      { key: 'decks', ok: true },
      { key: 'cards', ok: true },
      { key: 'deck-images', ok: true },
      { key: 'card-images', ok: true },
      { key: 'cancel', ok: true }
    ]
  }
]

function featureLabel(plan: Plan, feature: PlanFeature) {
  const key = `welcome-view.pricing.${plan.key}.${feature.key}`
  if (feature.count == null) return t(key)
  return t(key, { count: feature.count })
}
</script>

<template>
  <section data-testid="welcome-pricing" class="w-full bg-brown-200 dark:bg-grey-800 py-30">
    <div class="w-full max-w-(--page-width) mx-auto px-4 sm:px-16 flex flex-col gap-14">
      <section-header
        :eyebrow="t('welcome-view.pricing.eyebrow')"
        :heading="t('welcome-view.pricing.heading')"
        :subtitle="t('welcome-view.pricing.subtitle')"
      />

      <div
        data-testid="welcome-pricing__grid"
        class="grid grid-cols-1 md:grid-cols-2 gap-7 items-stretch"
      >
        <article
          v-for="plan in plans"
          :key="plan.key"
          :data-testid="`welcome-pricing__plan-${plan.key}`"
          :data-featured="plan.featured || undefined"
          :style="{ '--accent': plan.accent }"
          class="relative flex flex-col gap-4 bg-brown-50 dark:bg-stone-700 rounded-7 p-9 pt-10 overflow-hidden"
        >
          <span
            aria-hidden="true"
            class="absolute top-0 inset-x-0 bg-(--accent)"
            :class="plan.featured ? 'h-2' : 'h-1'"
          />

          <ui-image
            v-if="plan.featured"
            src="washi-tape"
            aria-hidden="true"
            class="absolute -top-3 right-7 w-28 rotate-6"
          />

          <div class="flex flex-col gap-1">
            <p class="text-base uppercase tracking-widest text-(--accent)">
              {{ t(`welcome-view.pricing.${plan.key}.name`) }}
            </p>
            <h3 class="text-2xl text-brown-700 dark:text-brown-100">
              {{ t(`welcome-view.pricing.${plan.key}.tagline`) }}
            </h3>
          </div>

          <div class="flex items-baseline gap-1.5 border-b border-dashed border-brown-300 pb-4">
            <span class="text-6xl text-brown-700 dark:text-brown-100">
              {{ t(`welcome-view.pricing.${plan.key}.price`) }}
            </span>
            <span class="text-base text-brown-500">
              {{ t(`welcome-view.pricing.${plan.key}.price-detail`) }}
            </span>
          </div>

          <ul class="flex flex-col gap-3 flex-1">
            <li
              v-for="feature in plan.features"
              :key="feature.key"
              class="flex items-start gap-3 text-base text-brown-700 dark:text-brown-100"
            >
              <span
                aria-hidden="true"
                class="flex shrink-0 items-center justify-center size-5.5 rounded-full mt-0.5"
                :class="
                  feature.ok
                    ? 'bg-(--accent) text-brown-100'
                    : 'border-2 border-dashed border-brown-300'
                "
              >
                <ui-icon v-if="feature.ok" src="check" class="size-3" />
              </span>
              <span :class="{ 'opacity-55': !feature.ok }">{{ featureLabel(plan, feature) }}</span>
            </li>
          </ul>

          <ui-button
            size="lg"
            :data-theme="plan.theme"
            :variant="plan.featured ? 'solid' : 'outline'"
            full-width
            icon-right="arrow-forward"
            @press="signup(plan.payment)"
          >
            {{ t(`welcome-view.pricing.${plan.key}.cta`) }}
          </ui-button>
        </article>
      </div>

      <div
        data-testid="welcome-pricing__footnote"
        class="flex items-center gap-5 bg-brown-50 dark:bg-stone-700 rounded-5.5 px-7 py-5"
      >
        <span aria-hidden="true" class="text-4xl text-orange-700 leading-none">✿</span>
        <p class="text-base leading-relaxed text-brown-700 dark:text-brown-100">
          {{ t('welcome-view.pricing.footnote') }}
        </p>
      </div>
    </div>
  </section>
</template>
