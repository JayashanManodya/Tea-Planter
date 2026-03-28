import { defineConfig } from 'vite'
import path from 'path'
import fs from 'fs'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

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

// Helper to prioritize system process.env (Railway) over local file
const getEnv = (key: string) => process.env[key] || localEnv[key] || '';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
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
  }
})
