<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import DialogCard from '@/components/layout-kit/dialog-card/index.vue'
import UiButton from '@/components/ui-kit/button.vue'
import AccountAccessContent, { type AccountAccessContentPage } from './account-access-content.vue'
import { emitSfx } from '@/sfx/bus'

defineProps<{ close: () => void }>()

const { t } = useI18n()

const page = ref<AccountAccessContentPage>('menu')
const content = useTemplateRef<{ title: string }>('content')

onMounted(() => emitSfx('wooden_chime_ring'))
onBeforeUnmount(() => emitSfx('pop_up_close'))
</script>

<template>
  <dialog-card
    data-testid="account-access-modal"
    class="gap-0!"
    size="sm"
    float_header
    :title="content?.title"
    @close="close()"
  >
    <template #header-start>
      <ui-button
        v-if="page === 'menu'"
        data-testid="dialog-card__close"
        icon-left="close"
        icon-only
        rounded-full
        @press="close()"
      >
        {{ t('dialog-card.close-label') }}
      </ui-button>

      <ui-button
        v-else
        data-testid="account-access-modal__back"
        icon-left="arrow-back"
        icon-only
        rounded-full
        :sfx="{ press: 'snappy_button_5' }"
        @press="page = 'menu'"
      >
        {{ t('account-access-modal.back-label') }}
      </ui-button>
    </template>

    <account-access-content ref="content" v-model:page="page" :close="close" />
  </dialog-card>
</template>
