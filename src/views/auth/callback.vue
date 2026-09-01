<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/supabase-client'
import { consumeOAuthPopupFlag, isNewAccountSession } from '@/api/session'
import { consumeReturnDestination } from '@/composables/auth/return-destination'
import { useTracking } from '@/composables/tracking'

const router = useRouter()
const tracking = useTracking()

onMounted(async () => {
  await supabase.auth.getSession()

  // Popup flow: the opener owns the navigation and tracks completion, so this tab just closes.
  if (consumeOAuthPopupFlag()) {
    window.close()
    return
  }

  // Redirect flow: this tab resolves, so it tracks a new account.
  if (await isNewAccountSession()) tracking.trackSignupCompleted()

  // Land on the destination stashed before the OAuth round trip, falling back to the dashboard.
  router.push(consumeReturnDestination() ?? { name: 'dashboard' })
})
</script>
