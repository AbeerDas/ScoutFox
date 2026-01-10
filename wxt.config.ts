import { defineConfig } from 'wxt';
import react from '@vitejs/plugin-react';

// https://wxt.dev/api/config.html
export default defineConfig({
  manifest: {
    name: 'ScoutFox - Amazon to YouTube Reviews',
    description: 'Find YouTube reviews for Amazon products and search Amazon from YouTube',
    // tabs permission required for chrome.tabs.create() to open new tabs (YouTube videos, Amazon search, settings)
    // activeTab is used for chrome.tabs.query() and chrome.tabs.sendMessage() on the active tab
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
    // Host permissions scoped to product pages and YouTube watch pages for least-privilege compliance
    // Amazon: Only product pages (/dp/*, /gp/product/*) - content scripts handle extraction
    // YouTube: Watch pages only - content script handles button injection
    // Backend: Specific Vercel deployment for API proxy
    host_permissions: [
      // Amazon product pages only (not all Amazon pages)
      '*://*.amazon.com/dp/*',
      '*://*.amazon.com/gp/product/*',
      '*://*.amazon.ca/dp/*',
      '*://*.amazon.ca/gp/product/*',
      '*://*.amazon.co.uk/dp/*',
      '*://*.amazon.co.uk/gp/product/*',
      '*://*.amazon.de/dp/*',
      '*://*.amazon.de/gp/product/*',
      '*://*.amazon.fr/dp/*',
      '*://*.amazon.fr/gp/product/*',
      '*://*.amazon.it/dp/*',
      '*://*.amazon.it/gp/product/*',
      '*://*.amazon.es/dp/*',
      '*://*.amazon.es/gp/product/*',
      '*://*.amazon.co.jp/dp/*',
      '*://*.amazon.co.jp/gp/product/*',
      '*://*.amazon.in/dp/*',
      '*://*.amazon.in/gp/product/*',
      '*://*.amazon.com.au/dp/*',
      '*://*.amazon.com.au/gp/product/*',
      '*://*.amazon.com.br/dp/*',
      '*://*.amazon.com.br/gp/product/*',
      '*://*.amazon.com.mx/dp/*',
      '*://*.amazon.com.mx/gp/product/*',
      '*://*.amazon.nl/dp/*',
      '*://*.amazon.nl/gp/product/*',
      '*://*.amazon.se/dp/*',
      '*://*.amazon.se/gp/product/*',
      '*://*.amazon.pl/dp/*',
      '*://*.amazon.pl/gp/product/*',
      '*://*.amazon.sg/dp/*',
      '*://*.amazon.sg/gp/product/*',
      '*://*.amazon.ae/dp/*',
      '*://*.amazon.ae/gp/product/*',
      '*://*.amazon.sa/dp/*',
      '*://*.amazon.sa/gp/product/*',
      '*://*.amazon.tr/dp/*',
      '*://*.amazon.tr/gp/product/*',
      // YouTube watch pages only
      '*://*.youtube.com/watch*',
      // Backend API proxy
      'https://yt-amazon-backend-proxy.vercel.app/*',
    ],
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self'; connect-src 'self' https://yt-amazon-backend-proxy.vercel.app https://api.groq.com https://www.googleapis.com;",
    },
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
