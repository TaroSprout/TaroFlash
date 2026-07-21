<script lang="ts" setup>
import storage from '@/utils/storage'
import { onMounted } from 'vue'
import UiIcon from '@/components/ui-kit/icon.vue'
import UiTooltip from '@/components/ui-kit/tooltip.vue'
import { emitHoverSfx, emitSfx } from '@/sfx/bus'

type Tab = {
  label: string
  icon?: string
}

const { storageKey, palette = 'blue' } = defineProps<{
  tabs: Tab[]
  storageKey?: string
  palette?: Palette
}>()
const emit = defineEmits<{
  (e: 'update:activeTab', index: number): void
}>()

const active_tab = defineModel<number>('activeTab')

onMounted(() => {
  if (!storageKey) return

  const storedValue = storage.get(storageKey)
  if (storedValue) {
    emit('update:activeTab', Number(storedValue))
  }
})

function onTabClick(index: number) {
  if (active_tab.value === index) {
    return
  }

  if (storageKey) {
    storage.set(storageKey, index.toString())
  }

  emitSfx('etc_camera_shutter')
  emit('update:activeTab', index)
}

function onHover(index: number) {
  if (active_tab.value === index) return
  emitHoverSfx('click_04')
}
</script>

<template>
  <div data-testid="ui-kit-tabs" :data-palette="palette" class="ui-kit-tabs">
    <ui-tooltip
      v-for="(tab, index) in tabs"
      data-testid="ui-kit-tabs__tab"
      theme="white"
      :gap="-4"
      :suppress="active_tab === index"
      class="ui-kit-tabs__tab"
      :text="tab.label"
      :class="{ 'ui-kit-tabs__tab--active': active_tab === index }"
      @click="onTabClick(index)"
      @mouseenter="onHover(index)"
    >
      <ui-icon v-if="tab.icon" :src="tab.icon" class="ui-kit-tabs__tab-icon h-6" />
      <span class="ui-kit-tabs__tab-label">{{ tab.label }}</span>
    </ui-tooltip>
  </div>
</template>

<style>
.ui-kit-tabs {
  display: flex;
  align-items: center;
  gap: 4px;
  user-select: none;
}

.ui-kit-tabs__tab {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;

  min-height: 32px;
  min-width: 32px;
  padding: 6px;
  border-radius: var(--radius-3_5);
  background-color: var(--color-accent);

  transition: width 75ms ease-in-out;
  cursor: pointer;
}

.ui-kit-tabs__tab.ui-kit-tabs__tab--active {
  height: auto;
  width: auto;
  padding: 6px 12px;
}

.ui-kit-tabs__tab-icon {
  flex-shrink: 0;
  color: var(--color-white);
}

.ui-kit-tabs__tab-label {
  position: absolute;
  color: transparent;
  font-size: var(--text-base);
  line-height: var(--text-base--line-height);
}

.ui-kit-tabs__tab--active .ui-kit-tabs__tab-label {
  position: static;
  color: var(--color-white);
}
</style>
