import { fileURLToPath, URL } from 'node:url'
import { resolve, dirname } from 'node:path'
import { defineConfig } from 'vitepress'
import tailwindcss from '@tailwindcss/vite'
import svgLoader from 'vite-svg-loader'
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'

const frontendSidebar = [
  {
    text: 'UI Kit',
    collapsed: true,
    items: [
      { text: 'Button', link: '/components/button' },
      { text: 'Icon', link: '/components/icon' },
      { text: 'Image', link: '/components/image' },
      { text: 'Modal', link: '/components/modal' },
      { text: 'Popover', link: '/components/popover' },
      { text: 'Radio', link: '/components/radio' },
      { text: 'Slider', link: '/components/slider' }
    ]
  },
  {
    text: 'Layout Kit',
    collapsed: true,
    items: [{ text: 'Mobile Sheet', link: '/components/mobile-sheet' }]
  },
  {
    text: 'Modal System',
    collapsed: true,
    items: [
      { text: 'Overview', link: '/modal/index' },
      { text: 'Modes & Backdrop', link: '/modal/modes' },
      { text: 'Response & Close', link: '/modal/response' },
      { text: 'Stacking', link: '/modal/stacking' },
      { text: 'Intercepting Close', link: '/modal/request-close' },
      { text: 'Context Injection', link: '/modal/context' },
      { text: 'API Reference', link: '/modal/reference' }
    ]
  },
  {
    text: 'Server State',
    collapsed: true,
    items: [{ text: 'Overview', link: '/state/index' }]
  },
  {
    text: 'TaroPhone',
    collapsed: true,
    items: [
      { text: 'Overview', link: '/phone/index' },
      { text: 'App Structure', link: '/phone/app-types' },
      { text: 'App Logic', link: '/phone/controllers' },
      { text: 'Notifications', link: '/phone/notifications' },
      { text: 'Shared State', link: '/phone/context' },
      { text: 'API Reference', link: '/phone/reference' }
    ]
  }
]

const backendSidebar = [
  {
    text: 'Supabase',
    items: [
      { text: 'Setup & Migrations', link: '/supabase/index' },
      { text: 'Vault Secrets', link: '/supabase/vault' },
      { text: 'Edge Functions', link: '/supabase/edge-functions' }
    ]
  }
]

const devopsSidebar = [
  {
    text: 'DevOps',
    items: [
      { text: 'Deployments', link: '/devops/index' },
      { text: 'Vite Plugins', link: '/devops/vite-plugins' }
    ]
  }
]

export default defineConfig({
  srcDir: 'src',
  title: 'TaroFlash Docs',
  description: 'Documentation for TaroFlash',
  lastUpdated: true,
  themeConfig: {
    nav: [
      { text: 'Frontend Docs', link: '/components/button' },
      { text: 'Backend Docs', link: '/supabase/index' },
      { text: 'DevOps', link: '/devops/index' },
      { text: 'Design System', link: '/design-system/index' }
    ],

    sidebar: {
      '/components/': frontendSidebar,
      '/modal/': frontendSidebar,
      '/phone/': frontendSidebar,
      '/state/': frontendSidebar,
      '/supabase/': backendSidebar,
      '/devops/': devopsSidebar,
      '/design-system/': [
        {
          text: 'Design System',
          items: [
            { text: 'Overview', link: '/design-system/index' },
            { text: 'Theming', link: '/design-system/theming' },
            { text: 'Colors & Palette', link: '/design-system/colors' }
          ]
        }
      ]
    },

    socialLinks: [{ icon: 'github', link: 'https://github.com/TaroSprout/TaroFlash' }]
  },
  vite: {
    plugins: [
      tailwindcss(),
      svgLoader(),
      VueI18nPlugin({
        include: resolve(dirname(fileURLToPath(import.meta.url)), '../../src/locales/**'),
        strictMessage: false
      })
    ],
    define: {
      __VUE_PROD_DEVTOOLS__: false
    },
    ssr: {
      noExternal: ['vue-i18n']
    },
    resolve: {
      alias: {
        '@': resolve(dirname(fileURLToPath(import.meta.url)), '../../src'),
        '@base': resolve(dirname(fileURLToPath(import.meta.url)), '../..')
      }
    }
  }
})
