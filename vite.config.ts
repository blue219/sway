import { defineConfig } from 'vite'
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
})
