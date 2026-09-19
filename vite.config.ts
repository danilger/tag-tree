import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { tagTreeFileApi } from './vite-file-api'

const appDir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react(), tagTreeFileApi()],
  publicDir: path.join(appDir, '.generated'),
  server: {
    host: '0.0.0.0',
    port: Number(process.env.TAG_TREE_PORT || 5174),
    strictPort: true,
  },
})
