<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ROLE_NAMES, type Mode, type RoleName, type StationName } from './catalog'
import { injectColorTuner } from './use-color-tuner'

type PaintTargetProps = {
  element_id: string
  mode: Mode
  station: StationName
  tag?: string
}

const { element_id, mode, station, tag = 'div' } = defineProps<PaintTargetProps>()

const { t } = useI18n()
const tuner = injectColorTuner()

const editing = ref(false)

const binding = computed(() => tuner.elementBinding(element_id))

const paint = computed(() => ({
  backgroundColor: hexFor(binding.value.bg) ?? undefined,
  color: hexFor(binding.value.text) ?? undefined
}))

const changed = computed(() => tuner.isElementChanged(element_id))

const badge_label = computed(() =>
  [binding.value.bg ?? t('admin.color-page.token.none'), binding.value.text]
    .filter(Boolean)
    .join(' · ')
)

function hexFor(role: RoleName | null): string | null {
  return role ? tuner.hexOf(tuner.paintShade(mode, station, role)) : null
}

function onFill(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  tuner.setElementBg(element_id, value === '' ? null : (value as RoleName))
}

function onText(event: Event) {
  tuner.setElementText(element_id, (event.target as HTMLSelectElement).value as RoleName)
}
</script>

<template>
  <component
    :is="tag"
    :data-testid="`paint-target__${element_id}`"
    :data-changed="changed"
    :style="paint"
    class="paint-target group/paint relative"
  >
    <slot></slot>

    <button
      type="button"
      data-testid="paint-target__badge"
      :aria-label="t('admin.color-page.token.badge-label')"
      class="paint-target__badge"
      :class="changed || editing ? 'opacity-100' : 'opacity-0 group-hover/paint:opacity-100'"
      @click.stop="editing = !editing"
    >
      {{ badge_label }}
    </button>

    <div v-if="editing" data-testid="paint-target__editor" class="paint-target__editor">
      <label class="paint-target__field">
        {{ t('admin.color-page.token.fill-label') }}
        <select :value="binding.bg ?? ''" @change="onFill">
          <option value="">{{ t('admin.color-page.token.none') }}</option>
          <option v-for="role in ROLE_NAMES" :key="role" :value="role">{{ role }}</option>
        </select>
      </label>

      <label v-if="binding.text" class="paint-target__field">
        {{ t('admin.color-page.token.text-label') }}
        <select :value="binding.text" @change="onText">
          <option v-for="role in ROLE_NAMES" :key="role" :value="role">{{ role }}</option>
        </select>
      </label>
    </div>
  </component>
</template>

<style scoped>
/* The badge and its editor sit inside the painted element but outside its box, so nothing here may
 * clip: an element that hid its own overflow would swallow the marker that belongs to it. */
.paint-target {
  overflow: visible;
}

.paint-target__badge {
  position: absolute;
  top: -9px;
  right: -6px;
  z-index: 20;
  padding: 0 4px;
  border-radius: 4px;
  font-size: 11px;
  line-height: 16px;
  white-space: nowrap;
  cursor: pointer;
  background-color: var(--color-accent);
  color: var(--color-on-accent);
  transition: opacity 120ms ease;
}

.paint-target[data-changed='true'] > .paint-target__badge {
  outline: 1px solid var(--color-ink);
}

.paint-target__editor {
  position: absolute;
  top: 8px;
  right: -6px;
  z-index: 30;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px;
  border-radius: 8px;
  background-color: var(--color-surface);
  color: var(--color-ink);
  border: 1px solid var(--color-line);
  box-shadow: 0 6px 18px var(--shadow-color);
}

.paint-target__field {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  white-space: nowrap;
}

.paint-target__field select {
  background-color: var(--color-well);
  color: var(--color-ink);
  border-radius: 4px;
  padding: 2px 4px;
}
</style>
