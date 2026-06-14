import { fileURLToPath, URL } from 'node:url'
import { resolve, dirname } from 'node:path'
import svgLoader from 'vite-svg-loader'
import dataUriPlugin from './src/plugins/vite-datauri.ts'
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'
import { defineConfig, coverageConfigDefaults } from 'vite-plus'
import { playwright } from './tests/browser-provider.ts'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  server: {
    watch: {
      ignored: [
        '**/tests/**',
        '**/coverage/**',
        '**/__screenshots__/**',
        '**/.vitest-attachments/**'
      ]
    }
  },
  fmt: {
    semi: false,
    tabWidth: 2,
    singleQuote: true,
    printWidth: 100,
    trailingComma: 'none',
    sortPackageJson: false,
    ignorePatterns: []
  },
  lint: {
    ignorePatterns: ['dist/**', 'supabase/**'],
    options: {
      typeAware: true,
      typeCheck: false
    },
    rules: {
      'no-console': 'warn',
      'no-floating-promises': 'off'
    }
  },
  plugins: [
    {
      name: 'html-title',
      transformIndexHtml: (html) =>
        html.replace('%VITE_APP_TITLE%', process.env.VITE_APP_TITLE ?? 'TaroFlash')
    },
    vue(),
    vueJsx(),
    svgLoader(),
    dataUriPlugin(),
    tailwindcss(),
    VueI18nPlugin({
      include: resolve(dirname(fileURLToPath(import.meta.url)), './src/locales/**'),
      strictMessage: false
    })
  ],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: { label: 'Unit', color: 'blue' },
          include: ['tests/unit/**/*.test.js'],
          environment: 'jsdom',
          setupFiles: ['./tests/setup.js']
        }
      },
      {
        extends: true,
        optimizeDeps: {
          exclude: ['vite-plus/test']
        },
        test: {
          name: { label: 'Integration', color: 'green' },
          include: ['tests/integration/**/*.test.js'],
          setupFiles: ['./tests/setup-browser.js'],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }]
          }
        }
      },
      {
        extends: true,
        test: {
          name: { label: 'Contract', color: 'magenta' },
          include: ['tests/contract/**/*.test.js'],
          environment: 'node',
          setupFiles: ['./tests/contract/setup.js'],
          testTimeout: 15000,
          hookTimeout: 15000,
          retry: 1
        }
      }
    ],
    coverage: {
      enabled: true,
      include: ['src/**/*.{ts,vue}'],
      reporter: ['text', 'html', 'json', 'json-summary'],
      reportOnFailure: true,
      exclude: [
        '**/postcss.config.js',
        '**/App.vue',
        '**/main.ts',
        '**/supabase-client.ts',
        '**/router/**',
        '**/src/components/ui-kit/_index.ts',
        '**/src/utils/cover/index.ts',
        '**/types/**',
        '**/src/utils/logger.ts',
        '**/src/utils/uid.ts',
        ...coverageConfigDefaults.exclude
      ]
    }
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@type': fileURLToPath(new URL('./types', import.meta.url)),
      '@tests': fileURLToPath(new URL('./tests', import.meta.url))
    }
  }
})
