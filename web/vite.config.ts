import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  // `npm run deploy` builds with --mode deploy (web/.env.deploy.local): never ship the emulator config.
  if (mode === 'deploy') {
    const env = loadEnv(mode, process.cwd())
    if (env.VITE_USE_EMULATOR !== 'false' || !env.VITE_FIREBASE_PROJECT_ID || env.VITE_FIREBASE_PROJECT_ID.startsWith('demo-')) {
      throw new Error('Deploy build needs the real Firebase config with VITE_USE_EMULATOR=false (web/.env.deploy.local).')
    }
    // .env.local is read in every mode, so its local Worker address would leak in unless .env.deploy.local overrides it
    // (empty = no SMS server yet).
    if (env.VITE_WORKER_URL && !env.VITE_WORKER_URL.startsWith('https://')) {
      throw new Error('VITE_WORKER_URL must be the deployed https Worker, or empty, in web/.env.deploy.local.')
    }
    if (env.VITE_MAIN_ORIGIN && !/^https:\/\/[a-z0-9.-]+$/.test(env.VITE_MAIN_ORIGIN)) {
      throw new Error('VITE_MAIN_ORIGIN must be https://<domain> with no path (web/.env.deploy.local).')
    }
  }
  return {
    // The start-up chunk is mostly the Firebase SDK (Firestore with its offline cache); rarely used screens are split off.
    // Deploy builds go to their own folder so the emulator build in dist/ (local preview) is never shipped by mistake.
    build: { chunkSizeWarningLimit: 900, outDir: mode === 'deploy' ? 'dist-deploy' : 'dist' },
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'prompt',
        includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
        manifest: {
          name: 'MediBooks — M/S Allopathic Store & Surgical',
          short_name: 'MediBooks',
          description: 'কাস্টমারের বাকি ও জমার হিসাব',
          lang: 'bn',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          orientation: 'any',
          theme_color: '#0f766e',
          background_color: '#f8fafc',
          icons: [
            { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
          navigateFallback: '/index.html',
          // Firebase's own pages (password reset links: /__/auth/action) must reach Hosting, not the app.
          navigateFallbackDenylist: [/^\/__\//],
        },
      }),
    ],
  }
})
