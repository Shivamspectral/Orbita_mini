import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Orbita Mini frontend (React + Vite + TS + Tailwind).
// Talks to the existing FastAPI backend at runtime via window.ORBITA_API_BASE
// (see index.html / api-config.js) -- no changes to backend/API contracts.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173
  }
})
