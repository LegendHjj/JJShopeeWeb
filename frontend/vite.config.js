import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Change the 'base' to match your GitHub repo name.
// If your GitHub Pages URL is: https://legendhjj.github.io/ShopeeWeb/
// then base = '/ShopeeWeb/'
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 3000,
    host: true,
    // No proxy needed — frontend talks directly to Firestore
  }
})
