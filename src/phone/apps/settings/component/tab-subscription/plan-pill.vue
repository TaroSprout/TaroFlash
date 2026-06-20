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
      :data-loading="loading"
      class="flex items-stretch gap-4 rounded-4 px-5 py-3.5 text-(--theme-on-primary) h-18 data-[loading=false]:bgx-leaf data-[loading=false]:bgx-size-23 data-[loading=false]:bgx-opacity-10 bg-(--theme-primary) data-[loading=true]:bgx-diagonal-stripes data-[loading=true]:shimmer"
    >
      <template v-if="!loading">
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
