<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Hsl } from './catalog'
import type { Shade } from './state'
import { injectColorTuner } from './use-color-tuner'
import UiButton from '@/components/ui-kit/button.vue'
import UiInput from '@/components/ui-kit/input.vue'
import UiSpinbox from '@/components/ui-kit/spinbox/index.vue'
import { emitSfx } from '@/sfx/bus'
import { TYPE_SFX } from '@/sfx/config'

type ShadeEditorProps = {
  shade: Shade
}

type Channel = { key: keyof Hsl; label: string; max: number }

const { shade } = defineProps<ShadeEditorProps>()

const { t } = useI18n()
const tuner = injectColorTuner()

const CHANNELS: Channel[] = [
  { key: 'h', label: 'H', max: 360 },
  { key: 's', label: 'S', max: 100 },
  { key: 'l', label: 'L', max: 100 }
]

/** How long the hex reads back as copied before it returns to showing the colour. */
const COPIED_MS = 1500

const draft_name = ref(shade.name)
const name_rejected = ref(false)
const copied = ref(false)

let copied_timer: ReturnType<typeof setTimeout> | null = null

const hex = computed(() => tuner.exportHex(shade))

const shipped_hex = computed(() => tuner.shippedHexOf(shade))

const bindings = computed(() => tuner.bindingsOf(shade.id))

const can_delete = computed(() => bindings.value.length === 0)

// An undo can rename the shade out from under a half-typed field, so the field follows the state.
watch(
  () => [shade.id, shade.name],
  () => {
    draft_name.value = shade.name
    name_rejected.value = false
  }
)

onBeforeUnmount(() => {
  if (copied_timer) clearTimeout(copied_timer)
})

function onChannel(channel: keyof Hsl, value: number) {
  tuner.setChannel(shade.id, channel, value)
}

function onPickColor(event: Event) {
  tuner.setHex(shade.id, (event.target as HTMLInputElement).value)
}

function onCopyHex() {
  void navigator.clipboard?.writeText(hex.value)
  emitSfx('select')

  copied.value = true
  if (copied_timer) clearTimeout(copied_timer)
  copied_timer = setTimeout(() => (copied.value = false), COPIED_MS)
}

function onCommitName() {
  name_rejected.value = !tuner.renameShade(shade.id, draft_name.value)
  if (name_rejected.value) draft_name.value = shade.name
}
</script>

<template>
  <section
    data-testid="shade-editor"
    data-station="float"
    class="flex w-max max-w-120 flex-col gap-4 rounded-4 bg-surface p-4"
  >
    <header data-testid="shade-editor__header" class="flex items-center gap-3 mb-2">
      <div class="relative shrink-0">
        <label
          data-testid="shade-editor__swatch"
          v-sfx="{ hover: TYPE_SFX }"
          class="relative block size-12 cursor-pointer rounded-3 border border-line"
          :style="{ backgroundColor: hex }"
          :title="t('admin.palette-page.pick-color-label')"
        >
          <!-- The native picker anchors itself to its own input, so the input covers the swatch
               rather than being hidden away off-screen. -->
          <input
            data-testid="shade-editor__color-input"
            type="color"
            class="absolute inset-0 size-full cursor-pointer opacity-0"
            :value="hex"
            @input="onPickColor"
          />
        </label>

        <!-- Out of flow under the swatch: the header's height stays the swatch's, so the hex can sit
             directly beneath it without pushing the name field or the channels down. -->
        <button
          type="button"
          data-testid="shade-editor__hex"
          v-sfx="{ hover: TYPE_SFX }"
          class="absolute top-full left-0 cursor-pointer whitespace-nowrap text-base text-ink-muted tabular-nums hover:text-ink"
          @click="onCopyHex"
        >
          <template v-if="copied">{{ t('admin.color-tuner.copied-label') }}</template>
          <template v-else>
            {{ hex }}<span v-if="shipped_hex && shipped_hex !== hex"> ← {{ shipped_hex }}</span>
          </template>
        </button>
      </div>

      <div data-testid="shade-editor__identity" class="flex min-w-0 flex-1 flex-col gap-1">
        <ui-input
          data-testid="shade-editor__name"
          size="base"
          v-model:value="draft_name"
          :error="name_rejected ? t('admin.palette-page.name-taken-error') : undefined"
          @blur="onCommitName"
          @keydown.enter="onCommitName"
        />
      </div>
    </header>

    <!-- The header's hex readout hangs out of flow below it and claims no height, so the clearance
         it needs is carried here and by the header's own bottom margin. -->
    <div data-testid="shade-editor__channels" class="flex items-center gap-2 mt-5">
      <ui-spinbox
        v-for="channel in CHANNELS"
        :key="channel.key"
        data-testid="shade-editor__channel"
        class="shrink-0"
        :label="channel.label"
        :min="0"
        :max="channel.max"
        :value="shade.hsl[channel.key]"
        @update:value="onChannel(channel.key, $event)"
      />
    </div>

    <div data-testid="shade-editor__blast-radius" class="flex flex-col gap-2">
      <h3 class="text-base text-ink">
        {{ t('admin.palette-page.blast-radius-heading', { count: bindings.length }) }}
      </h3>

      <!-- The editor is teleported to the body, outside the admin modal the scroll lock keeps
           scrollable, so this list opts itself back in or its scrollbar is decorative.
           →[K:scroll-lock-teleport-opt-in] -->
      <ul
        v-if="bindings.length > 0"
        data-testid="shade-editor__bindings"
        data-scroll-live
        class="max-h-40 overflow-auto rounded-3 bg-well p-2 flex flex-col gap-1"
      >
        <li
          v-for="binding in bindings"
          :key="`${binding.mode}-${binding.station}-${binding.role}`"
          class="text-base text-ink-muted tabular-nums"
        >
          {{ binding.mode }} · {{ binding.station }} · {{ binding.role }}
        </li>
      </ul>

      <p v-else data-testid="shade-editor__unused" class="text-base text-ink-muted">
        {{ t('admin.palette-page.unused-label') }}
      </p>
    </div>

    <footer data-testid="shade-editor__actions" class="flex items-center gap-2">
      <ui-button
        data-testid="shade-editor__reset"
        size="sm"
        neutral
        icon-left="refresh"
        :disabled="!tuner.canResetShade(shade)"
        @press="tuner.resetShade(shade.id)"
      >
        {{ t('admin.palette-page.reset-shade-button') }}
      </ui-button>

      <ui-button
        data-testid="shade-editor__delete"
        size="sm"
        neutral
        icon-left="delete"
        data-palette="danger"
        :disabled="!can_delete"
        :title="
          can_delete
            ? undefined
            : t('admin.palette-page.delete-blocked-label', { count: bindings.length })
        "
        @press="tuner.deleteShade(shade.id)"
      >
        {{ t('admin.palette-page.delete-shade-button') }}
      </ui-button>
    </footer>
  </section>
</template>
