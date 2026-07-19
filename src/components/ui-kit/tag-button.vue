<script setup lang="ts">
import { computed } from 'vue'
import { buildTagButtonMask, outsetSideFor, type NotchSide } from '@/utils/tag-button/mask'
import UiIcon from '@/components/ui-kit/icon.vue'
import { TYPE_SFX } from '@/sfx/config'

type TagButtonProps = {
  notchSide?: NotchSide
  notchDepth?: number
  outsetDepth?: number
  apexRadius?: number
  cornerRadius?: number
  fancyHover?: boolean
  size?: 'base' | 'lg'
  icon?: string
}

const {
  notchSide = 'right',
  notchDepth = 10,
  outsetDepth = 10,
  apexRadius = 3,
  cornerRadius = 4,
  fancyHover = true,
  size = 'base',
  icon
} = defineProps<TagButtonProps>()

const mask = computed(() =>
  buildTagButtonMask({ notchSide, notchDepth, outsetDepth, apexRadius, cornerRadius })
)

const padding = computed(() => {
  const outset = outsetSideFor(notchSide)
  const left = outset === 'left' ? outsetDepth + 10 : notchDepth + 10
  const right = outset === 'left' ? notchDepth + 10 : outsetDepth + 10
  return { paddingLeft: `${left}px`, paddingRight: `${right}px` }
})
</script>

<template>
  <span class="ui-tag-button-shell inline-block hover:scale-105" v-sfx="{ hover: TYPE_SFX }">
    <button
      data-testid="ui-kit-tag-button"
      type="button"
      :class="size === 'lg' ? 'py-2.5 text-xl gap-2' : 'py-2 text-sm gap-1.5'"
      class="ui-kit-tag-button group/tag-btn relative w-max cursor-pointer inline-flex items-center"
      :style="{ mask, WebkitMask: mask, ...padding }"
    >
      <ui-icon v-if="icon" :src="icon" :class="size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'" />
      <slot></slot>
      <div
        v-if="fancyHover"
        data-testid="ui-kit-tag-button__hover-fx"
        class="absolute! inset-0 bgx-diagonal-stripes bgx-color-[var(--tagbtn-bg)] animation-safe:group-hover/tag-btn:bgx-slide pointer-events-none"
      />
    </button>
  </span>
</template>

<style>
/* Same chrome/identity seam as ui-tag: `element` chrome by default, identity
   opt-in via a self `[data-palette]` (new) or legacy `[data-theme]` (until D2).
   The seam vars sit on the SHELL (the component root that fall-through attrs
   land on) so the hover drop-shadow silhouette can read them and the inner
   button + bgx sweep inherit them. Self-selectors, so no ancestor leak. */
.ui-tag-button-shell {
  --tagbtn-bg: var(--color-element);
  --tagbtn-fg: var(--color-on-element);
}
.ui-tag-button-shell[data-theme] {
  --tagbtn-bg: var(--theme-primary);
  --tagbtn-fg: var(--theme-on-primary);
}
.ui-tag-button-shell[data-palette] {
  --tagbtn-bg: var(--color-accent);
  --tagbtn-fg: var(--color-on-accent);
}
.ui-kit-tag-button {
  background-color: var(--tagbtn-bg);
  color: var(--tagbtn-fg);
}

@media (hover: hover) {
  .ui-tag-button-shell:hover {
    filter: drop-shadow(2px 0 0 var(--tagbtn-bg)) drop-shadow(-2px 0 0 var(--tagbtn-bg))
      drop-shadow(0 2px 0 var(--tagbtn-bg)) drop-shadow(0 -2px 0 var(--tagbtn-bg));
  }
}
</style>
