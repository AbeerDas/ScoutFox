/**
 * Example Vercel API route for LLM product extraction
 * 
 * Deploy this to: /api/extract-product.ts in your Vercel project
 * 
 * Environment variables needed:
 * - OPENAI_API_KEY (or ANTHROPIC_API_KEY, etc.)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { YouTubePageContext, LLMExtractionResult } from '../shared/types';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const context: YouTubePageContext = req.body;

    // Validate input
    if (!context || !context.videoTitle) {
      res.status(400).json({ error: 'Invalid request body' });
      return;
    }

    // Size limit check
    const payloadSize = JSON.stringify(context).length;
    if (payloadSize > 50000) { // 50KB limit
      res.status(400).json({ error: 'Payload too large' });
      return;
    }

    // Call LLM (example with OpenAI)
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: 'LLM API key not configured' });
      return;
    }

    const prompt = `Extract the product name from this YouTube video context. Return ONLY a JSON object with this exact structure:
{
  "productName": "Brand Model Name",
  "confidence": 0.0-1.0,
  "rationale": "brief explanation"
}

Rules:
- Extract the single most likely physical product being reviewed
- Remove clickbait, opinions, and time-based language
- Preserve brand, model, generation, size, storage, region
- Confidence should be 0.0-1.0 (0.7+ is high confidence)
- If no clear product, use confidence < 0.5

Video Title: ${context.videoTitle}
Description: ${context.description || 'N/A'}
Channel: ${context.channelName || 'N/A'}

Return ONLY the JSON object, no other text:`;

    const llmResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // or 'gpt-3.5-turbo' for cheaper
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 200,
      }),
    });

    if (!llmResponse.ok) {
      throw new Error(`OpenAI API error: ${llmResponse.status}`);
    }

    const data = await llmResponse.json();
    const content = data.choices[0]?.message?.content?.trim();

    if (!content) {
      throw new Error('No response from LLM');
    }

    // Parse JSON from LLM response
    let result: LLMExtractionResult;
    try {
      // Extract JSON from response (might have markdown code blocks)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      throw new Error('Failed to parse LLM response as JSON');
    }

    // Validate result structure
    if (typeof result.confidence !== 'number' || result.confidence < 0 || result.confidence > 1) {
      result.confidence = 0.5; // Default to medium confidence
    }

    if (!result.productName || result.productName.length < 2) {
      result.productName = null;
      result.confidence = 0;
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Vercel API error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
      productName: null,
      confidence: 0,
    });
  }
}
