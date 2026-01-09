/**
 * Content script entry point (WXT entrypoint)
 * This script runs on Amazon product pages
 */

import { defineContentScript } from 'wxt/sandbox';
import '../content-scripts/amazon';

export default defineContentScript({
  matches: [
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
  ],
  main() {
    // Content script is imported above and will run automatically
  },
});
