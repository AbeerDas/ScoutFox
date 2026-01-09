/**
 * Content script entry point (WXT entrypoint)
 * This script runs on Amazon product pages
 */

import { defineContentScript } from 'wxt/sandbox';
import '../content-scripts/amazon';

export default defineContentScript({
  matches: ['*://*.amazon.com/*'],
  main() {
    // Content script is imported above and will run automatically
  },
});
