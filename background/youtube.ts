/**
 * Background service worker for YouTube API integration
 * All YouTube API calls are performed here to keep network logic centralized
 */

import type { VideoResult, CacheEntry, YouTubeConfig } from '../shared/types';
import { normalizeAmazonTitleToSearch, generateSearchQueries } from '../shared/normalizeTitle';

// Default configuration
const DEFAULT_CONFIG: YouTubeConfig = {
  apiKey: '', // Must be set via setApiKey or environment
  cacheTTL: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  maxResults: 6,
};

let config: YouTubeConfig = { ...DEFAULT_CONFIG };

/**
 * Sets the YouTube API key (called from popup or config)
 */
export function setApiKey(apiKey: string) {
  config.apiKey = apiKey;
  console.debug('YouTube API key set');
}

/**
 * Gets API key from storage or environment
 */
async function getApiKey(): Promise<string> {
  if (config.apiKey) {
    return config.apiKey;
  }

  // Try to get from storage
  const stored = await chrome.storage.local.get('youtubeApiKey');
  if (stored.youtubeApiKey) {
    config.apiKey = stored.youtubeApiKey;
    return config.apiKey;
  }

  // Try to get from environment (for build-time injection)
  // @ts-ignore - This will be injected at build time if available
  if (typeof YOUTUBE_API_KEY !== 'undefined') {
    config.apiKey = YOUTUBE_API_KEY;
    return config.apiKey;
  }

  // Try to import from local file (development only)
  try {
    // @ts-ignore - Dynamic import for local dev file
    const localKey = await import('../api-key.local.js?raw');
    if (localKey && localKey.default) {
      // Extract key from the file content (basic parsing)
      const match = localKey.default.match(/YOUTUBE_API_KEY\s*=\s*['"]([^'"]+)['"]/);
      if (match && match[1]) {
        config.apiKey = match[1];
        return config.apiKey;
      }
    }
  } catch (e) {
    // Local file doesn't exist, that's okay
    console.debug('No local API key file found');
  }

  throw new Error('YouTube API key not configured. Please set it in extension settings or via setApiKey().');
}

/**
 * Exponential backoff helper
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetches video statistics (view count, like count) for given video IDs
 */
async function fetchVideoStatistics(videoIds: string[]): Promise<Map<string, { viewCount: number; likeCount?: number }>> {
  const apiKey = await getApiKey();
  const idsParam = videoIds.join(',');
  const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${idsParam}&key=${apiKey}`;

  let retries = 3;
  let backoffMs = 1000;

  while (retries > 0) {
    try {
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429 || response.status === 403) {
          if (retries > 0) {
            console.warn(`YouTube API rate limit/forbidden. Retrying in ${backoffMs}ms...`);
            await delay(backoffMs);
            backoffMs *= 2;
            retries--;
            continue;
          }
          throw new Error(`YouTube API error: ${data.error?.message || 'Rate limit exceeded'}`);
        }
        throw new Error(`YouTube API error: ${data.error?.message || 'Unknown error'}`);
      }

      const statsMap = new Map<string, { viewCount: number; likeCount?: number }>();
      
      if (data.items) {
        for (const item of data.items) {
          const videoId = item.id;
          const statistics = item.statistics || {};
          statsMap.set(videoId, {
            viewCount: parseInt(statistics.viewCount || '0', 10),
            likeCount: statistics.likeCount ? parseInt(statistics.likeCount, 10) : undefined,
          });
        }
      }

      return statsMap;
    } catch (error) {
      if (retries > 0 && (error instanceof Error && error.message.includes('rate limit'))) {
        await delay(backoffMs);
        backoffMs *= 2;
        retries--;
        continue;
      }
      throw error;
    }
  }

  throw new Error('Failed to fetch video statistics after retries');
}

/**
 * Searches YouTube for videos matching the query
 */
async function searchYouTubeAPI(query: string, maxResults: number = 6): Promise<VideoResult[]> {
  const apiKey = await getApiKey();
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(query)}&maxResults=${maxResults}&order=relevance&safeSearch=moderate&key=${apiKey}`;

  let retries = 3;
  let backoffMs = 1000;

  while (retries > 0) {
    try {
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429 || response.status === 403) {
          if (retries > 0) {
            console.warn(`YouTube API rate limit/forbidden. Retrying in ${backoffMs}ms...`);
            await delay(backoffMs);
            backoffMs *= 2;
            retries--;
            continue;
          }
          throw new Error(`YouTube API error: ${data.error?.message || 'Rate limit exceeded'}`);
        }
        throw new Error(`YouTube API error: ${data.error?.message || 'Unknown error'}`);
      }

      if (!data.items || data.items.length === 0) {
        return [];
      }

      // Extract video IDs
      const videoIds = data.items.map((item: any) => item.id.videoId).filter(Boolean);

      if (videoIds.length === 0) {
        return [];
      }

      // Fetch statistics for all videos
      const statsMap = await fetchVideoStatistics(videoIds);

      // Combine search results with statistics
      const results: VideoResult[] = data.items
        .map((item: any) => {
          const videoId = item.id.videoId;
          const snippet = item.snippet || {};
          const stats = statsMap.get(videoId) || { viewCount: 0 };

          return {
            videoId,
            title: snippet.title || 'Untitled',
            channelTitle: snippet.channelTitle || 'Unknown Channel',
            thumbnailUrl: snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || '',
            viewCount: stats.viewCount,
            likeCount: stats.likeCount,
            publishedAt: snippet.publishedAt || '',
          };
        })
        .filter((result: VideoResult) => result.videoId); // Filter out invalid results

      return results;
    } catch (error) {
      if (retries > 0 && (error instanceof Error && error.message.includes('rate limit'))) {
        await delay(backoffMs);
        backoffMs *= 2;
        retries--;
        continue;
      }
      throw error;
    }
  }

  throw new Error('Failed to search YouTube after retries');
}

/**
 * Generates cache key from query
 */
function getCacheKey(query: string): string {
  return `youtube_search_${query.toLowerCase().trim()}`;
}

/**
 * Gets cached results if available and not expired
 */
async function getCachedResults(query: string, ttl: number): Promise<VideoResult[] | null> {
  const cacheKey = getCacheKey(query);
  const cached = await chrome.storage.local.get(cacheKey);

  if (cached[cacheKey]) {
    const entry: CacheEntry = cached[cacheKey];
    const age = Date.now() - entry.fetchedAt;

    if (age < ttl) {
      console.debug(`Cache hit for query: ${query}`);
      return entry.results;
    } else {
      console.debug(`Cache expired for query: ${query}`);
      // Remove expired entry
      await chrome.storage.local.remove(cacheKey);
    }
  }

  return null;
}

/**
 * Stores results in cache
 */
async function setCachedResults(query: string, results: VideoResult[]): Promise<void> {
  const cacheKey = getCacheKey(query);
  const entry: CacheEntry = {
    results,
    fetchedAt: Date.now(),
  };

  await chrome.storage.local.set({ [cacheKey]: entry });
  console.debug(`Cached results for query: ${query}`);
}

/**
 * Main search function with caching
 */
export async function searchYouTube(
  query: string,
  maxResults?: number,
  bypassCache: boolean = false
): Promise<VideoResult[]> {
  const ttl = config.cacheTTL || DEFAULT_CONFIG.cacheTTL;
  const limit = maxResults || config.maxResults || DEFAULT_CONFIG.maxResults;

  // Check cache first (unless bypassing)
  if (!bypassCache) {
    const cached = await getCachedResults(query, ttl);
    if (cached) {
      return cached.slice(0, limit);
    }
  }

  // Fetch from API
  try {
      const results = await searchYouTubeAPI(query, limit || 6);
    
    // Cache results
    if (results.length > 0) {
      await setCachedResults(query, results);
    }

    return results;
  } catch (error) {
    console.error('Error searching YouTube:', error);
    throw error;
  }
}

/**
 * Searches YouTube using Amazon product info with optional AI optimization
 */
export async function searchYouTubeForProduct(
  title: string,
  subtitle?: string | null,
  useAI: boolean = false
): Promise<VideoResult[]> {
  let searchTitle = title;
  
  // Use Groq AI to optimize title if enabled
  if (useAI) {
    try {
      const { optimizeTitleForYouTube } = await import('../shared/groqClient');
      searchTitle = await optimizeTitleForYouTube(title, subtitle);
      console.debug('AI optimized title:', searchTitle);
    } catch (error) {
      console.warn('AI optimization failed, using basic normalization:', error);
    }
  }

  // Generate search queries with optimized or normalized title
  const queries = useAI 
    ? [`${searchTitle} review`, `${searchTitle} unboxing`, `${searchTitle} hands on`]
    : generateSearchQueries(title, subtitle);
  
  if (queries.length === 0) {
    return [];
  }

  // Try queries in order until we get results
  for (const query of queries) {
    try {
      const results = await searchYouTube(query);
      if (results.length > 0) {
        return results;
      }
    } catch (error) {
      console.warn(`Query "${query}" failed:`, error);
      // Continue to next query
    }
  }

  return [];
}

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((
  message: { action: string; query?: string; maxResults?: number; bypassCache?: boolean; title?: string; subtitle?: string | null; apiKey?: string; useAI?: boolean },
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response: { success: boolean; data?: VideoResult[]; error?: string }) => void
) => {
  // Handle async operations
  (async () => {
    if (message.action === 'searchYouTube') {
      try {
        const results = await searchYouTube(message.query || '', message.maxResults, message.bypassCache || false);
        sendResponse({ success: true, data: results });
      } catch (error) {
        console.error('YouTube search error:', error);
        sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
      return;
    }

    if (message.action === 'searchYouTubeForProduct') {
      if (!message.title) {
        sendResponse({ success: false, error: 'Title is required' });
        return;
      }
      try {
        const results = await searchYouTubeForProduct(message.title, message.subtitle, message.useAI || false);
        sendResponse({ success: true, data: results });
      } catch (error) {
        console.error('YouTube product search error:', error);
        sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
      return;
    }

    if (message.action === 'setApiKey') {
      if (!message.apiKey) {
        sendResponse({ success: false, error: 'API key is required' });
        return;
      }
      setApiKey(message.apiKey);
      chrome.storage.local.set({ youtubeApiKey: message.apiKey });
      sendResponse({ success: true });
      return;
    }

    if (message.action === 'setGroqApiKey') {
      const { setGroqApiKey } = await import('../shared/groqClient');
      if (!message.apiKey) {
        sendResponse({ success: false, error: 'API key is required' });
        return;
      }
      setGroqApiKey(message.apiKey);
      chrome.storage.local.set({ groqApiKey: message.apiKey });
      sendResponse({ success: true });
      return;
    }
  })().catch(error => {
    console.error('Message handler error:', error);
    sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  });

  return true; // Keep channel open for async response
});
