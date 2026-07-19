<script lang="ts" setup>
import { computed, onMounted, ref, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'
import UiInput from '@/components/ui-kit/input.vue'
import { type ModalCloseFn } from '@/composables/modal'
import { emitSfx } from '@/sfx/bus'
import { type SoundKey } from '@/sfx/config'

type UiPromptProps = {
  title: string
  message?: string
  label?: string
  placeholder?: string
  initialValue?: string
  confirmLabel: string
  cancelLabel?: string
  maxLength?: number
  cancelAudio?: SoundKey
  confirmAudio?: SoundKey
  close: ModalCloseFn<string>
}

const {
  initialValue = '',
  maxLength = 60,
  close,
  cancelAudio,
  confirmAudio
} = defineProps<UiPromptProps>()

const { t } = useI18n()

const root = useTemplateRef<HTMLElement>('root')
const value = ref(initialValue)
const dirty = ref(false)

const trimmed = computed(() => value.value.trim())
// Only nags once the user has typed and cleared it — an untouched field
// shouldn't open already complaining.
const error = computed(() => {
  if (!dirty.value || trimmed.value) return undefined
  return t('ui-kit.prompt.required-error')
})

onMounted(() => root.value?.querySelector('input')?.focus())

function onConfirm() {
  dirty.value = true
  if (!trimmed.value) return

  if (confirmAudio) emitSfx(confirmAudio)
  close(trimmed.value)
}

function onCancel() {
  if (cancelAudio) emitSfx(cancelAudio)
  close(undefined)
}
</script>

<template>
  <div
    data-testid="ui-kit-prompt-container"
    class="absolute inset-0 flex items-center justify-center"
  >
    <div
      ref="root"
      data-testid="ui-kit-prompt"
      data-theme="brown-100"
      data-theme-dark="stone-700"
      class="rounded-2 shadow-lg flex w-115 max-w-115 flex-col gap-6 bg-white p-10 dark:bg-stone-800"
      v-bind="$attrs"
    >
      <div data-testid="ui-kit-prompt__body" class="flex flex-col gap-2">
        <h1 class="text-3xl text-brown-700 dark:text-brown-100">{{ title }}</h1>
        <p v-if="message" class="text-base text-brown-500">{{ message }}</p>
      </div>

      <ui-input
        v-model:value="value"
        data-testid="ui-kit-prompt__input"
        size="base"
        :label="label"
        :placeholder="placeholder"
        :max-length="maxLength"
        :error="error"
        @keydown.enter="onConfirm"
        @input="dirty = true"
      />

      <div data-testid="ui-kit-prompt__actions" class="flex justify-end gap-2">
        <ui-button
          data-testid="ui-kit-prompt__cancel"
          data-theme="brown-500"
          variant="ghost"
          @press="onCancel"
        >
          {{ cancelLabel ?? t('ui-kit.prompt.cancel') }}
        </ui-button>

        <ui-button
          data-testid="ui-kit-prompt__confirm"
          data-theme="green-400"
          :disabled="!trimmed"
          click-when-disabled
          @press="onConfirm"
        >
          {{ confirmLabel }}
        </ui-button>
      </div>
    </div>
  </div>
</template>
