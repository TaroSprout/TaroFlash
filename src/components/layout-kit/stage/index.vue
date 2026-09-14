<script setup lang="ts">
import { useTemplateRef } from 'vue'
import { useStageHeight } from './use-stage-height'

/** The eight box edges and corners the escape slot can pin its content to. */
type EscapeAnchor =
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'

type StageProps = {
  /** How far the painted surface sits inside the box so its shadow and border clear the clip while the height animates. Any CSS length. */
  inset?: string
  /** Classes for the painted surface — the consumer's background, border and shadow. */
  surface_class?: string
  /** Which box edge or corner the `escape` slot's content pins to and overhangs from. */
  escape_anchor?: EscapeAnchor
}

const { inset = '0px', surface_class = '', escape_anchor = 'top' } = defineProps<StageProps>()

const box = useTemplateRef<HTMLElement>('box')
const content = useTemplateRef<HTMLElement>('content')

const { claimHeight, driveHeight } = useStageHeight(box, content)

defineExpose({ claimHeight, driveHeight })
</script>

<template>
  <div data-testid="stage__anchor" class="stage__anchor">
    <div ref="box" data-testid="stage" class="stage" :style="{ '--stage-inset': inset }">
      <div data-testid="stage__surface" class="stage__surface" :class="surface_class">
        <div data-testid="stage__clip" class="stage__clip">
          <div ref="content" data-testid="stage__content">
            <slot></slot>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="$slots.escape"
      data-testid="stage__escape"
      class="stage__escape"
      :data-anchor="escape_anchor"
    >
      <slot name="escape"></slot>
    </div>
  </div>
</template>

<style scoped>
/* Holds the box and the escape slot in one unclipped stacking context. Its height
   equals the box's (the box is its only in-flow child), so an escape slot pinned to a
   box edge tracks that edge as the box height animates, while sitting outside the
   box's transient overflow clip. The box's `contain: layout` opens its own stacking
   context below, so the escape slot — a later sibling here with no z-index of its
   own — always paints above the box's clipped content and rides the stage's stacking
   order. */
.stage__anchor {
  position: relative;
}

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

/* Escape slot: pinned outside the named box edge or corner so its content clears the
   clip. Each anchor sets the box side it overhangs (`bottom: 100%` = above the top
   edge, `top: 100%` = below the bottom edge) and stretches the free axis; a corner
   pins both. Because the wrapper's height equals the box's, an edge inset tracks that
   box edge as the height animates. */
.stage__escape {
  position: absolute;
}

.stage__escape[data-anchor='top'] {
  inset-inline: 0;
  bottom: 100%;
}

.stage__escape[data-anchor='bottom'] {
  inset-inline: 0;
  top: 100%;
}

.stage__escape[data-anchor='left'] {
  inset-block: 0;
  right: 100%;
}

.stage__escape[data-anchor='right'] {
  inset-block: 0;
  left: 100%;
}

.stage__escape[data-anchor='top-left'] {
  bottom: 100%;
  right: 100%;
}

.stage__escape[data-anchor='top-right'] {
  bottom: 100%;
  left: 100%;
}

.stage__escape[data-anchor='bottom-left'] {
  top: 100%;
  right: 100%;
}

.stage__escape[data-anchor='bottom-right'] {
  top: 100%;
  left: 100%;
}
</style>
