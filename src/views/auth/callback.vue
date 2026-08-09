<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/supabase-client'
import { consumeOAuthPopupFlag } from '@/api/session'
import { consumeReturnDestination } from '@/composables/auth/return-destination'

const router = useRouter()

onMounted(async () => {
  await supabase.auth.getSession()

  // Popup flow: the opener tab owns the navigation, so this tab just closes itself.
  if (consumeOAuthPopupFlag()) {
    window.close()
    return
  }

  // Redirect flow: land on the destination stashed before the OAuth round trip, falling back to the dashboard.
  router.push(consumeReturnDestination() ?? { name: 'dashboard' })
})
</script>
