<script setup lang="ts" generic="T extends string | number">
type TabBarProps<V> = {
  tabs: { value: V; label: string }[]
  active: V
  hover_sfx?: string
}

defineProps<TabBarProps<T>>()

defineEmits<{
  (e: 'update:active', value: T): void
}>()
</script>

<template>
  <div
    data-testid="tab-bar"
    class="inline-flex gap-1 p-1 rounded-2.5 bg-brown-200 dark:bg-grey-900"
  >
    <button
      v-for="tab in tabs"
      :key="String(tab.value)"
      v-sfx="{ hover: tab.value === active ? undefined : hover_sfx }"
      type="button"
      data-testid="tab-bar__tab"
      :data-active="tab.value === active"
      class="py-1.5 px-3.5 rounded-2 text-sm cursor-pointer text-brown-500 dark:text-brown-300 data-[active=false]:hover:bg-brown-300 dark:data-[active=false]:hover:bg-grey-800 data-[active=true]:bg-(--theme-primary) data-[active=true]:text-(--theme-on-primary)"
      @click="$emit('update:active', tab.value)"
    >
      {{ tab.label }}
    </button>
  </div>
</template>
