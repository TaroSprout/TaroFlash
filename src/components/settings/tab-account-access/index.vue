<script setup lang="ts">
import { ref } from 'vue'
import SectionList from '@/components/layout-kit/section-list.vue'
import SettingsBackButton from '../settings-back-button.vue'
import AccountAccessContent, {
  type AccountAccessContentPage
} from '../account-access/account-access-content.vue'

const emit = defineEmits<{ back: [] }>()

const page = ref<AccountAccessContentPage>('menu')

function onBack() {
  if (page.value === 'menu') emit('back')
  else page.value = 'menu'
}
</script>

<template>
  <section-list
    data-testid="tab-account-access"
    class="px-(--settings-padding) pb-(--settings-padding)"
  >
    <settings-back-button @back="onBack" />
    <account-access-content v-model:page="page" />
  </section-list>
</template>
