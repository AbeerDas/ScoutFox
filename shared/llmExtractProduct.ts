/**
 * LLM-powered product extraction from YouTube context
 * Calls Vercel backend API which handles the actual LLM calls
 */

import type { YouTubePageContext, LLMExtractionResult } from './types';

const VERCEL_API_URL = process.env.VERCEL_API_URL || 'https://scoutfox.vercel.app/api/extract-product';
const REQUEST_TIMEOUT = 10000; // 10 seconds

/**
 * Extract product name from YouTube context using LLM via Vercel backend
 * Falls back to regex normalization if LLM fails or confidence is low
 */
export async function extractProductWithLLM(
  context: YouTubePageContext
): Promise<LLMExtractionResult> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    const response = await fetch(VERCEL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(context),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`LLM API returned ${response.status}`);
    }

    const result: LLMExtractionResult = await response.json();

    // Validate response structure
    if (typeof result.confidence !== 'number' || result.confidence < 0 || result.confidence > 1) {
      throw new Error('Invalid confidence score from LLM');
    }

    // If confidence is high enough, return it
    if (result.confidence >= 0.7 && result.productName) {
      return result;
    }

    // Low confidence - will fall back to regex
    return {
      productName: null,
      confidence: result.confidence,
      rationale: result.rationale || 'Low confidence from LLM',
    };
  } catch (error) {
    // Network error, timeout, or invalid response - fall back to regex
    console.debug('LLM extraction failed, using fallback:', error);
    return {
      productName: null,
      confidence: 0,
      rationale: error instanceof Error ? error.message : 'LLM request failed',
    };
  }
}
