/**
 * YouTube content script entry point
 */

import { defineContentScript } from 'wxt/sandbox';
import '../content-scripts/youtube';

export default defineContentScript({
  matches: ['*://www.youtube.com/watch*'],
  main() {
    // Content script is imported above and will run automatically
  },
});
