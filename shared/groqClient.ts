/**
 * Groq API client for title optimization
 * Uses Groq to paraphrase and optimize product titles for YouTube search
 */

export interface GroqConfig {
  apiKey: string;
  model?: string;
}

let groqConfig: GroqConfig = {
  apiKey: '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', // Default API key
  model: 'llama-3.3-70b-versatile',
};

/**
 * Sets the Groq API key
 */
export function setGroqApiKey(apiKey: string) {
  groqConfig.apiKey = apiKey;
  console.debug('Groq API key set');
}

/**
 * Optimizes a product title using Groq AI for better YouTube search results
 */
export async function optimizeTitleForYouTube(
  title: string,
  subtitle?: string | null
): Promise<string> {
  // Get API key from storage
  const storage = await chrome.storage.local.get(['groqApiKey', 'useOwnGroqKey']);
  const useOwnKey = storage.useOwnGroqKey && storage.groqApiKey;
  const apiKey = await getGroqApiKey();
  
  if (!apiKey) {
    // Fallback to basic normalization if no API key
    const { normalizeAmazonTitleToSearch } = await import('./normalizeTitle');
    return normalizeAmazonTitleToSearch(title, subtitle);
  }
  
  // If user has their own key and wants to use it, use it directly
  // Otherwise, backend will handle it (this function is only called for local fallback)
  
  // Use the retrieved API key
  const currentKey = groqConfig.apiKey;
  groqConfig.apiKey = apiKey;

  try {
    // Combine title and subtitle if subtitle adds value
    const fullTitle = subtitle && subtitle.trim() 
      ? `${title} ${subtitle}` 
      : title;

    const prompt = `You are a YouTube search optimization expert. Your task is to extract the essential product name and model number from an Amazon product title, removing all marketing fluff, colors, sizes, and unnecessary details. Return ONLY the core product identifier that would be used in a YouTube search.

Rules:
- Keep brand name and model number (e.g., "Apple AirPods Pro 2", "Samsung QN90C")
- Remove: colors, sizes (unless part of model), marketing words (New, Latest, 2024, etc.), parenthetical marketing notes
- Keep: generation numbers (2nd Gen, 5th Gen), essential specs if part of model name
- Make it concise (max 8-10 words)
- Return ONLY the optimized product name, nothing else

Amazon title: "${fullTitle}"

Optimized product name:`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: groqConfig.model,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 50,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Groq API error: ${error.error?.message || 'Failed to optimize title'}`);
    }

    const data = await response.json();
    const optimized = data.choices?.[0]?.message?.content?.trim();

    if (!optimized) {
      throw new Error('No response from Groq API');
    }

    // Clean up the response (remove quotes if present)
    const cleaned = optimized.replace(/^["']|["']$/g, '').trim();
    
    // Restore original API key if it was changed
    if (currentKey !== apiKey) {
      groqConfig.apiKey = currentKey;
    }
    
    // Import normalize function for fallback
    const { normalizeAmazonTitleToSearch } = await import('./normalizeTitle');
    return cleaned || normalizeAmazonTitleToSearch(title, subtitle);
  } catch (error) {
    console.warn('Groq API error, falling back to basic normalization:', error);
    // Restore original API key
    if (currentKey !== apiKey) {
      groqConfig.apiKey = currentKey;
    }
    // Fallback to basic normalization
    const { normalizeAmazonTitleToSearch } = await import('./normalizeTitle');
    return normalizeAmazonTitleToSearch(title, subtitle);
  }
}

/**
 * Gets Groq API key from storage
 */
export async function getGroqApiKey(): Promise<string | null> {
  // Check if user wants to use their own key
  const storage = await chrome.storage.local.get(['groqApiKey', 'useOwnGroqKey']);
  const useOwnKey = storage.useOwnGroqKey && storage.groqApiKey;
  
  if (useOwnKey) {
    return storage.groqApiKey;
  }

  if (groqConfig.apiKey) {
    return groqConfig.apiKey;
  }

  try {
    const stored = await chrome.storage.local.get('groqApiKey');
    if (stored.groqApiKey) {
      groqConfig.apiKey = stored.groqApiKey;
      return groqConfig.apiKey;
    }
    return null;
  } catch (error) {
    return null;
  }
}
