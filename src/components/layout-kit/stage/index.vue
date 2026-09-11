<script setup lang="ts">
import { useTemplateRef } from 'vue'
import { useStageHeight } from './use-stage-height'

type StageProps = {
  /** How far the painted surface sits inside the box so its shadow and border clear the clip while the height animates. Any CSS length. */
  inset?: string
  /** Classes for the painted surface — the consumer's background, border and shadow. */
  surface_class?: string
}

const { inset = '0px', surface_class = '' } = defineProps<StageProps>()

const box = useTemplateRef<HTMLElement>('box')
const content = useTemplateRef<HTMLElement>('content')

const { claimHeight } = useStageHeight(box, content)

defineExpose({ claimHeight })
</script>

<template>
  <div ref="box" data-testid="stage" class="stage" :style="{ '--stage-inset': inset }">
    <div data-testid="stage__surface" class="stage__surface" :class="surface_class">
      <div data-testid="stage__clip" class="stage__clip">
        <div ref="content" data-testid="stage__content">
          <slot></slot>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Measured box: its height is what animates. `contain` walls its layout and style
   work off from the page so a resize never reflows a sibling, and it holds no
   padding of its own so nothing it paints collides with the clip it takes on (by
   JS) only while a height change is mid-flight. */
.stage {
  contain: layout style;
}

/* Painted surface: held `--stage-inset` in from the box so its shadow renders in
   that gap, inside the box's transient clip, instead of being cut at the box edge. */
.stage__surface {
  margin: var(--stage-inset, 0px);
}

/* Content clip: keeps content inside the surface's shape while the box height
   animates past it. The surface's shadow sits on the layer above, so this never cuts it. */
.stage__clip {
  overflow: hidden;
}
</style>
