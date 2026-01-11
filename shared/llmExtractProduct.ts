/**
 * LLM-powered product extraction from YouTube context
 * Calls Vercel backend API which handles the actual LLM calls
 * UPDATED: Now extracts multiple products
 */

import type { YouTubePageContext, LLMExtractionResult, MultipleProductExtractionResult } from './types';
import { VERCEL_API_URL } from './config';

const REQUEST_TIMEOUT = 10000;

/**
 * Extract multiple product names from YouTube context using LLM via Vercel backend
 * Always uses LLM API - no fallback to regex
 * Returns array of products sorted by confidence
 */
export async function extractProductsWithLLM(
  context: YouTubePageContext
): Promise<MultipleProductExtractionResult> {
  if (!VERCEL_API_URL || VERCEL_API_URL.includes('your-project-name')) {
    throw new Error('Backend API URL not configured');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  const apiUrl = `${VERCEL_API_URL}/api/extract-product`;
  console.log('[LLM] Calling extract-product endpoint:', apiUrl);
  console.log('[LLM] Context:', { videoTitle: context.videoTitle, hasRawText: !!context.rawTextBlob });

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(context),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`LLM API returned ${response.status}: ${errorText.substring(0, 100)}`);
    }

    const result: any = await response.json();

    // Handle both old format (single product) and new format (multiple products)
    let products: Array<{ productName: string; confidence: number; rationale?: string }> = [];
    
    if (result.products && Array.isArray(result.products)) {
      // New format: multiple products
      products = result.products;
    } else if (result.productName && typeof result.confidence === 'number') {
      // Old format: single product - convert to array format
      console.warn('[LLM] Backend returned old format, converting to new format');
      products = [{
        productName: result.productName,
        confidence: result.confidence,
        rationale: result.rationale,
      }];
    } else {
      throw new Error('Invalid response structure from LLM - expected products array or productName');
    }

    // Filter products with confidence >= 0.5
    const validProducts = products.filter(p => p.confidence >= 0.5 && p.productName);

    return {
      products: validProducts,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    // Re-throw error so caller can handle it properly
    throw error;
  }
}

/**
 * Extract single product name from YouTube context using LLM via Vercel backend
 * Always uses LLM API - no fallback
 * @deprecated Use extractProductsWithLLM for multiple products
 */
export async function extractProductWithLLM(
  context: YouTubePageContext
): Promise<LLMExtractionResult> {
  try {
    const result = await extractProductsWithLLM(context);
    
    // Return the highest confidence product for backward compatibility
    if (result.products.length > 0) {
      const topProduct = result.products[0];
      return {
        productName: topProduct.productName,
        confidence: topProduct.confidence,
        rationale: topProduct.rationale,
      };
    }
    
    return {
      productName: null,
      confidence: 0,
      rationale: 'No products found',
    };
  } catch (error) {
    return {
      productName: null,
      confidence: 0,
      rationale: error instanceof Error ? error.message : 'LLM request failed',
    };
  }
}
