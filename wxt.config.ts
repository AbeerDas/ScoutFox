import { defineConfig } from 'wxt';
import react from '@vitejs/plugin-react';

// https://wxt.dev/api/config.html
export default defineConfig({
  manifest: {
    name: 'ScoutFox - Amazon to YouTube Reviews',
    description: 'Find YouTube reviews for Amazon products and search Amazon from YouTube',
    permissions: ['storage', 'activeTab', 'scripting', 'tabs'],
    commands: {
      'open-popup': {
        suggested_key: {
          default: 'Ctrl+M',
          mac: 'Command+M',
        },
        description: 'Open ScoutFox popup',
      },
    },
    icons: {
      '16': 'FoxLogo.png',
      '48': 'FoxLogo.png',
      '128': 'FoxLogo.png',
    },
    host_permissions: [
      '*://*.amazon.com/*',
      '*://*.amazon.ca/*',
      '*://*.amazon.co.uk/*',
      '*://*.amazon.de/*',
      '*://*.amazon.fr/*',
      '*://*.amazon.it/*',
      '*://*.amazon.es/*',
      '*://*.amazon.co.jp/*',
      '*://*.amazon.in/*',
      '*://*.amazon.com.au/*',
      '*://*.amazon.com.br/*',
      '*://*.amazon.com.mx/*',
      '*://*.amazon.nl/*',
      '*://*.amazon.se/*',
      '*://*.amazon.pl/*',
      '*://*.amazon.sg/*',
      '*://*.amazon.ae/*',
      '*://*.amazon.sa/*',
      '*://*.amazon.tr/*',
      '*://*.youtube.com/*',
    ],
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
