/**
 * Content script for Amazon product page extraction
 * Extracts product title, subtitle, and ASIN from Amazon DOM
 */

import type { AmazonProductInfo } from '../shared/types';
import { sanitizeText } from '../shared/utils';

/**
 * Attempts to extract ASIN from various locations on Amazon page
 */
function extractASIN(): string | undefined {
  // Try meta tag first
  const metaASIN = document.querySelector('meta[property="og:url"]')?.getAttribute('content');
  if (metaASIN) {
    const asinMatch = metaASIN.match(/\/dp\/([A-Z0-9]{10})/i);
    if (asinMatch) {
      return asinMatch[1];
    }
  }

  // Try from URL
  const urlMatch = window.location.href.match(/\/dp\/([A-Z0-9]{10})/i);
  if (urlMatch) {
    return urlMatch[1];
  }

  // Try from detail bullets
  const detailBullets = document.querySelector('#detailBullets_feature_div');
  if (detailBullets) {
    const text = detailBullets.textContent || '';
    const asinMatch = text.match(/ASIN[:\s]+([A-Z0-9]{10})/i);
    if (asinMatch) {
      return asinMatch[1];
    }
  }

  return undefined;
}

/**
 * Extracts product title using multiple selector strategies
 */
function extractTitle(): string | null {
  // Primary selectors (in order of preference)
  const selectors = [
    '#productTitle',
    '.product-title-word-break',
    '#title',
    'h1[data-testid="product-title"]',
    'h1.a-size-large.product-title-word-break',
    'h1',
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      const htmlElement = element as HTMLElement;
      const text = element.textContent || htmlElement.innerText;
      if (text && text.trim()) {
        return sanitizeText(text);
      }
    }
  }

  // Fallback to page title
  const pageTitle = document.title;
  if (pageTitle) {
    // Remove Amazon domain prefixes (all locales)
    const cleaned = pageTitle.replace(/^Amazon\.(com|ca|co\.uk|de|fr|it|es|co\.jp|in|com\.au|com\.br|com\.mx|nl|se|pl|sg|ae|sa|tr):\s*/i, '').trim();
    if (cleaned && !cleaned.toLowerCase().includes('amazon')) {
      return sanitizeText(cleaned);
    }
  }

  return null;
}

/**
 * Extracts product subtitle/byline using multiple selector strategies
 */
function extractSubtitle(): string | null {
  const selectors = [
    '#productSubtitle',
    '#bylineInfo',
    '.a-size-base.a-color-secondary',
    '#byline',
    '.a-row.a-size-base.a-color-secondary',
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      const htmlElement = element as HTMLElement;
      const text = element.textContent || htmlElement.innerText;
      if (text && text.trim()) {
        // Remove "by" prefix if present (we'll handle that in normalization)
        const cleaned = text.replace(/^by\s+/i, '').trim();
        return sanitizeText(cleaned);
      }
    }
  }

  return null;
}

/**
 * Main extraction function
 * Returns product information from Amazon page DOM
 */
export function extractAmazonProductText(): AmazonProductInfo {
  const title = extractTitle();
  const subtitle = extractSubtitle();
  const asin = extractASIN();

  return {
    title,
    subtitle,
    asin,
  };
}

// Make it available globally for sidebar.tsx
(window as any).extractAmazonProductText = extractAmazonProductText;

// Auto-detect product pages and trigger search
let lastASIN: string | null = null;
let searchDebounceTimer: number | null = null;

function detectAndSearch() {
  // Clear any pending search
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer);
  }

  searchDebounceTimer = window.setTimeout(() => {
    try {
      const productInfo = extractAmazonProductText();
      const currentASIN = productInfo.asin || extractASINFromURL();
      
      if (currentASIN && currentASIN !== lastASIN && productInfo.title) {
        lastASIN = currentASIN;
        
        // Notify background to search
        chrome.runtime.sendMessage({
          type: 'AMAZON_PRODUCT_DETECTED',
          asin: currentASIN,
          title: productInfo.title,
          subtitle: productInfo.subtitle,
        }).catch(err => {
          console.debug('ScoutFox: Error sending product detection message', err);
        });
      }
    } catch (error) {
      console.debug('ScoutFox: Error in detectAndSearch', error);
    }
  }, 800);
}

function extractASINFromURL(): string | null {
  try {
    const match = window.location.href.match(/\/(dp|gp\/product)\/([A-Z0-9]{10})/);
    return match ? match[2] : null;
  } catch {
    return null;
  }
}

// Initial detection - wait for page to be ready
function initDetection() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(detectAndSearch, 1000);
    });
  } else {
    setTimeout(detectAndSearch, 1000);
  }
}

initDetection();

// Watch for DOM changes (Amazon is SPA) - but debounce heavily
let domObserver: MutationObserver | null = null;
if (document.body) {
  domObserver = new MutationObserver(() => {
    detectAndSearch();
  });

  domObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

// Watch for URL changes
let lastUrl = location.href;
const urlObserver = new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    lastASIN = null; // Reset ASIN on URL change
    detectAndSearch();
  }
});

urlObserver.observe(document, { subtree: true, childList: true });

window.addEventListener('popstate', () => {
  lastASIN = null;
  detectAndSearch();
});

// Listen for messages from popup/background
chrome.runtime.onMessage.addListener((
  message: { action: string },
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response: { success: boolean; data?: AmazonProductInfo; error?: string }) => void
) => {
  if (message.action === 'extractProductInfo') {
    try {
      const productInfo = extractAmazonProductText();
      sendResponse({ success: true, data: productInfo });
    } catch (error) {
      console.error('Error extracting product info:', error);
      sendResponse({ success: false, error: String(error) });
    }
    return true; // Keep channel open for async response
  }
  return false;
});
