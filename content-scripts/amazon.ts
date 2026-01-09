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
