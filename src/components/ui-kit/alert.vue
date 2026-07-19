<script lang="ts" setup>
import { computed, onMounted, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { TYPE_SFX, type SoundKey } from '@/sfx/config'
import { emitSfx } from '@/sfx/bus'
import { type ModalCloseFn } from '@/composables/modal'
import { nextDepth, provideDepth, useAmbientDepth } from '@/composables/ui/depth'

export type AlertType = 'warn' | 'info'

const { cancelLabel, confirmLabel, close, cancelAudio, confirmAudio } = defineProps<{
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

// An alert is a modal: it floats one step above whatever opened it.
const ambient_depth = useAmbientDepth()
const depth = provideDepth(() => nextDepth(ambient_depth.value))

const cancel_btn = useTemplateRef('cancel_btn')
const confirm_btn = useTemplateRef('confirm_btn')

const cancelText = computed(() => cancelLabel ?? t('ui-kit.alert.cancel'))
const confirmText = computed(() => confirmLabel ?? t('ui-kit.alert.continue'))

onMounted(() => cancel_btn.value?.focus())

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
    data-testid="ui-kit-alert-container"
    class="absolute inset-0 flex items-center justify-center"
  >
    <div
      data-testid="ui-kit-alert"
      :data-depth="depth"
      class="rounded-2 shadow-lg flex w-115 max-w-115 flex-col bg-surface"
      :class="`ui-kit-alert--${type ?? 'warn'}`"
      v-bind="$attrs"
    >
      <div data-testid="ui-kit-alert__body" class="flex flex-col gap-2 p-10">
        <h1 class="text-ink text-3xl">{{ title ?? t('ui-kit.alert.title-default') }}</h1>
        <p class="text-ink-muted">{{ message ?? t('ui-kit.alert.message-default') }}</p>
      </div>

      <div
        data-testid="ui-kit-alert__actions"
        class="border-below divide-below flex w-full divide-x border-t"
        @keydown="onKeydown"
      >
        <button
          ref="cancel_btn"
          data-testid="ui-kit-alert__cancel"
          class="ui-kit-alert__cancel group"
          @click="onCancel"
          v-sfx="{ hover: TYPE_SFX }"
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
          class="ui-kit-alert__confirm group"
          @click="onConfirm"
          v-sfx="{ hover: TYPE_SFX }"
        >
          {{ confirmText }}
          <div class="ui-kit-alert__hover-effect group-hover:opacity-100! group-focus:opacity-100!">
            <span>{{ confirmText }}</span>
          </div>
        </button>
      </div>
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
  background-color: var(--color-brown-300);
  color: var(--color-brown-500);
}

.ui-kit-alert--warn .ui-kit-alert__confirm .ui-kit-alert__hover-effect {
  color: var(--color-red-600);
  background-image: linear-gradient(
    to right bottom in oklab,
    var(--color-red-600) 30%,
    var(--color-red-300) 50%,
    var(--color-red-600) 70%
  );
}

.ui-kit-alert--info .ui-kit-alert__confirm .ui-kit-alert__hover-effect {
  color: var(--color-blue-500);
  background-image: linear-gradient(
    to right bottom in oklab,
    var(--color-blue-500) 40%,
    var(--color-blue-400) 50%,
    var(--color-blue-500) 80%
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
