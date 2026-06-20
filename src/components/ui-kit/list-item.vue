<script setup lang="ts">
import { emitHoverSfx } from '@/sfx/bus'

type ListItemProps = {
  disabled?: boolean
  hover_effect?: boolean
  appearance?: 'ghost' | 'fill'
  theme?: 'purple' | 'blue' | 'green' | 'orange' | 'red' | 'grey'
}

const { hover_effect = true, appearance = 'ghost', theme = 'purple' } = defineProps<ListItemProps>()

function onMouseEnter() {
  if (!hover_effect) return
  emitHoverSfx('click_04')
}
</script>

<template>
  <div
    data-testid="ui-kit-list-item"
    class="ui-kit-list-item"
    :class="{
      'ui-kit-list-item--hover-effect': hover_effect,
      'ui-kit-list-item--disabled': disabled
    }"
    @mouseenter="onMouseEnter"
  >
    <slot name="before"></slot>
    <slot></slot>
    <slot name="after"></slot>

    <div
      data-testid="ui-kit-list-item__background"
      class="ui-kit-list-item__background animation-safe:animate-bg-slide"
      :class="[
        `ui-kit-list-item__background--${appearance}`,
        `ui-kit-list-item__background--${theme}`
      ]"
    ></div>
  </div>
</template>

<style>
.ui-kit-list-item {
  --primary-color: var(--color-purple-400);

  position: relative;

  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 24px;

  padding: 12px 0;
  width: 100%;

  color: var(--color-brown-700);
}

.ui-kit-list-item--disabled {
  pointer-events: none;
  opacity: 0.5;
}

.ui-kit-list-item--hover-effect:hover {
  color: var(--color-white);
}

.ui-kit-list-item__background {
  display: none;

  position: absolute;
  top: 4px;
  right: -12px;
  bottom: 4px;
  left: -12px;
  border-radius: 24px;

  z-index: -1;
}

.ui-kit-list-item__background--fill {
  display: block;
  background-color: var(--color-brown-100);
}

.ui-kit-list-item--hover-effect:hover .ui-kit-list-item__background {
  background-image: var(--bgx-diagonal-stripes);
  display: block;
}

.ui-kit-list-item--hover-effect:hover .ui-kit-list-item__background {
  background-color: var(--primary-color);
}

.ui-kit-list-item__background--purple {
  --primary-color: var(--color-purple-400);
}
.ui-kit-list-item__background--blue {
  --primary-color: var(--color-blue-500);
}
.ui-kit-list-item__background--green {
  --primary-color: var(--color-green-400);
}
.ui-kit-list-item__background--orange {
  --primary-color: var(--color-yellow-400);
}
.ui-kit-list-item__background--red {
  --primary-color: var(--color-red-500);
}
</style>
