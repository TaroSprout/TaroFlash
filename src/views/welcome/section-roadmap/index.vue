<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import UiIcon from '@/components/ui-kit/icon.vue'
import GroupedList from '@/components/layout-kit/grouped-list.vue'
import SectionHeader from '../section-header.vue'

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
  <section
    data-testid="welcome-roadmap"
    data-theme="brown-100"
    data-theme-dark="grey-900"
    class="w-full bg-green-500 dark:bg-green-800 flex justify-center"
  >
    <div
      class="w-full flex flex-col gap-14 items-center py-30 px-4 sm:px-16 bg-brown-200 wave-top-[30px]"
    >
      <section-header
        :heading="t('welcome-view.roadmap.heading')"
        :subtitle="t('welcome-view.roadmap.subtitle')"
      />

      <grouped-list
        data-testid="welcome-roadmap__list"
        data-theme="brown-50"
        class="w-full max-w-200"
      >
        <div
          v-for="item in items"
          :key="item.key"
          :data-testid="`welcome-roadmap__item-${item.key}`"
          class="flex items-center gap-3 py-4 px-6"
        >
          <span
            aria-hidden="true"
            class="flex shrink-0 items-center justify-center size-8 rounded-full"
            :class="
              item.done ? 'bg-green-500 text-brown-100' : 'border-3 border-dashed border-brown-500'
            "
          >
            <ui-icon v-if="item.done" src="check" class="size-4.5" />
          </span>

          <span
            class="flex-1 text-lg text-(--theme-on-primary)"
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
        </div>
      </grouped-list>
    </div>
  </section>
</template>
