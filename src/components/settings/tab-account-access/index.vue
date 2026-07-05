<script setup lang="ts">
import { ref } from 'vue'
import SectionList from '@/components/layout-kit/section-list.vue'
import AccountAccessContent, {
  type AccountAccessContentPage
} from '../account-access/account-access-content.vue'

const page = ref<AccountAccessContentPage>('menu')

function onChromeBack() {
  if (page.value === 'menu') return false
  page.value = 'menu'
  return true
}

defineExpose({ onChromeBack })
</script>

<template>
  <section-list
    data-testid="tab-account-access"
    class="px-(--settings-padding) pb-(--settings-padding)"
  >
    <account-access-content v-model:page="page" />
  </section-list>
</template>
