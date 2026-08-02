import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: /^animal-island-ui$/,
        replacement: fileURLToPath(new URL('./node_modules/animal-island-ui/dist/cjs/index.cjs', import.meta.url)),
      },
    ],
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
