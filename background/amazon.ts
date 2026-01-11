/**
 * Background handler for Amazon search from YouTube
 * Always uses LLM API for product extraction (no regex fallback)
 */

import type { YouTubePageContext, MultipleProductExtractionResult } from '../shared/types';
import { extractProductsWithLLM } from '../shared/llmExtractProduct';

/**
 * Handle YouTube → Amazon search request
 * Always uses LLM API to extract multiple products
 */
export async function handleYouTubeToAmazonSearch(
  context: YouTubePageContext
): Promise<{ success: boolean; url?: string; error?: string; products?: Array<{ productName: string; confidence: number }> }> {
  try {
    // Always use LLM extraction for multiple products
    const llmResult: MultipleProductExtractionResult = await extractProductsWithLLM(context);

    // If we got products from LLM, return them
    if (llmResult.products && llmResult.products.length > 0) {
      console.debug('ScoutFox: LLM extraction successful', { productCount: llmResult.products.length });
      return {
        success: true,
        products: llmResult.products.map(p => ({
          productName: p.productName,
          confidence: p.confidence,
        })),
      };
    }

    // No products found from LLM
    return {
      success: false,
      error: 'Could not extract any products from the video. Please try again or check your connection.',
    };
  } catch (error) {
    console.error('ScoutFox: Error in YouTube to Amazon search', error);
    
    return {
      success: false,
      error: error instanceof Error 
        ? `Failed to extract products: ${error.message}` 
        : 'Failed to extract products. Please check your connection and try again.',
    };
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
