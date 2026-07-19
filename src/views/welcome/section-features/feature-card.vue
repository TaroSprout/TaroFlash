<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import UiIcon from '@/components/ui-kit/icon.vue'
import Card from '@/components/card/index.vue'
import { useWelcomeWidth } from '../welcome-layout'

type FeatureCardProps = {
  feature_key: string
  icon: string
  accent: string
  accent_dark: string
  cover: DeckCover
  side?: CardSide
}

type FeatureCardTier = 'sm' | 'lg' | 'xl'

const {
  feature_key,
  icon,
  accent,
  accent_dark,
  cover,
  side = 'front'
} = defineProps<FeatureCardProps>()

const { t } = useI18n()
const width = useWelcomeWidth()

const size = computed<FeatureCardTier>(() => {
  if (width.value === 'desktop') return 'lg'
  return width.value === 'tablet' ? 'xl' : 'sm'
})

// Card width + icon/heading/description scale with the tier — xl (tablet)
// reads biggest since the card itself is largest there, lg (desktop) and sm
// (mobile) step down from it.
const CARD_WIDTH: Record<FeatureCardTier, string> = {
  xl: 'w-(--card-w-full)',
  lg: 'w-(--card-w-md)',
  sm: 'w-(--card-w-xs)'
}
const FACE_ROWS: Record<FeatureCardTier, string> = {
  xl: 'grid-rows-[70px_2.5rem_88px] gap-2',
  lg: 'grid-rows-[56px_2rem_70px] gap-2',
  sm: 'grid-rows-[30px_1.5rem_80px] gap-3'
}
const ICON_SIZE: Record<FeatureCardTier, string> = { xl: 'size-12', lg: 'size-10', sm: 'size-8' }
const HEADING_SIZE: Record<FeatureCardTier, string> = {
  xl: 'text-2xl',
  lg: 'text-2xl',
  sm: 'text-lg'
}
const DESCRIPTION_SIZE: Record<FeatureCardTier, string> = {
  xl: 'text-lg',
  lg: 'text-base',
  sm: 'text-base'
}

const card_width = computed(() => CARD_WIDTH[size.value])
const face_rows = computed(() => FACE_ROWS[size.value])
const icon_size = computed(() => ICON_SIZE[size.value])
const heading_size = computed(() => HEADING_SIZE[size.value])
const description_size = computed(() => DESCRIPTION_SIZE[size.value])
</script>

<template>
  <card
    :class="card_width"
    :side="side"
    :cover_config="cover"
    :style="{ '--accent': accent, '--accent-dark': accent_dark }"
  >
    <template #front>
      <div
        data-testid="feature-card__face"
        :data-size-tier="size"
        class="grid content-center size-full rounded-(--face-radius) p-(--face-padding) bg-white dark:bg-stone-700 text-center"
        :class="face_rows"
      >
        <ui-icon
          data-testid="feature-card__icon"
          :src="icon"
          class="justify-self-center text-(--accent) dark:text-(--accent-dark)"
          :class="icon_size"
        />

        <h3 class="text-brown-700 dark:text-brown-100" :class="heading_size">
          {{ t(`welcome-view.features.${feature_key}.heading`) }}
        </h3>

        <p class="leading-relaxed text-brown-500 dark:text-brown-300" :class="description_size">
          {{ t(`welcome-view.features.${feature_key}.description`) }}
        </p>
      </div>
    </template>
  </card>
</template>
