import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// A GitHub project page is served from /<repo-name>/. The deploy workflow sets
// VITE_BASE from the repository name; local dev uses the same default.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/focus-web/',
  plugins: [react()],
  test: { environment: 'node' },
})
