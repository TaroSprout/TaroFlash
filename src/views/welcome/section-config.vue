<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Card from '@/components/card/index.vue'
import UiIcon from '@/components/ui-kit/icon.vue'
import SectionHeader from './section-header.vue'

const { t } = useI18n()

const cover_config: DeckCover = {
  theme: 'orange-700',
  theme_dark: 'orange-700',
  pattern: 'diagonal-stripes',
  icon: 'card-deck'
}

const swatches = [
  'var(--color-orange-700)',
  'var(--color-blue-500)',
  'var(--color-green-500)',
  'var(--color-purple-500)',
  'var(--color-pink-500)'
]
</script>

<template>
  <section
    data-testid="welcome-config"
    class="w-full bg-brown-100 dark:bg-grey-900 py-30 bgx-dot-grid bgx-size-18 bgx-opacity-6"
  >
    <div class="w-full max-w-(--page-width) mx-auto px-4 sm:px-16 flex flex-col gap-16">
      <section-header
        :eyebrow="t('welcome-view.config.eyebrow')"
        :heading="t('welcome-view.config.heading')"
        :subtitle="t('welcome-view.config.subtitle')"
      />

      <div data-testid="welcome-config__grid" class="grid grid-cols-1 lg:grid-cols-3 gap-7">
        <article
          data-testid="welcome-config__card-cover"
          style="--accent: var(--color-orange-700)"
          class="relative flex flex-col gap-5 bg-brown-50 dark:bg-stone-700 rounded-7 p-7 pt-8 overflow-hidden"
        >
          <span
            aria-hidden="true"
            class="absolute top-0 left-7 h-3.5 w-17 rounded-b-1.5 bg-(--accent)"
          />

          <div
            data-testid="welcome-config__visual-cover"
            class="flex items-center justify-center gap-4 h-45 rounded-4.5 bg-brown-200 dark:bg-grey-800"
          >
            <card
              side="cover"
              size="2xs"
              :cover_config="cover_config"
              class="-rotate-4 drop-shadow-sm"
            />

            <div class="grid grid-cols-2 gap-1.5 p-2.5 rounded-3.5 bg-brown-100 dark:bg-grey-900">
              <span
                v-for="(swatch, index) in swatches"
                :key="index"
                :style="{ background: swatch }"
                class="size-5.5 rounded-2 outline-2 outline-offset-1"
                :class="index === 0 ? 'outline-brown-700' : 'outline-transparent'"
              />
            </div>
          </div>

          <div class="flex flex-col gap-2">
            <h3 class="text-2xl text-(--accent)">{{ t('welcome-view.config.cover.heading') }}</h3>
            <p class="text-base leading-relaxed text-brown-700 dark:text-brown-100">
              {{ t('welcome-view.config.cover.description') }}
            </p>
          </div>
        </article>

        <article
          data-testid="welcome-config__card-layout"
          style="--accent: var(--color-purple-500)"
          class="relative flex flex-col gap-5 bg-brown-50 dark:bg-stone-700 rounded-7 p-7 pt-8 overflow-hidden"
        >
          <span
            aria-hidden="true"
            class="absolute top-0 left-7 h-3.5 w-17 rounded-b-1.5 bg-(--accent)"
          />

          <div
            data-testid="welcome-config__visual-layout"
            class="flex items-center justify-center h-45 rounded-4.5 bg-brown-200 dark:bg-grey-800"
          >
            <div
              class="relative flex items-center justify-center size-28 rounded-3.5 bg-brown-100 dark:bg-grey-900"
            >
              <ui-icon src="text-field" class="size-9 text-(--accent)" />
              <span
                class="absolute inset-y-3 left-1/2 border-l border-dashed border-(--accent) opacity-50"
              />
              <span
                v-for="corner in [
                  'top-2 left-2',
                  'top-2 right-2',
                  'bottom-2 left-2',
                  'bottom-2 right-2'
                ]"
                :key="corner"
                :class="corner"
                class="absolute size-2 rounded-1 bg-(--accent)"
              />
            </div>
          </div>

          <div class="flex flex-col gap-2">
            <h3 class="text-2xl text-(--accent)">{{ t('welcome-view.config.layout.heading') }}</h3>
            <p class="text-base leading-relaxed text-brown-700 dark:text-brown-100">
              {{ t('welcome-view.config.layout.description') }}
            </p>
          </div>
        </article>

        <article
          data-testid="welcome-config__card-scheduling"
          style="--accent: var(--color-blue-500)"
          class="relative flex flex-col gap-5 bg-brown-50 dark:bg-stone-700 rounded-7 p-7 pt-8 overflow-hidden"
        >
          <span
            aria-hidden="true"
            class="absolute top-0 left-7 h-3.5 w-17 rounded-b-1.5 bg-(--accent)"
          />

          <div
            data-testid="welcome-config__visual-scheduling"
            class="flex items-center justify-center h-45 rounded-4.5 bg-brown-200 dark:bg-grey-800 p-5"
          >
            <svg
              viewBox="0 0 100 44"
              aria-hidden="true"
              class="w-full h-full text-(--accent)"
              fill="none"
            >
              <line
                x1="0"
                y1="11"
                x2="100"
                y2="11"
                stroke="currentColor"
                stroke-dasharray="1 3"
                stroke-width="0.4"
                opacity="0.4"
              />
              <line
                x1="0"
                y1="22"
                x2="100"
                y2="22"
                stroke="currentColor"
                stroke-dasharray="1 3"
                stroke-width="0.4"
                opacity="0.4"
              />
              <line
                x1="0"
                y1="33"
                x2="100"
                y2="33"
                stroke="currentColor"
                stroke-dasharray="1 3"
                stroke-width="0.4"
                opacity="0.4"
              />
              <path
                d="M 0 6 Q 15 10 22 18 L 22 10 Q 40 12 48 22 L 48 14 Q 70 17 80 28 L 80 20 Q 92 22 100 30"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linejoin="round"
              />
              <circle cx="22" cy="10" r="2" fill="var(--color-orange-700)" />
              <circle cx="48" cy="14" r="2" fill="var(--color-orange-700)" />
              <circle cx="80" cy="20" r="2" fill="var(--color-orange-700)" />
            </svg>
          </div>

          <div class="flex flex-col gap-2">
            <h3 class="text-2xl text-(--accent)">
              {{ t('welcome-view.config.scheduling.heading') }}
            </h3>
            <p class="text-base leading-relaxed text-brown-700 dark:text-brown-100">
              {{ t('welcome-view.config.scheduling.description') }}
            </p>
          </div>
        </article>
      </div>

      <p
        data-testid="welcome-config__footnote"
        class="max-w-160 mx-auto text-center text-base leading-relaxed text-brown-500"
      >
        {{ t('welcome-view.config.footnote') }}
      </p>
    </div>
  </section>
</template>
