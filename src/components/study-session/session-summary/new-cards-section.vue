<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import UiIcon from '@/components/ui-kit/icon.vue'

const { count } = defineProps<{ count: number }>()

const { t } = useI18n()
</script>

<template>
  <div
    data-testid="session-summary__new"
    class="flex items-center gap-3 rounded-4 bg-(--theme-primary) p-4 text-(--theme-on-primary)"
  >
    <ui-icon src="card-add" class="h-6 w-6 shrink-0" />
    <p class="text-lg">
      <span data-testid="session-summary__new-count" class="font-semibold">{{ count }}</span>
      {{ t('session-summary.new.unit') }}
    </p>
  </div>
</template>
