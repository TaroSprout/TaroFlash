<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { oklchOf } from './color-math'
import ShadeEditor from './shade-editor.vue'
import TunerToolbar from './tuner-toolbar.vue'
import { injectColorTuner } from './use-color-tuner'
import UiIcon from '@/components/ui-kit/icon.vue'
import UiPopover from '@/components/ui-kit/popover.vue'
import { emitSfx } from '@/sfx/bus'

const { t } = useI18n()
const tuner = injectColorTuner()

const picked_id = ref<string | null>(null)
const anchor_rect = ref<DOMRect | null>(null)
// Handed to the popover so a click on the open swatch isn't counted as an outside click; `onPick`
// below is then the only thing that toggles, and there is no close-then-reopen.
const anchor_el = ref<HTMLElement | null>(null)

const swatch_els = new Map<string, HTMLElement>()

// Every path out of the editor lands here, so the close sound is emitted once, in the one place the
// popover actually shuts — an outside click, a re-click on the open swatch, or Esc.
function onClose() {
  if (picked_id.value) emitSfx('snappy_button_5')
  picked_id.value = null
}

const picked = computed(() => tuner.shadeOf(picked_id.value))

// A rect anchor is a fixed point the popover can't re-derive on its own, so the body scrolling out
// from under an open editor has to be read back here or the editor hangs over the wrong swatch.
onMounted(() => window.addEventListener('scroll', remeasure, true))

onBeforeUnmount(() => window.removeEventListener('scroll', remeasure, true))

function oklchLOf(hsl: { h: number; s: number; l: number }) {
  return oklchOf(hsl).l.toFixed(3)
}

function keepSwatchEl(id: string, el: unknown) {
  if (el instanceof HTMLElement) swatch_els.set(id, el)
  else swatch_els.delete(id)
}

function onPick(id: string, event: MouseEvent) {
  if (id === picked_id.value) return onClose()

  const el = event.currentTarget as HTMLElement
  emitSfx('snappy_button_5')
  picked_id.value = id
  anchor_el.value = el
  anchor_rect.value = el.getBoundingClientRect()
}

function onAddShade(family: string) {
  const lightest = tuner.families.value.get(family)?.[0]
  const seed = lightest ? { ...lightest.hsl, l: lightest.hsl.l + 4 } : { h: 0, s: 0, l: 50 }

  emitSfx('snappy_button_5')
  picked_id.value = tuner.addShade(family, seed).id
  void nextTick(() => remeasure())
}

// Recolouring re-sorts the family under the open popover, so the anchor is re-read from wherever the
// swatch landed rather than left pointing at the cell it used to occupy.
function remeasure() {
  const el = picked_id.value && swatch_els.get(picked_id.value)
  if (!el) return

  anchor_el.value = el
  anchor_rect.value = el.getBoundingClientRect()
}

watch(
  () => tuner.ordered_shades.value.map((shade) => shade.id).join(),
  () => void nextTick(() => remeasure())
)
</script>

<template>
  <div data-testid="palette-page" class="flex flex-col gap-4">
    <tuner-toolbar />

    <div data-testid="palette-page__families" class="flex flex-col gap-6 pb-6">
      <section
        v-for="family in tuner.family_names.value"
        :key="family"
        data-testid="palette-page__family"
        class="flex flex-col gap-2"
      >
        <h2 data-testid="palette-page__family-heading" class="text-lg text-ink">{{ family }}</h2>

        <div data-testid="palette-page__swatches" class="flex flex-wrap">
          <button
            v-for="shade in tuner.families.value.get(family) ?? []"
            :key="shade.id"
            :ref="(el) => keepSwatchEl(shade.id, el)"
            type="button"
            data-testid="palette-page__swatch"
            :data-active="shade.id === picked_id"
            v-sfx="{ hover: 'ui.hover' }"
            class="flex w-(--palette-page-swatch-size) cursor-pointer flex-col gap-1 rounded-3 p-2 text-left hover:bg-raised-tint data-[active=true]:bg-raised"
            @click="onPick(shade.id, $event)"
          >
            <span
              data-testid="palette-page__swatch-chip"
              class="aspect-square w-full rounded-2_5 border border-line"
              :style="{ backgroundColor: tuner.exportHex(shade) }"
            ></span>

            <span data-testid="palette-page__swatch-labels" class="flex flex-col">
              <span
                data-testid="palette-page__swatch-name"
                class="truncate text-sm text-ink"
                :title="shade.name"
              >
                {{ shade.name }}
              </span>

              <span
                data-testid="palette-page__swatch-oklch"
                class="truncate text-sm text-ink-muted tabular-nums"
              >
                L {{ oklchLOf(shade.hsl) }}
              </span>
            </span>
          </button>

          <button
            type="button"
            data-testid="palette-page__add-shade"
            v-sfx="{ hover: 'ui.hover' }"
            class="flex w-(--palette-page-swatch-size) cursor-pointer flex-col self-start rounded-3 p-2 text-ink-muted"
            :aria-label="t('admin.palette-page.add-shade-button')"
            :title="t('admin.palette-page.add-shade-button')"
            @click="onAddShade(family)"
          >
            <!-- The filled square lives on this inner chip, not on the button: painting the button
                 itself made the tile the full cell — padding included — and so a swatch chip plus
                 both paddings wide, sitting flush with the cell's top edge instead of the chips'. -->
            <span
              data-testid="palette-page__add-shade-chip"
              class="flex aspect-square w-full items-center justify-center rounded-2_5 border border-line bg-raised-shade"
            >
              <ui-icon src="add" class="size-6" />
            </span>
          </button>
        </div>
      </section>
    </div>

    <ui-popover
      :open="!!picked"
      :anchor_rect="anchor_rect"
      :anchor_el="anchor_el"
      position="right"
      :use_arrow="false"
      shadow
      teleport
      @close="onClose"
    >
      <shade-editor v-if="picked" :key="picked.id" :shade="picked" />
    </ui-popover>
  </div>
</template>

<style scoped>
/* Single source for the swatch chip's footprint — the add-shade button tracks it via
   `w-(--palette-page-swatch-size)` so the two can't drift out of sync again. */
[data-testid='palette-page__swatches'] {
  /* 24 * the 4px base spacing unit, written as a plain length — the --spacing()
     theme function isn't resolvable from a scoped SFC style block. */
  --palette-page-swatch-size: 96px;
}
</style>
