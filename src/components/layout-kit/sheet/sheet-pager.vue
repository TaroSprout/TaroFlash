<script setup lang="ts">
import { computed, provide, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import SheetFrame, { type SheetFrameProps } from './sheet-frame.vue'
import PagerIndex, { type PagerIndexGroup } from './pager-index.vue'
import { SHEET_SIDEBAR_BG } from './sheet-surface'
import { useSheetLayout, sheetLayoutKey } from './sheet-layout'
import { usePaneTransition } from './pane-transition'
import type { OptionsPanelEntry } from '@/components/ui-kit/options-panel/index.vue'
import { emitSfx } from '@/sfx/bus'
import { TYPE_SFX, type SoundKey } from '@/sfx/config'
import uid from '@/utils/uid'
import UiButton from '@/components/ui-kit/button.vue'
import UiIcon from '@/components/ui-kit/icon.vue'

export type Tab = {
  label: string
  value: string
  icon?: string
  danger?: boolean
  // Whether this tab appears as a sidebar entry on desktop. Defaults to true;
  // set false for tabs only reachable via the index or an aside affordance.
  sidebar?: boolean
}

export type SheetPagerGroup = {
  key: string
  heading: string
  entries: string[]
}

type PagerFrameProps = Pick<
  SheetFrameProps,
  'pattern_config' | 'title' | 'surface' | 'header_border' | 'show_close_button'
>

export type SheetPagerProps = PagerFrameProps & {
  tabs?: Tab[]
  groups?: SheetPagerGroup[]
  phone_query?: string
  desktop_query?: string
  between?: () => void | Promise<void>
  hover_sfx?: SoundKey | SoundKey[] | ''
  select_sfx?: SoundKey | ''
  reselect_sfx?: SoundKey | ''
}

const INDEX = 'index'

const {
  tabs,
  groups,
  title,
  pattern_config,
  show_close_button = true,
  surface = 'standard',
  header_border = 'wave',
  phone_query = 'w<md',
  desktop_query = 'w>=lg & fine',
  between,
  hover_sfx = TYPE_SFX,
  select_sfx = 'snappy_button_5',
  reselect_sfx = 'digi_powerdown'
} = defineProps<SheetPagerProps>()

const { t } = useI18n()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'back'): void
  (e: 'select', value: string): void
  (e: 'reselect', value: string): void
}>()

defineSlots<{
  default(props: { displayed_tab: string }): any
  aside(): any
  scrollbar(): any
  overlay(): any
  header(): any
  'header-content'(): any
  'index-footer'(): any
}>()

const active = defineModel<string | null>('active', { default: null })

const { layout_mode, sheet_px } = useSheetLayout({ phone_query, desktop_query })
provide(sheetLayoutKey, layout_mode)

const outlet = ref<HTMLElement>()
const { nav_direction, onPaneEnter, onPaneLeave } = usePaneTransition(layout_mode, outlet, {
  between: () => between?.()
})

const panel_id = `sheet-pager__panel--${uid()}`
const tab_id_prefix = `sheet-pager__tab--${uid()}--`

const sidebar_bg_class = computed(() => SHEET_SIDEBAR_BG[surface])
const has_sidebar = computed(() => layout_mode.value === 'desktop')
const sidebar_tabs = computed(() => (tabs ?? []).filter((tab) => tab.sidebar !== false))
const has_tabs = computed(() => sidebar_tabs.value.length > 0)

const displayed_tab = computed(() => {
  if (active.value !== null) return active.value
  return layout_mode.value === 'desktop' ? (sidebar_tabs.value[0]?.value ?? INDEX) : INDEX
})

const tab_by_value = computed(() => new Map((tabs ?? []).map((tab) => [tab.value, tab])))

const index_groups = computed<PagerIndexGroup[]>(() =>
  (groups ?? []).map((group) => ({
    key: group.key,
    heading: group.heading,
    entries: group.entries.map((value) => toEntry(value))
  }))
)

// Frame's own close button shows on phone/tablet (no sidebar), where it doubles
// as a back affordance once a tab is open. Desktop navigates via the sidebar,
// which carries its own close button.
const sheet_close_button = computed(
  () => (!has_tabs.value || !has_sidebar.value) && show_close_button
)
const back_mode = computed(() => active.value !== null && !has_sidebar.value)

defineExpose({ layout_mode, displayed_tab, has_sidebar })

function toEntry(value: string): OptionsPanelEntry {
  const tab = tab_by_value.value.get(value)
  return { value, label: tab?.label ?? value, icon: tab?.icon, danger: tab?.danger }
}

function tabId(value: string) {
  return `${tab_id_prefix}${value}`
}

function onFrameClose() {
  if (!back_mode.value) return emit('close')

  nav_direction.value = 'back'
  emit('back')
}

function selectTab(value: string) {
  if (value === displayed_tab.value) {
    if (reselect_sfx) emitSfx(reselect_sfx)
    emit('reselect', value)
    return
  }

  if (select_sfx) emitSfx(select_sfx)
  nav_direction.value = 'forward'
  active.value = value
  emit('select', value)
}

function onIndexNavigate(value: string) {
  nav_direction.value = 'forward'
  active.value = value
}
</script>

<template>
  <sheet-frame
    :title="title"
    :pattern_config="pattern_config"
    :show_close_button="sheet_close_button"
    :close_label="back_mode ? t('sheet-pager.back-label') : undefined"
    :close_icon="back_mode ? 'arrow-back' : 'close'"
    :surface="surface"
    :header_border="header_border"
    :sheet_px="sheet_px"
    @close="onFrameClose"
  >
    <template v-if="$slots.overlay" #overlay><slot name="overlay"></slot></template>
    <template v-if="$slots.header" #header><slot name="header"></slot></template>
    <template v-if="$slots['header-content']" #header-content>
      <slot name="header-content"></slot>
    </template>

    <template v-if="has_sidebar" #sidebar>
      <div
        data-testid="tab-sheet__sidebar"
        :data-surface="surface"
        :class="['flex flex-col gap-10 p-4.5 shrink-0', sidebar_bg_class]"
      >
        <ui-button
          data-testid="tab-sheet__close-button"
          icon-left="close"
          icon-only
          :aria-label="t('sheet-frame.close-label')"
          @press="emit('close')"
        />

        <div
          data-testid="tab-sheet__tabs"
          role="tablist"
          aria-orientation="vertical"
          class="flex flex-col gap-2"
        >
          <button
            v-for="tab in sidebar_tabs"
            :id="tabId(tab.value)"
            :key="tab.value"
            type="button"
            role="tab"
            data-testid="tab-sheet__tab"
            :aria-selected="tab.value === displayed_tab"
            :aria-controls="panel_id"
            :tabindex="tab.value === displayed_tab ? 0 : -1"
            :data-active="tab.value === displayed_tab"
            :class="[
              'text-left py-3 px-4 rounded-4 flex items-center gap-3 cursor-pointer data-[active=false]:hover:[&_svg]:scale-120 data-[active=false]:hover:[&_svg]:rotate-6 [&_svg]:transition-transform [&_svg]:duration-75 focus:outline-none',
              tab.danger
                ? 'text-red-500 dark:text-red-600 hover:bg-red-500/10 dark:hover:bg-red-400/10 data-[active=true]:bg-red-500 dark:data-[active=true]:bg-red-600 data-[active=true]:text-white'
                : 'text-brown-700 dark:text-brown-100 data-[active=true]:bg-(--theme-primary) data-[active=true]:text-(--theme-on-primary) hover:bg-(--theme-neutral) hover:text-(--theme-on-neutral)'
            ]"
            v-sfx="tab.value === displayed_tab ? {} : { hover: hover_sfx }"
            @click="selectTab(tab.value)"
          >
            <ui-icon v-if="tab.icon" :src="tab.icon" class="w-6 h-6" />
            {{ tab.label }}
          </button>
        </div>
      </div>
    </template>

    <div data-testid="sheet-pager__content-row" class="flex h-full items-start">
      <div
        data-testid="sheet-pager__pane-column"
        class="relative flex flex-1 flex-col min-w-0"
        :class="layout_mode !== 'phone' && 'max-h-full'"
      >
        <div
          :id="panel_id"
          ref="outlet"
          data-testid="sheet-pager__main"
          role="tabpanel"
          :class="[
            'flex flex-col gap-4 w-full',
            layout_mode === 'phone'
              ? 'max-w-111 mx-auto overflow-hidden pt-0.5'
              : 'min-h-0 flex-1 overflow-y-auto scroll-hidden px-(--sheet-px) pb-8'
          ]"
        >
          <transition :css="false" mode="out-in" @leave="onPaneLeave" @enter="onPaneEnter">
            <pager-index
              v-if="displayed_tab === INDEX"
              key="index"
              :groups="index_groups"
              @navigate="onIndexNavigate"
            >
              <template v-if="$slots['index-footer']" #footer>
                <slot name="index-footer"></slot>
              </template>
            </pager-index>

            <div v-else :key="displayed_tab" data-testid="sheet-pager__pane" class="w-full">
              <slot :displayed_tab="displayed_tab"></slot>
            </div>
          </transition>
        </div>

        <slot name="scrollbar"></slot>
      </div>

      <slot name="aside"></slot>
    </div>
  </sheet-frame>
</template>
