import { defineConfig } from 'vite'
import type { UserConfig } from 'vitest/config'
import path from 'path'
import fs from 'fs'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

import { VitePWA } from 'vite-plugin-pwa'

// Manually load environment variables from env.FrontEnd
const envFile = path.resolve(__dirname, 'env.FrontEnd')
const localEnv: Record<string, string> = {}
if (fs.existsSync(envFile)) {
  const content = fs.readFileSync(envFile, 'utf-8')
  content.split('\n').filter(Boolean).forEach(line => {
    const [key, ...value] = line.split('=')
    if (key && value) {
      localEnv[key.trim()] = value.join('=').trim()
    }
  })
}

// Prefer project-local env file in development to avoid stale shell env overrides.
const getEnv = (key: string) => localEnv[key] || process.env[key] || '';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'Tea Planter',
        short_name: 'TeaPlanter',
        description: 'Intelligent Plantation Management System',
        theme_color: '#059669',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    'import.meta.env.VITE_CLERK_PUBLISHABLE_KEY': JSON.stringify(getEnv('VITE_CLERK_PUBLISHABLE_KEY')),
    'import.meta.env.VITE_ML_API_URL': JSON.stringify(getEnv('VITE_ML_API_URL')),
    'import.meta.env.VITE_API_BASE_URL': JSON.stringify(getEnv('VITE_API_BASE_URL')),
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
} as UserConfig)
