<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Hsl } from './catalog'
import { injectColorTuner } from './use-color-tuner'
import type { Shade } from './state'

type Channel = 'h' | 's' | 'l'

const CHANNEL_MAX: Record<Channel, number> = { h: 359, s: 100, l: 100 }

const { t } = useI18n()
const tuner = injectColorTuner()

const open_id = ref<string | null>(null)
const name_error = ref<string | null>(null)

const families = computed(() =>
  tuner.family_names.value.map((family) => ({
    family,
    shades: tuner.families.value.get(family) ?? []
  }))
)

function isOpen(shade: Shade): boolean {
  return open_id.value === shade.id
}

function toggle(shade: Shade) {
  name_error.value = null
  open_id.value = isOpen(shade) ? null : shade.id
}

function channelValue(shade: Shade, channel: Channel): number {
  return shade.hsl[channel]
}

// A channel edit repaints the shade in place and only lands in history once focus leaves the field,
// so a held arrow key keeps stepping and the whole run undoes as one change.
function onChannelInput(shade: Shade, channel: Channel, event: Event) {
  const raw = Number((event.target as HTMLInputElement).value)
  if (Number.isNaN(raw)) return

  tuner.beginRun({ key: 'admin.color-page.change.recolor', params: { name: shade.name } })
  tuner.recolorShade(shade.id, { ...shade.hsl, [channel]: raw } as Hsl)
}

function onChannelCommit() {
  tuner.endRun()
}

function onRename(shade: Shade, event: Event) {
  const input = event.target as HTMLInputElement
  const accepted = tuner.renameShade(shade.id, input.value)

  name_error.value = accepted ? null : shade.id
  if (!accepted) input.value = shade.name
}

function onAdd(family: string) {
  const added = tuner.addShade(family, { h: 0, s: 0, l: 50 })
  open_id.value = added.id
}
</script>

<template>
  <section data-testid="shade-list" class="flex flex-col gap-4">
    <h3 class="text-base font-semibold text-ink">{{ t('admin.color-page.shades.title') }}</h3>

    <div
      v-for="group in families"
      :key="group.family"
      :data-testid="`shade-list__family--${group.family}`"
      class="flex flex-col gap-1.5"
    >
      <header class="flex items-center gap-2 text-base text-ink">
        <span class="font-semibold">{{ group.family }}</span>

        <button
          type="button"
          data-testid="shade-list__add"
          class="ml-auto cursor-pointer rounded-2 bg-raised px-2 py-0.5"
          @click="onAdd(group.family)"
        >
          {{ t('admin.color-page.shades.add-button') }}
        </button>
      </header>

      <div
        v-for="shade in group.shades"
        :key="shade.id"
        :data-testid="`shade-list__shade--${shade.id}`"
        class="flex flex-col gap-1.5 rounded-2 bg-well p-2 text-base text-ink"
      >
        <div class="flex items-center gap-2">
          <span
            class="h-5 w-5 shrink-0 rounded-full border border-line"
            :style="{ backgroundColor: tuner.hexOf(shade) ?? 'transparent' }"
          />

          <button
            type="button"
            data-testid="shade-list__toggle"
            class="cursor-pointer font-semibold"
            :data-active="isOpen(shade)"
            @click="toggle(shade)"
          >
            {{ shade.name }}
          </button>

          <span data-testid="shade-list__usage" class="text-ink-muted">
            {{ t('admin.color-page.shades.usage', { count: tuner.usageCount(shade.id) }) }}
          </span>

          <span class="ml-auto text-ink-muted">{{ tuner.exportHex(shade) }}</span>
        </div>

        <div v-if="isOpen(shade)" data-testid="shade-list__editor" class="flex flex-col gap-1.5">
          <label class="flex items-center gap-2">
            {{ t('admin.color-page.shades.name-label') }}
            <input
              data-testid="shade-list__name"
              type="text"
              class="rounded-1 bg-surface px-1.5 py-0.5 text-base text-ink"
              :value="shade.name"
              @change="(event) => onRename(shade, event)"
            />
            <span
              v-if="name_error === shade.id"
              data-palette="danger"
              class="text-(--color-accent-text)"
            >
              {{ t('admin.color-page.shades.name-taken') }}
            </span>
          </label>

          <label
            v-for="channel in ['h', 's', 'l'] as Channel[]"
            :key="channel"
            class="flex items-center gap-2"
          >
            {{ t(`admin.color-page.shades.channel-${channel}`) }}
            <input
              :data-testid="`shade-list__channel--${channel}`"
              type="number"
              step="1"
              min="0"
              :max="CHANNEL_MAX[channel]"
              class="w-20 rounded-1 bg-surface px-1.5 py-0.5 text-base text-ink"
              :value="channelValue(shade, channel)"
              @input="(event) => onChannelInput(shade, channel, event)"
              @blur="onChannelCommit"
            />
          </label>

          <div class="flex items-center gap-2">
            <button
              v-if="tuner.canResetShade(shade)"
              type="button"
              data-testid="shade-list__reset"
              class="cursor-pointer rounded-2 bg-raised px-2 py-0.5"
              @click="tuner.resetShade(shade.id)"
            >
              {{ t('admin.color-page.shades.reset-button') }}
            </button>

            <button
              type="button"
              data-testid="shade-list__delete"
              data-palette="danger"
              :disabled="tuner.usageCount(shade.id) > 0"
              class="rounded-2 bg-raised px-2 py-0.5 disabled:opacity-40"
              :class="tuner.usageCount(shade.id) === 0 && 'cursor-pointer'"
              @click="tuner.deleteShade(shade.id)"
            >
              {{ t('admin.color-page.shades.delete-button') }}
            </button>

            <span
              v-if="tuner.usageCount(shade.id) > 0"
              data-testid="shade-list__delete-blocked"
              class="text-ink-muted"
            >
              {{
                t('admin.color-page.shades.delete-blocked', { count: tuner.usageCount(shade.id) })
              }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
