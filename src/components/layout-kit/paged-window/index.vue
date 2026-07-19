<script setup lang="ts">
import { computed, provide, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AppWindow, { type AppWindowProps } from '@/components/layout-kit/app-window/index.vue'
import type { WindowSurface } from '@/components/layout-kit/app-window/surface'
import DirectoryPage, { type DirectoryPageGroup } from './directory-page.vue'
import { useWindowLayout, windowLayoutKey } from './layout'
import { usePageTransition } from './page-transition'
import type { OptionsPanelEntry } from '@/components/ui-kit/options-panel/index.vue'
import { emitSfx } from '@/sfx/bus'
import { TYPE_SFX, type SoundKey } from '@/sfx/config'
import uid from '@/utils/uid'
import UiButton from '@/components/ui-kit/button.vue'
import UiIcon from '@/components/ui-kit/icon.vue'

export type Page = {
  label: string
  value: string
  icon?: string
  danger?: boolean
  // Whether this page appears as a sidebar entry on desktop. Defaults to true;
  // set false for pages only reachable via the directory or an aside affordance.
  sidebar?: boolean
}

export type PagedWindowGroup = {
  key: string
  heading: string
  entries: string[]
}

type PagedWindowFrameProps = Pick<
  AppWindowProps,
  'pattern_config' | 'title' | 'surface' | 'header_border' | 'show_close_button'
>

export type PagedWindowProps = PagedWindowFrameProps & {
  pages?: Page[]
  groups?: PagedWindowGroup[]
  phone_query?: string
  desktop_query?: string
  between?: () => void | Promise<void>
  hover_sfx?: SoundKey | SoundKey[] | ''
  select_sfx?: SoundKey | ''
  reselect_sfx?: SoundKey | ''
  // Stretch the page column to the full content height instead of sizing it to
  // its content, so a page can pin its own footer to the bottom. Off by
  // default — pages sit at the top and end where their content does.
  stretch_page?: boolean
}

const DIRECTORY = 'directory'

const SIDEBAR_BG: Record<WindowSurface, string> = {
  standard: 'bg-brown-200 dark:bg-grey-900',
  inverted: 'bg-brown-300 dark:bg-grey-800'
}

const {
  pages,
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
  reselect_sfx = 'digi_powerdown',
  stretch_page = false
} = defineProps<PagedWindowProps>()

const { t } = useI18n()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'back'): void
  (e: 'select', value: string): void
  (e: 'reselect', value: string): void
}>()

defineSlots<{
  default(props: { displayed_page: string }): any
  aside(): any
  overlay(): any
  header(): any
  'header-content'(): any
  'directory-footer'(): any
}>()

const active = defineModel<string | null>('active', { default: null })

const { layout_mode, window_px } = useWindowLayout({ phone_query, desktop_query })
provide(windowLayoutKey, layout_mode)

const outlet = ref<HTMLElement>()
const { nav_direction, onPageEnter, onPageLeave } = usePageTransition(layout_mode, outlet, {
  between: () => between?.()
})

const panel_id = `paged-window__panel--${uid()}`
const page_id_prefix = `paged-window__page--${uid()}--`

const sidebar_bg_class = computed(() => SIDEBAR_BG[surface])
const has_sidebar = computed(() => layout_mode.value === 'desktop')
const sidebar_pages = computed(() => (pages ?? []).filter((page) => page.sidebar !== false))
const has_pages = computed(() => sidebar_pages.value.length > 0)

const displayed_page = computed(() => {
  if (active.value !== null) return active.value
  return layout_mode.value === 'desktop' ? (sidebar_pages.value[0]?.value ?? DIRECTORY) : DIRECTORY
})

const page_by_value = computed(() => new Map((pages ?? []).map((page) => [page.value, page])))

const directory_groups = computed<DirectoryPageGroup[]>(() =>
  (groups ?? []).map((group) => ({
    key: group.key,
    heading: group.heading,
    entries: group.entries.map((value) => toEntry(value))
  }))
)

// Window's own close button shows on phone/tablet (no sidebar), where it doubles
// as a back affordance once a page is open. Desktop navigates via the sidebar,
// which carries its own close button.
const window_close_button = computed(
  () => (!has_pages.value || !has_sidebar.value) && show_close_button
)
const back_mode = computed(() => active.value !== null && !has_sidebar.value)

defineExpose({ layout_mode, displayed_page, has_sidebar })

function toEntry(value: string): OptionsPanelEntry {
  const page = page_by_value.value.get(value)
  return { value, label: page?.label ?? value, icon: page?.icon, danger: page?.danger }
}

function pageId(value: string) {
  return `${page_id_prefix}${value}`
}

function onFrameClose() {
  if (!back_mode.value) return emit('close')

  nav_direction.value = 'back'
  emit('back')
}

function selectPage(value: string) {
  if (value === displayed_page.value) {
    if (reselect_sfx) emitSfx(reselect_sfx)
    emit('reselect', value)
    return
  }

  if (select_sfx) emitSfx(select_sfx)
  nav_direction.value = 'forward'
  active.value = value
  emit('select', value)
}

function onDirectoryNavigate(value: string) {
  nav_direction.value = 'forward'
  active.value = value
}
</script>

<template>
  <app-window
    :title="title"
    :pattern_config="pattern_config"
    :show_close_button="window_close_button"
    :close_label="back_mode ? t('paged-window.back-label') : undefined"
    :close_icon="back_mode ? 'arrow-back' : 'close'"
    :surface="surface"
    :header_border="header_border"
    :window_px="window_px"
    @close="onFrameClose"
  >
    <template v-if="$slots.overlay" #overlay><slot name="overlay"></slot></template>
    <template v-if="$slots.header" #header><slot name="header"></slot></template>
    <template v-if="$slots['header-content']" #header-content>
      <slot name="header-content"></slot>
    </template>

    <template v-if="has_sidebar" #sidebar>
      <div
        data-testid="paged-window__sidebar"
        :data-surface="surface"
        :class="['flex flex-col gap-10 p-4.5 shrink-0', sidebar_bg_class]"
      >
        <ui-button
          data-testid="paged-window__close-button"
          icon-left="close"
          icon-only
          :aria-label="t('app-window.close-label')"
          @press="emit('close')"
        />

        <div
          data-testid="paged-window__tabs"
          role="tablist"
          aria-orientation="vertical"
          class="flex flex-col gap-2"
        >
          <button
            v-for="page in sidebar_pages"
            :id="pageId(page.value)"
            :key="page.value"
            type="button"
            role="tab"
            data-testid="paged-window__tab"
            :aria-selected="page.value === displayed_page"
            :aria-controls="panel_id"
            :tabindex="page.value === displayed_page ? 0 : -1"
            :data-active="page.value === displayed_page"
            :class="[
              'text-left py-3 px-4 rounded-4 flex items-center gap-3 cursor-pointer data-[active=false]:hover:[&_svg]:scale-120 data-[active=false]:hover:[&_svg]:rotate-6 [&_svg]:transition-transform [&_svg]:duration-75 focus:outline-none',
              page.danger
                ? 'text-red-500 dark:text-red-600 hover:bg-red-500/10 dark:hover:bg-red-400/10 data-[active=true]:bg-red-500 dark:data-[active=true]:bg-red-600 data-[active=true]:text-white'
                : 'text-brown-700 dark:text-brown-100 data-[active=true]:bg-(--theme-primary) data-[active=true]:text-(--theme-on-primary) hover:bg-(--theme-neutral) hover:text-(--theme-on-neutral)'
            ]"
            v-sfx="page.value === displayed_page ? {} : { hover: hover_sfx }"
            @click="selectPage(page.value)"
          >
            <ui-icon v-if="page.icon" :src="page.icon" class="w-6 h-6" />
            {{ page.label }}
          </button>
        </div>
      </div>
    </template>

    <div
      data-testid="paged-window__content-row"
      :data-stretch="stretch_page"
      class="flex h-full"
      :class="stretch_page ? 'items-stretch' : 'items-start'"
    >
      <div
        data-testid="paged-window__page-column"
        class="relative flex flex-1 flex-col min-w-0"
        :class="layout_mode !== 'phone' && 'max-h-full'"
      >
        <div
          :id="panel_id"
          ref="outlet"
          data-testid="paged-window__main"
          role="tabpanel"
          :class="[
            'flex flex-col gap-4 w-full',
            layout_mode === 'phone'
              ? 'max-w-111 mx-auto overflow-hidden pt-0.5'
              : 'min-h-0 flex-1 px-(--window-px) pb-8'
          ]"
        >
          <transition :css="false" mode="out-in" @leave="onPageLeave" @enter="onPageEnter">
            <directory-page
              v-if="displayed_page === DIRECTORY"
              key="directory"
              :groups="directory_groups"
              @navigate="onDirectoryNavigate"
            >
              <template v-if="$slots['directory-footer']" #footer>
                <slot name="directory-footer"></slot>
              </template>
            </directory-page>

            <div
              v-else
              :key="displayed_page"
              data-testid="paged-window__page"
              :data-stretch="stretch_page"
              class="w-full"
              :class="stretch_page && 'flex flex-1 flex-col'"
            >
              <slot :displayed_page="displayed_page"></slot>
            </div>
          </transition>
        </div>
      </div>

      <slot name="aside"></slot>
    </div>
  </app-window>
</template>
