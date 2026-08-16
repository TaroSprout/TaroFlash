<script lang="ts" setup>
import { computed, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { type SoundKey } from '@/sfx/config'
import { emitSfx } from '@/sfx/bus'
import { type ModalCloseFn, useModalRequestClose } from '@/composables/modal'

export type AlertType = 'warn' | 'info'

const { cancelLabel, confirmLabel, close, cancelAudio, confirmAudio, type } = defineProps<{
  cancelLabel?: string
  confirmLabel?: string
  message?: string
  title?: string
  type?: AlertType
  cancelAudio?: SoundKey
  confirmAudio?: SoundKey
  close: ModalCloseFn<boolean>
}>()

const { t } = useI18n()

const cancel_btn = useTemplateRef('cancel_btn')
const confirm_btn = useTemplateRef('confirm_btn')

const cancelText = computed(() => cancelLabel ?? t('ui-kit.alert.cancel'))
const confirmText = computed(() => confirmLabel ?? t('ui-kit.alert.continue'))
const palette = computed(() => ((type ?? 'warn') === 'warn' ? 'danger' : 'info'))

useModalRequestClose(onCancel)

function onCancel() {
  if (cancelAudio) emitSfx(cancelAudio)
  close(false)
}

function onConfirm() {
  if (confirmAudio) emitSfx(confirmAudio)
  close(true)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
  e.preventDefault()
  if (document.activeElement === cancel_btn.value) confirm_btn.value?.focus()
  else cancel_btn.value?.focus()
}
</script>

<template>
  <div
    data-testid="ui-kit-alert"
    data-station="float"
    class="rounded-2 shadow-lg max-xs:mx-4 max-xs:w-auto max-xs:max-w-full flex w-115 max-w-115 flex-col bg-surface"
  >
    <div data-testid="ui-kit-alert__body" class="flex flex-col gap-2 p-10">
      <h1 class="text-ink text-3xl">{{ title ?? t('ui-kit.alert.title-default') }}</h1>
      <p class="text-ink-muted">{{ message ?? t('ui-kit.alert.message-default') }}</p>
    </div>

    <div
      data-testid="ui-kit-alert__actions"
      class="border-line divide-line max-xs:flex-col max-xs:divide-x-0 max-xs:divide-y flex w-full divide-x border-t"
      @keydown="onKeydown"
    >
      <button
        ref="cancel_btn"
        data-testid="ui-kit-alert__cancel"
        class="ui-kit-alert__cancel group"
        @click="onCancel"
        v-sfx="{ hover: 'ui.hover' }"
      >
        {{ cancelText }}
        <div class="ui-kit-alert__hover-effect group-hover:opacity-100! group-focus:opacity-100!">
          <span>{{ cancelText }}</span>
        </div>
      </button>

      <button
        v-if="confirmLabel"
        ref="confirm_btn"
        data-testid="ui-kit-alert__confirm"
        :data-palette="palette"
        class="ui-kit-alert__confirm group"
        @click="onConfirm"
        v-sfx="{ hover: 'ui.hover' }"
      >
        {{ confirmText }}
        <div class="ui-kit-alert__hover-effect group-hover:opacity-100! group-focus:opacity-100!">
          <span>{{ confirmText }}</span>
        </div>
      </button>
    </div>
  </div>
</template>

<style>
.ui-kit-alert__cancel,
.ui-kit-alert__confirm {
  position: relative;

  padding: 16px;
  width: 100%;

  color: var(--color-ink);
  font-size: var(--text-lg);
  line-height: var(--text-lg--line-height);

  cursor: pointer;
}

.ui-kit-alert__hover-effect {
  position: absolute;
  inset: -4px;

  display: flex;
  align-items: center;
  justify-content: center;

  padding: 3px;
  opacity: 0;
  background-size: 400% 400%;
  border-radius: var(--radius-2);

  transition: all 100ms ease-in-out;
  animation: background-slide 2s linear infinite;
  outline: none;
}

.ui-kit-alert__cancel .ui-kit-alert__hover-effect {
  background-color: var(--color-raised-pattern);
  color: var(--color-ink-muted);
}

.ui-kit-alert__confirm .ui-kit-alert__hover-effect {
  color: var(--color-accent);
  background-image: linear-gradient(
    to right bottom in oklab,
    var(--color-accent) 30%,
    var(--color-accent-muted) 50%,
    var(--color-accent) 70%
  );
}

.ui-kit-alert__hover-effect span {
  display: flex;
  align-items: center;
  justify-content: center;

  height: 100%;
  width: 100%;

  background-color: var(--color-surface);
  border-radius: var(--radius-1_5);
}
</style>
