<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import UiIcon from '@/components/ui-kit/icon.vue'
import UiOptionsPanel, { type OptionsPanelEntry } from '@/components/ui-kit/options-panel/index.vue'
import SectionHeader from '../section-header.vue'

type RoadmapItem = {
  key: string
  done: boolean
}

const { t } = useI18n()

const items: RoadmapItem[] = [
  { key: 'build-study-decks', done: true },
  { key: 'dark-mode', done: true },
  { key: 'mobile-support', done: true },
  { key: 'import-export', done: true },
  { key: 'card-audio', done: false },
  { key: 'community', done: false },
  { key: 'challenges', done: false },
  { key: 'collect-rewards', done: false },
  { key: 'paperclips-shop', done: false }
]

function itemFor(value: string) {
  return items.find((item) => item.key === value)!
}

const entries: OptionsPanelEntry[] = items.map((item) => ({
  value: item.key,
  label: t(`welcome-view.roadmap.item.${item.key}`)
}))
</script>

<template>
  <section
    data-testid="welcome-roadmap"
    data-palette="success"
    class="w-full bg-(--color-accent) flex justify-center"
  >
    <div
      data-testid="welcome-roadmap__panel"
      data-station="panel"
      class="w-full flex flex-col gap-14 items-center py-30 px-4 sm:px-16 bg-surface wave-top-[30px]"
    >
      <section-header
        :heading="t('welcome-view.roadmap.heading')"
        :subtitle="t('welcome-view.roadmap.subtitle')"
      />

      <ui-options-panel
        data-testid="welcome-roadmap__list"
        class="w-full max-w-200"
        :entries="entries"
        :interactive="false"
      >
        <template #leading="{ entry }">
          <span
            aria-hidden="true"
            class="flex shrink-0 items-center justify-center size-8 rounded-full"
            :class="
              itemFor(entry.value).done
                ? 'bg-(--color-accent) text-(--color-on-accent)'
                : 'border-3 border-dashed border-line'
            "
          >
            <ui-icon v-if="itemFor(entry.value).done" src="check" class="size-4.5" />
          </span>
        </template>

        <template #trailing="{ entry }">
          <span
            class="text-base"
            :class="itemFor(entry.value).done ? 'text-(--color-accent-text)' : 'text-ink-muted'"
          >
            {{
              itemFor(entry.value).done
                ? t('welcome-view.roadmap.done-label')
                : t('welcome-view.roadmap.upcoming-label')
            }}
          </span>
        </template>
      </ui-options-panel>
    </div>
  </section>
</template>
