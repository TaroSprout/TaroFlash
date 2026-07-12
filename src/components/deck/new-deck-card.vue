<script setup lang="ts">
import Card from '@/components/card/index.vue'
import UiTappable from '@/components/ui-kit/tappable.vue'
import UiIcon from '@/components/ui-kit/icon.vue'
import { TYPE_SFX } from '@/sfx/config'
import { useI18n } from 'vue-i18n'

type CardSize = InstanceType<typeof Card>['$props']['size']

type NewDeckCardProps = {
  size?: CardSize
  loading?: boolean
}

const { size = 'base', loading = false } = defineProps<NewDeckCardProps>()

const emit = defineEmits<{ press: [e: MouseEvent] }>()

const { t } = useI18n()
</script>

<template>
  <ui-tappable
    as="div"
    data-testid="new-deck-card"
    :aria-label="t('dashboard.create-deck-button')"
    class="pointer-fine:hover:scale-102 data-[tap-active=true]:scale-101 pointer-coarse:data-[tap-active=true]:scale-105 pointer-fine:transition-transform duration-75 relative cursor-pointer h-min touch-manipulation"
    :class="loading && 'opacity-50 pointer-events-none'"
    :sfx="{ hover: TYPE_SFX, press: 'snappy_button_5' }"
    @tap="emit('press', $event)"
  >
    <card :size="size" side="front">
      <template #front>
        <div
          data-testid="new-deck-card__outline"
          class="h-full w-full rounded-(--face-radius) bg-brown-200 dark:bg-stone-900 flex flex-col items-center justify-center gap-2 text-brown-500"
        >
          <ui-icon src="add" class="size-12" />
          <span class="text-lg text-center">{{ t('dashboard.new-deck-card.label') }}</span>
        </div>
      </template>
    </card>
  </ui-tappable>
</template>
