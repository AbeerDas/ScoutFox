/**
 * Content script entry point (WXT entrypoint)
 * This script runs on Amazon product pages
 */

import { defineContentScript } from 'wxt/sandbox';
import '../content-scripts/amazon';

export default defineContentScript({
  // Scoped to product pages only for least-privilege compliance
  // Matches Amazon product page URL patterns: /dp/[ASIN], /gp/product/[ASIN]
  matches: [
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
  ],
  main() {
    // Content scripts are imported above and will run automatically
  },
});
