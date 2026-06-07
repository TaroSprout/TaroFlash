<script setup lang="ts">
import { computed, provide } from 'vue'
import mobileSheet, { type MobileSheetProps } from './mobile-sheet.vue'
import { SHEET_SIDEBAR_BG } from './sheet-surface'
import { activeTabKey } from './tab-sheet-context'
import { useShortcuts } from '@/composables/use-shortcuts'
import { useMatchMedia } from '@/composables/use-media-query'
import { emitSfx } from '@/sfx/bus'
import type { NamespacedAudioKey } from '@/sfx/config'
import uid from '@/utils/uid'
import UiButton from '@/components/ui-kit/button.vue'
import UiIcon from '@/components/ui-kit/icon.vue'

export type Tab = { label: string; value: string; icon?: string }

export type TabSheetParts = {
  content?: string
  sidebar?: string
  tab?: string
}

export type TabSheetProps = MobileSheetProps & {
  tabs?: Tab[]
  parts?: TabSheetParts
  hover_sfx?: NamespacedAudioKey | ''
  select_sfx?: NamespacedAudioKey | ''
  reselect_sfx?: NamespacedAudioKey | ''
}

const {
  tabs,
  parts,
  title,
  pattern_config,
  show_close_button = true,
  surface = 'standard',
  header_border = 'wave',
  hover_sfx = 'ui.click_07',
  select_sfx = 'ui.select',
  reselect_sfx = 'ui.digi_powerdown'
} = defineProps<TabSheetProps>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'select', value: string): void
  (e: 'reselect', value: string): void
}>()

defineSlots<{
  sidebar(): any
  overlay(): any
  header(): any
  'header-content'(): any
  default(): any
  footer(): any
}>()

const active = defineModel<string>('active', { default: '' })
if (!active.value) active.value = tabs?.[0]?.value ?? ''
provide(activeTabKey, active)

const sidebar_bg_class = computed(() => SHEET_SIDEBAR_BG[surface])

const has_tabs = computed(() => !!tabs?.length)
// Mirrors the CSS sidebar condition `lg:pointer-fine:flex` exactly. Hide
// mobile-sheet's close button whenever the sidebar (which carries its own
// close) is visible; otherwise the user sees two stacked close buttons.
const has_sidebar = useMatchMedia('w>=lg & fine')
const sheet_close_button = computed(
  () => (!has_tabs.value || !has_sidebar.value) && show_close_button
)

const tab_panel_id = 'tab-sheet__panel'
const tab_id_prefix = `tab-sheet__tab--${uid()}--`
const tabId = (value: string) => `${tab_id_prefix}${value}`

function selectOption(value: string) {
  if (value === active.value) {
    if (reselect_sfx) emitSfx(reselect_sfx)
    emit('reselect', value)
    return
  }
  if (select_sfx) emitSfx(select_sfx)
  active.value = value
  emit('select', value)
}

function focusTabAt(index: number) {
  const target = tabs?.[index]
  if (!target) return
  selectOption(target.value)
  document.getElementById(tabId(target.value))?.focus()
}

function activeIndex() {
  return (tabs ?? []).findIndex((t) => t.value === active.value)
}

function step(delta: number) {
  const len = tabs?.length ?? 0
  if (!len) return
  focusTabAt((activeIndex() + delta + len) % len)
}

const shortcuts = useShortcuts('tab-sheet')

shortcuts.register([
  { combo: 'arrowright', handler: () => step(1) },
  { combo: 'arrowdown', handler: () => step(1) },
  { combo: 'arrowleft', handler: () => step(-1) },
  { combo: 'arrowup', handler: () => step(-1) },
  { combo: 'home', handler: () => focusTabAt(0) },
  { combo: 'end', handler: () => focusTabAt((tabs?.length ?? 1) - 1) }
])
</script>

<template>
  <mobile-sheet
    :title="title"
    :pattern_config="pattern_config"
    :show_close_button="sheet_close_button"
    :surface="surface"
    :header_border="header_border"
    @close="emit('close')"
  >
    <template v-if="$slots.overlay" #overlay><slot name="overlay"></slot></template>
    <template v-if="$slots.header" #header><slot name="header"></slot></template>
    <template v-if="$slots['header-content']" #header-content>
      <slot name="header-content"></slot>
    </template>
    <template v-if="$slots.footer" #footer><slot name="footer"></slot></template>

    <template v-if="has_tabs" #sidebar>
      <div
        data-testid="tab-sheet__sidebar"
        :data-surface="surface"
        :class="[
          'hidden lg:pointer-fine:flex flex-col gap-10 p-4.5 shrink-0',
          sidebar_bg_class,
          parts?.sidebar
        ]"
      >
        <ui-button
          data-testid="tab-sheet__close-button"
          icon-left="close"
          icon-only
          aria-label="Close"
          @click="emit('close')"
        />

        <div
          data-testid="tab-sheet__tabs"
          role="tablist"
          aria-orientation="vertical"
          class="flex flex-col gap-2"
        >
          <button
            v-for="tab in tabs"
            :id="tabId(tab.value)"
            :key="tab.value"
            type="button"
            role="tab"
            data-testid="tab-sheet__tab"
            :aria-selected="tab.value === active"
            :aria-controls="tab_panel_id"
            :tabindex="tab.value === active ? 0 : -1"
            :data-active="tab.value === active"
            :class="[
              'text-left py-3 px-4 rounded-4 flex items-center gap-3 cursor-pointer text-brown-700 dark:text-brown-100 data-[active=true]:bg-(--theme-primary) data-[active=true]:text-(--theme-on-primary) hover:bg-(--theme-neutral) hover:text-(--theme-on-neutral) data-[active=false]:hover:[&_svg]:scale-120 data-[active=false]:hover:[&_svg]:rotate-6 [&_svg]:transition-transform [&_svg]:duration-75 focus:outline-none',
              parts?.tab
            ]"
            v-sfx.hover="tab.value === active ? '' : hover_sfx"
            @click="selectOption(tab.value)"
          >
            <ui-icon v-if="tab.icon" :src="tab.icon" class="w-6 h-6" />
            {{ tab.label }}
          </button>
        </div>
      </div>
    </template>

    <div
      :id="tab_panel_id"
      data-testid="tab-sheet__content"
      role="tabpanel"
      :class="['px-(--sheet-px) pb-8 pt-0', parts?.content]"
    >
      <slot></slot>
    </div>
  </mobile-sheet>
</template>
