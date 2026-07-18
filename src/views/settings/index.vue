<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, provide, ref, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import SettingsAside from './settings-aside.vue'
import SettingsSaveButton from './settings-save-button.vue'
import { settingsCloseKey } from './layout'
import { emitSfx } from '@/sfx/bus'
import { useMemberEditor, memberEditorKey } from '@/composables/member/editor'
import { PAGE_META, type PageValue } from './pages'
import { useMemberDangerActions, memberDangerActionsKey } from '@/composables/member/danger-actions'
import type { WindowLayout } from '@/components/layout-kit/paged-window/layout'
import { useAlert } from '@/composables/alert'
import { useModalRequestClose } from '@/composables/modal'
import { useAvatarPicker } from './use-avatar-picker'
import MemberCard from '@/components/member/member-card.vue'
import UiPinnedCard from '@/components/ui-kit/pinned-card.vue'
import ScrollBar from '@/components/ui-kit/scroll-bar.vue'
import PagedWindow, {
  type PagedWindowGroup,
  type Page
} from '@/components/layout-kit/paged-window/index.vue'
import TabProfile from './tab-profile/index.vue'
import TabSubscription from './tab-subscription/index.vue'
import TabApp from './tab-app/index.vue'
import TabDangerZone from './tab-danger-zone/index.vue'
import TabAccountAccess from './tab-account-access/index.vue'

export type ActivePage = PageValue

const { close } = defineProps<{ close: () => void }>()

const PAGE_COMPONENTS = {
  profile: TabProfile,
  app: TabApp,
  subscription: TabSubscription,
  'danger-zone': TabDangerZone,
  'account-access': TabAccountAccess
}

const { t } = useI18n()

const editor = useMemberEditor()
provide(memberEditorKey, editor)

const danger = useMemberDangerActions(close)
provide(memberDangerActionsKey, danger)

const alert = useAlert()
const { onEditAvatar } = useAvatarPicker(editor)

const active_page = ref<ActivePage | null>(null)

const pager = useTemplateRef<{ layout_mode: WindowLayout; displayed_page: string }>('pager')
const active_page_ref = useTemplateRef<{ onChromeBack?: () => boolean }>('active_page_ref')

const layout_mode = computed<WindowLayout>(() => pager.value?.layout_mode ?? 'phone')
const displayed_page = computed(() => pager.value?.displayed_page ?? 'directory')
provide(settingsCloseKey, close)

// account-access is reachable via the aside's edit button (tablet/desktop) or the
// phone-only index entry — it never appears as a sidebar page-bar icon itself.
const pages = computed<Page[]>(() =>
  (Object.keys(PAGE_META) as PageValue[]).map((value) => ({
    value,
    icon: PAGE_META[value].icon,
    label: t(PAGE_META[value].labelKey),
    danger: value === 'danger-zone',
    sidebar: value !== 'account-access'
  }))
)

const groups = computed<PagedWindowGroup[]>(() => [
  {
    key: 'account',
    heading: t('settings.index.account-heading'),
    entries:
      layout_mode.value === 'phone'
        ? ['profile', 'subscription', 'account-access']
        : ['profile', 'subscription']
  },
  {
    key: 'app',
    heading: t('settings.index.app-heading'),
    entries: ['app', 'danger-zone']
  }
])

const header_title = computed(() => t('settings.header.title'))

// Open/close sfx live on the modal itself so every callsite (phone launcher,
// dashboard edit button) sounds identically. Mirrors the deck-settings modal.
onMounted(() => emitSfx('snappy_button_3'))
onBeforeUnmount(() => emitSfx('pop_up_close'))

async function onClose() {
  if (!editor.is_dirty.value) return close()

  const { response } = alert.warn({
    title: t('settings.unsaved-alert.title'),
    message: t('settings.unsaved-alert.message'),
    confirmLabel: t('settings.unsaved-alert.confirm'),
    cancelLabel: t('settings.unsaved-alert.cancel')
  })
  if (await response) close()
}

useModalRequestClose(onClose)

function onBack() {
  emitSfx('snappy_button_5')
  active_page.value = null
}

function onChromeBack() {
  if (active_page_ref.value?.onChromeBack?.()) {
    emitSfx('snappy_button_5')
    return
  }
  onBack()
}

watch(layout_mode, (mode) => {
  if (mode !== 'phone' && active_page.value === 'account-access') active_page.value = null
})
</script>

<template>
  <paged-window
    ref="pager"
    data-testid="settings-container"
    data-theme="blue-500"
    data-theme-dark="blue-650"
    :data-layout="layout_mode"
    :class="[
      layout_mode === 'desktop' ? 'w-248!' : 'w-full! max-w-224',
      layout_mode !== 'phone' && 'h-187',
      layout_mode === 'phone' ? '[--settings-padding:var(--window-px)]' : '[--settings-padding:0px]'
    ]"
    :pages="pages"
    :groups="groups"
    phone_query="w<mlg"
    :pattern_config="{ pattern: 'diagonal-stripes', pattern_size: '48px', pattern_opacity: '0.15' }"
    v-model:active="active_page"
    @close="onClose"
    @back="onChromeBack"
  >
    <template #header-content>
      <div
        data-testid="settings__header"
        class="w-full flex flex-col"
        :class="
          layout_mode === 'phone' ? 'items-center text-center' : layout_mode === 'tablet' && 'pt-4'
        "
      >
        <h1
          data-testid="settings__header-title"
          class="flex items-center gap-3 text-5xl text-white"
        >
          {{ header_title }}
        </h1>
      </div>
    </template>

    <template #default="{ displayed_page: page }">
      <component :is="PAGE_COMPONENTS[page as PageValue]" ref="active_page_ref" />
    </template>

    <template #scrollbar>
      <scroll-bar
        v-if="layout_mode !== 'phone'"
        target="[data-testid='paged-window__main']"
        class="absolute top-2 bottom-2 right-2"
      />
    </template>

    <template #aside>
      <settings-aside
        v-if="layout_mode !== 'phone'"
        data-testid="settings__aside"
        class="shrink-0 self-end pb-8"
        :class="layout_mode === 'tablet' ? 'w-110 pt-56 pl-10 pr-26' : 'w-100 pt-60 pl-8 pr-16'"
      />
    </template>

    <template #directory-footer>
      <settings-save-button v-if="layout_mode === 'phone'" />
    </template>

    <template #overlay>
      <div
        v-if="layout_mode !== 'phone'"
        data-testid="settings__pinned-preview"
        class="pointer-events-auto absolute right-(--window-px) top-6"
      >
        <ui-pinned-card data-testid="settings__pinned-preview-inner">
          <member-card
            :created-at="editor.created_at.value"
            :display-name="editor.draft.display_name"
            :card-comment="editor.draft.description"
            :card-title="t('settings.preview.title-fallback')"
            :cover="editor.draft.cover_config"
            editable
            @edit-avatar="onEditAvatar"
          />
        </ui-pinned-card>
      </div>
    </template>
  </paged-window>
</template>
