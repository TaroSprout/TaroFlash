import { createRouter, createWebHistory } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import { useMemberStore } from '@/stores/member'
import { prefetchMemberDecks } from '@/api/decks'
import { prefetchMemberById } from '@/api/members'
import { usePendingDeletionNotice } from '@/composables/member/pending-deletion-notice'
import AuthenticatedView from '@/views/app-shell/authenticated.vue'

const WelcomeView = () => import('@/views/welcome/index.vue')
const PrivacyPolicyView = () => import('@/views/privacy-policy.vue')
const TermsOfServiceView = () => import('@/views/terms-of-service.vue')
const AuthCallbackView = () => import('@/views/auth/callback.vue')
const Dashboard = () => import('@/views/dashboard/index.vue')
const DeckView = () => import('@/views/deck/deck-view.vue')
const LessonView = () => import('@/views/audio-reader/lesson/index.vue')

// Resolves the member row before a guard reads any field off it. The store is a
// projection of a query App.vue starts reactively and nothing awaits, so a
// direct URL hit can otherwise read an empty role, or an unset pending flag,
// mid-restore. Colada dedupes, so this joins the in-flight fetch rather than
// issuing a second one.
async function resolveMember() {
  const id = useSessionStore().user?.id
  if (id) await prefetchMemberById(id).catch(() => {})

  return useMemberStore()
}

// Mirrors useCan().useAudioReader (admin-only). The real boundary is the edge
// functions; this just keeps non-admins out of the UI.
async function requireAudioReader() {
  const member = await resolveMember()
  if (member.role !== 'admin') return { name: 'dashboard' }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  // The app scrolls the page (not inner containers), so reset to the top on each
  // navigation — including chapter-to-chapter param changes — and restore the
  // saved position on back/forward.
  scrollBehavior(_to, _from, savedPosition) {
    return savedPosition ?? { top: 0 }
  },
  routes: [
    {
      path: '/welcome',
      name: 'welcome',
      component: WelcomeView
    },
    {
      path: '/privacy',
      name: 'privacy-policy',
      component: PrivacyPolicyView
    },
    {
      path: '/terms',
      name: 'terms-of-service',
      component: TermsOfServiceView
    },
    {
      path: '/auth/callback',
      name: 'auth-callback',
      component: AuthCallbackView
    },
    {
      path: '/',
      name: 'authenticated',
      component: AuthenticatedView,
      redirect: '/dashboard',
      beforeEnter: async () => {
        const session = useSessionStore()
        const authenticated = await session.restoreSession()

        if (!authenticated) return { name: 'welcome' }

        // Sign-in is deliberately not blocked for a pending-deletion account —
        // blocking it would take away the session the restore needs. The divert
        // happens here instead, on the app shell rather than on the dashboard,
        // so a bookmarked deck or a shared lesson link lands on the restore
        // dialog too.
        //
        // The panel is opened here rather than from welcome's own mount: when
        // the member signs in from welcome, this divert resolves to the route
        // they're already on, so welcome never remounts and an onMounted
        // trigger would never fire. `open()` collapses repeat calls onto one
        // panel, which is what makes calling it on every divert safe.
        const member = await resolveMember()

        if (member.pending_deletion) {
          usePendingDeletionNotice().open()
          return { name: 'welcome' }
        }

        // Fire decks in parallel with the lazy route chunk fetch so the
        // dashboard / deck view renders against warm cache. The member fetch
        // (which brings its plan limits along via an embedded join) doesn't
        // need the same explicit prefetch — App.vue's member store is
        // mounted at the app root and already starts fetching reactively
        // the moment restoreSession() above sets session.user.
        //
        // Pointless for a pending member (RLS returns nothing), hence after the
        // divert rather than before it.
        prefetchMemberDecks()
      },
      children: [
        {
          path: 'dashboard',
          name: 'dashboard',
          component: Dashboard
        },
        {
          path: 'deck/:id',
          name: 'deck',
          component: DeckView,
          props: true
        },
        {
          path: 'audio-reader/collection/:collectionId/lesson/:lessonId',
          name: 'lesson',
          component: LessonView,
          props: true,
          beforeEnter: requireAudioReader
        }
      ]
    }
  ]
})

export default router
