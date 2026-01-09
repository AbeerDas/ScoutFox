import { defineConfig } from 'wxt';
import react from '@vitejs/plugin-react';

// https://wxt.dev/api/config.html
export default defineConfig({
  manifest: {
    name: 'ScoutFox - Amazon to YouTube Reviews',
    description: 'Find YouTube reviews for Amazon products',
    permissions: ['storage', 'activeTab', 'scripting', 'tabs'],
    host_permissions: ['*://*.amazon.com/*', '*://*.youtube.com/*'],
  },
  // Content scripts are automatically detected from entrypoints/content.ts
  vite: () => ({
    plugins: [react()],
    css: {
      postcss: {
        plugins: [
          require('tailwindcss'),
          require('autoprefixer'),
        ],
      },
    },
  }),
});
