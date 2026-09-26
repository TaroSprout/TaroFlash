<script setup lang="ts">
import { onMounted, useTemplateRef, watch } from 'vue'
import { resizeBand, setBand } from '@/utils/animations/reader-band'

type TranslationBandProps = {
  // Reserved height (px) for this page's band, from the pagination footprint.
  height: number
  // The active paragraph's translation, or null when none is playing.
  translation: string | null
  // True when the active paragraph's translation overflows the reserved height,
  // so it reads from the top rather than sitting centred.
  overflowing?: boolean
}

const { height, translation, overflowing = false } = defineProps<TranslationBandProps>()

const band = useTemplateRef<HTMLElement>('band')

// The band height is a GSAP-driven inline style on an uncontrolled node, so it's
// synced imperatively: seed it on mount, then tween it toward each new footprint.
let primed = false

onMounted(() => {
  if (!band.value) return
  setBand(band.value, height)
  primed = true
})

watch(
  () => height,
  (next) => {
    const el = band.value
    if (!el) return

    if (!primed) {
      setBand(el, next)
      primed = true
      return
    }

    resizeBand(el, next)
  }
)
</script>

<template>
  <div ref="band" data-testid="reader-band" class="overflow-hidden border-t border-line pt-3">
    <div data-testid="reader-band__scroll" class="h-full overflow-y-auto">
      <div
        data-testid="reader-band__text"
        class="flex min-h-full flex-col text-lg text-ink-muted leading-[1.5]"
        :class="overflowing ? 'justify-start' : 'justify-center'"
      >
        {{ translation }}
      </div>
    </div>
  </div>
</template>
