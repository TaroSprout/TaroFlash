<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import UiIcon from '@/components/ui-kit/icon.vue'
import SectionHeader from './section-header.vue'

type Feature = {
  key: string
  icon: string
  accent: string
}

const { t } = useI18n()

const features: Feature[] = [
  { key: 'editor', icon: 'edit', accent: 'var(--color-blue-500)' },
  { key: 'study', icon: 'book', accent: 'var(--color-green-500)' },
  { key: 'cards', icon: 'teeny-cards', accent: 'var(--color-purple-500)' },
  { key: 'scheduling', icon: 'schedule', accent: 'var(--color-pink-500)' },
  { key: 'portable', icon: 'list', accent: 'var(--color-orange-700)' },
  { key: 'mobile', icon: 'apps', accent: 'var(--color-brown-700)' }
]
</script>

<template>
  <section data-testid="welcome-features" class="w-full bg-brown-200 dark:bg-grey-800 py-30 px-7.5">
    <div class="max-w-(--page-width) mx-auto flex flex-col gap-14">
      <section-header
        :eyebrow="t('welcome-view.features.eyebrow')"
        :heading="t('welcome-view.features.heading')"
      />

      <ul
        data-testid="welcome-features__grid"
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        <li
          v-for="feature in features"
          :key="feature.key"
          :data-testid="`welcome-features__card-${feature.key}`"
          :style="{ '--accent': feature.accent }"
          class="relative flex flex-col gap-3 bg-brown-50 dark:bg-stone-700 rounded-5.5 p-7 pt-8 overflow-hidden"
        >
          <span aria-hidden="true" class="absolute top-0 inset-x-0 h-1 bg-(--accent)" />

          <span
            class="flex items-center justify-center size-11 rounded-3 bg-(--accent) text-brown-100"
          >
            <ui-icon :src="feature.icon" class="size-6" />
          </span>

          <h3 class="text-2xl text-(--accent)">
            {{ t(`welcome-view.features.${feature.key}.heading`) }}
          </h3>

          <p class="text-base leading-relaxed text-brown-700 dark:text-brown-100">
            {{ t(`welcome-view.features.${feature.key}.description`) }}
          </p>
        </li>
      </ul>
    </div>
  </section>
</template>
