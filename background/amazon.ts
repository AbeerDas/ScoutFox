/**
 * Background handler for Amazon search from YouTube
 */

import type { YouTubePageContext, LLMExtractionResult } from '../shared/types';
import { extractProductWithLLM } from '../shared/llmExtractProduct';
import { normalizeYouTubeTextFallback } from '../shared/regexFallbackNormalize';

/**
 * Generate Amazon search URL from product name
 */
function generateAmazonSearchURL(productName: string): string {
  const encoded = encodeURIComponent(productName);
  return `https://www.amazon.com/s?k=${encoded}`;
}

/**
 * Handle YouTube → Amazon search request
 */
export async function handleYouTubeToAmazonSearch(
  context: YouTubePageContext
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    // Try LLM extraction first
    const llmResult: LLMExtractionResult = await extractProductWithLLM(context);

    let productName: string;

    if (llmResult.confidence >= 0.7 && llmResult.productName) {
      // Use LLM result
      productName = llmResult.productName;
      console.debug('ScoutFox: Using LLM extraction', { productName, confidence: llmResult.confidence });
    } else {
      // Fall back to regex normalization
      productName = normalizeYouTubeTextFallback(
        context.videoTitle || context.documentTitle || '',
        context.description || undefined
      );
      console.debug('ScoutFox: Using regex fallback', { productName, llmConfidence: llmResult.confidence });
    }

    if (!productName || productName.length < 2) {
      return {
        success: false,
        error: 'Could not extract product name',
      };
    }

    const amazonURL = generateAmazonSearchURL(productName);

    return {
      success: true,
      url: amazonURL,
    };
  } catch (error) {
    console.error('ScoutFox: Error in YouTube to Amazon search', error);
    
    // Final fallback: try regex on title only
    try {
      const fallbackName = normalizeYouTubeTextFallback(
        context.videoTitle || context.documentTitle || 'product'
      );
      const amazonURL = generateAmazonSearchURL(fallbackName);
      return {
        success: true,
        url: amazonURL,
      };
    } catch (fallbackError) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Listen for messages from YouTube content script
chrome.runtime.onMessage.addListener((
  message: { type: string; context?: YouTubePageContext },
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response: any) => void
) => {
  if (message.type === 'SEARCH_AMAZON_FROM_YOUTUBE' && message.context) {
    handleYouTubeToAmazonSearch(message.context)
      .then(response => sendResponse(response))
      .catch(error => {
        console.error('ScoutFox: Error handling YouTube search', error);
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      });
    return true; // Keep channel open for async response
  }
  return false;
});
