<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import UiIcon from '@/components/ui-kit/icon.vue'
import UiImage from '@/components/ui-kit/image.vue'
import SectionHeader from './section-header.vue'

type RoadmapItem = {
  key: string
  done: boolean
}

const { t } = useI18n()

const items: RoadmapItem[] = [
  { key: 'create-study', done: true },
  { key: 'dark-mode', done: true },
  { key: 'card-audio', done: false },
  { key: 'community', done: false },
  { key: 'audio-reader', done: false },
  { key: 'daily-challenges', done: false },
  { key: 'metrics-rewards', done: false },
  { key: 'shop', done: false },
  { key: 'powerups', done: false }
]
</script>

<template>
  <section data-testid="welcome-roadmap" class="w-full bg-brown-100 dark:bg-grey-900 py-30">
    <div class="w-full max-w-(--page-width) mx-auto px-4 sm:px-16 flex flex-col gap-14">
      <section-header
        :heading="t('welcome-view.roadmap.heading')"
        :subtitle="t('welcome-view.roadmap.subtitle')"
      />

      <div class="relative bg-brown-50 dark:bg-stone-700 rounded-7 p-7">
        <ui-image
          src="washi-tape"
          aria-hidden="true"
          class="absolute -top-3.5 left-1/2 -translate-x-1/2 w-32 -rotate-2"
        />

        <ul data-testid="welcome-roadmap__list" class="flex flex-col">
          <li
            v-for="(item, index) in items"
            :key="item.key"
            :data-testid="`welcome-roadmap__item-${item.key}`"
            class="flex items-center gap-4 py-3.5"
            :class="{ 'border-b border-dashed border-brown-300': index < items.length - 1 }"
          >
            <span
              aria-hidden="true"
              class="flex shrink-0 items-center justify-center size-8 rounded-full"
              :class="
                item.done
                  ? 'bg-green-500 text-brown-100'
                  : 'border-3 border-dashed border-brown-500'
              "
            >
              <ui-icon v-if="item.done" src="check" class="size-4.5" />
            </span>

            <span
              class="flex-1 text-lg text-brown-700 dark:text-brown-100"
              :class="{ 'line-through opacity-70': item.done }"
            >
              {{ t(`welcome-view.roadmap.item.${item.key}`) }}
            </span>

            <span class="text-base" :class="item.done ? 'text-green-600' : 'text-brown-500'">
              {{
                item.done
                  ? t('welcome-view.roadmap.done-label')
                  : t('welcome-view.roadmap.upcoming-label')
              }}
            </span>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>
