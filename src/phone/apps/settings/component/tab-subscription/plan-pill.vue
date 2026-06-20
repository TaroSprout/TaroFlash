<script setup lang="ts">
type PlanPillProps = {
  name: string
  cost?: string | null
  description?: string | null
  loading?: boolean
}

const { name, cost = null, description = null, loading = false } = defineProps<PlanPillProps>()

defineSlots<{
  actions?: () => unknown
}>()
</script>

<template>
  <div data-testid="plan-pill" class="relative">
    <div
      v-if="$slots.actions && !loading"
      data-testid="plan-pill__actions"
      class="absolute -top-3.5 right-1 z-10 rotate-2"
    >
      <slot name="actions" />
    </div>

    <div
      data-testid="plan-pill__body"
      class="flex items-stretch gap-4 rounded-4 bg-(--theme-primary) bgx-leaf bgx-size-23 bgx-opacity-10 px-5 py-3.5 text-(--theme-on-primary)"
      :class="loading && 'animate-pulse'"
    >
      <template v-if="loading">
        <div data-testid="plan-pill__skeleton" class="flex flex-1 flex-col gap-2">
          <div class="h-7 w-32 rounded-2 bg-brown-100/30"></div>
          <div class="h-4 w-44 rounded-2 bg-brown-100/20"></div>
        </div>
        <div class="flex flex-col justify-center">
          <div class="h-5 w-16 rounded-2 bg-brown-100/30"></div>
        </div>
      </template>

      <template v-else>
        <div data-testid="plan-pill__primary" class="flex flex-1 flex-col">
          <p data-testid="plan-pill__name" class="text-2xl">{{ name }}</p>
          <p v-if="description" data-testid="plan-pill__description" class="text-brown-200 text-sm">
            {{ description }}
          </p>
        </div>

        <div
          v-if="cost"
          data-testid="plan-pill__cost"
          class="flex flex-col justify-center text-right"
        >
          <p data-testid="plan-pill__cost-value">{{ cost }}</p>
        </div>
      </template>
    </div>
  </div>
</template>
