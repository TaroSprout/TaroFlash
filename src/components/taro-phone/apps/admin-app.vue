<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppShell from '@/components/taro-phone/app-shell.vue'
import { useTaroPhoneStore } from '@/stores/taro-phone'
import { useAdminModal } from '@/composables/admin/use-admin-modal'

const { t } = useI18n()
const phone = useTaroPhoneStore()
const adminModal = useAdminModal()

function onPress() {
  phone.openApp(adminModal.open())
}
</script>

<template>
  <app-shell
    :title="t('phone.apps.admin.title')"
    data-palette="blue"
    icon-src="inventory"
    hover-icon-src="inventory-hover"
    @press="onPress"
  />
</template>
