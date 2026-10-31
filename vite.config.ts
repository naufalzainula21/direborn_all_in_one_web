import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // `npm run dev:api` serves the API on 8787 with a local database.
    proxy: { '/api': 'http://localhost:8787' },
  },
})
