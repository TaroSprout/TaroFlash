<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/supabase-client'
import { consumeOAuthPopupFlag } from '@/api/session'
import { consumeReturnDestination } from '@/composables/auth/return-destination'

const router = useRouter()

onMounted(async () => {
  await supabase.auth.getSession()

  // Popup flow: the opener tab owns the navigation (and consumes the return
  // destination), so this tab just closes itself.
  if (consumeOAuthPopupFlag()) {
    window.close()
    return
  }

  // Full-page redirect flow: this tab landed back here after the OAuth round
  // trip. Land on the originally-intended destination (stashed in
  // sessionStorage before the redirect), falling back to the dashboard.
  router.push(consumeReturnDestination() ?? { name: 'dashboard' })
})
</script>
