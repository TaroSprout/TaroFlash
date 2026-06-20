<script setup lang="ts">
import LoginDialogue from '@/views/welcome/login-dialog.vue'
import { useI18n } from 'vue-i18n'
import UiIcon from '@/components/ui-kit/icon.vue'
import UiPopover from '@/components/ui-kit/popover.vue'
import UiTooltip from '@/components/ui-kit/tooltip.vue'
import { ref } from 'vue'
import { emitSfx } from '@/sfx/bus'

const { t } = useI18n()

const login_dropdown_open = ref(false)

function openLoginDropdown() {
  login_dropdown_open.value = true
  emitSfx('snappy_button_5')
}

function closeLoginDropdown() {
  login_dropdown_open.value = false
  emitSfx('snappy_button_5')
}

function triggerLoginDropdown() {
  if (login_dropdown_open.value) {
    closeLoginDropdown()
    return
  }

  openLoginDropdown()
}
</script>

<template>
  <nav
    data-testid="welcome-hero__nav"
    class="w-full max-w-(--page-width) mx-auto px-4 sm:px-16 flex justify-between items-center relative z-5"
  >
    <div data-testid="welcome-hero__brand" class="flex items-center gap-1">
      <ui-icon src="logo" class="size-9 text-brown-100" />
      <span class="text-3xl text-brown-100">{{ t('app.title') }}</span>
      <ui-tooltip
        element="span"
        position="bottom"
        data-testid="welcome-hero__beta"
        :text="t('welcome-view.hero.beta-tooltip')"
        class="ml-1 rounded-3 bg-pink-400 px-2.5 py-0.5 text-lg text-brown-100 cursor-default"
      >
        {{ t('welcome-view.hero.beta-pill') }}
      </ui-tooltip>
    </div>

    <ui-popover
      :open="login_dropdown_open"
      :gap="4"
      :use_arrow="false"
      :clip="false"
      position="bottom-end"
      @close="closeLoginDropdown"
    >
      <template #trigger>
        <button
          data-testid="welcome-hero__login-trigger"
          class="bg-brown-100 text-brown-700 px-4 py-2.5 rounded-2.5 text-lg cursor-pointer"
          :class="{ 'rounded-b-0.5': login_dropdown_open }"
          @click="triggerLoginDropdown"
        >
          {{ t('welcome-view.login-button') }}
        </button>
      </template>

      <LoginDialogue />
    </ui-popover>
  </nav>
</template>
