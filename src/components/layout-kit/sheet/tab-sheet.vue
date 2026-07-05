<script setup lang="ts">
import { computed, provide } from 'vue'
import { useI18n } from 'vue-i18n'
import mobileSheet, { type MobileSheetProps } from './mobile-sheet.vue'
import { SHEET_SIDEBAR_BG } from './sheet-surface'
import { activeTabKey } from './tab-sheet-context'
import { useMatchMedia } from '@/composables/ui/media-query'
import { emitSfx } from '@/sfx/bus'
import { TYPE_SFX, type SoundKey } from '@/sfx/config'
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
  sidebar_query?: string
  sheet_px?: string
  hover_sfx?: SoundKey | SoundKey[] | ''
  select_sfx?: SoundKey | ''
  reselect_sfx?: SoundKey | ''
  show_back?: boolean
}

const {
  tabs,
  parts,
  title,
  pattern_config,
  show_close_button = true,
  surface = 'standard',
  header_border = 'wave',
  sidebar_query = 'w>=lg & fine',
  sheet_px,
  hover_sfx = TYPE_SFX,
  select_sfx = 'select',
  reselect_sfx = 'digi_powerdown',
  show_back = false
} = defineProps<TabSheetProps>()

const { t } = useI18n()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'back'): void
  (e: 'select', value: string): void
  (e: 'reselect', value: string): void
}>()

defineSlots<{
  sidebar(): any
  overlay(): any
  header(): any
  'header-content'(): any
  default(): any
}>()

const active = defineModel<string>('active', { default: '' })
if (!active.value) active.value = tabs?.[0]?.value ?? ''
provide(activeTabKey, active)

const sidebar_bg_class = computed(() => SHEET_SIDEBAR_BG[surface])

const has_tabs = computed(() => !!tabs?.length)
// `sidebar_query` defaults to the CSS sidebar condition `lg:pointer-fine:flex`.
// Exposed below so parents read this one source of truth rather than
// re-deriving it (and drifting). Also hides mobile-sheet's close button while
// the sidebar — which carries its own close — is visible, so the user never
// sees two stacked close buttons.
const has_sidebar = useMatchMedia(sidebar_query)
const sheet_close_button = computed(
  () => (!has_tabs.value || !has_sidebar.value) && show_close_button
)
// The mobile/tablet close button (no sidebar) doubles as a back button whenever
// a tab is active — desktop keeps a real close button since it navigates tabs
// via the sidebar list, not a back stack.
const back_mode = computed(() => show_back && !has_sidebar.value)

defineExpose({ has_sidebar })

function onMobileSheetClose() {
  if (back_mode.value) emit('back')
  else emit('close')
}

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
</script>

<template>
  <mobile-sheet
    :title="title"
    :pattern_config="pattern_config"
    :show_close_button="sheet_close_button"
    :close_label="back_mode ? t('tab-sheet.back-label') : undefined"
    :close_icon="back_mode ? 'arrow-back' : 'close'"
    :surface="surface"
    :header_border="header_border"
    :sheet_px="sheet_px"
    @close="onMobileSheetClose"
  >
    <template v-if="$slots.overlay" #overlay><slot name="overlay"></slot></template>
    <template v-if="$slots.header" #header><slot name="header"></slot></template>
    <template v-if="$slots['header-content']" #header-content>
      <slot name="header-content"></slot>
    </template>
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
          @press="emit('close')"
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
            v-sfx="tab.value === active ? {} : { hover: hover_sfx }"
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
      :class="parts?.content"
    >
      <slot></slot>
    </div>
  </mobile-sheet>
</template>
