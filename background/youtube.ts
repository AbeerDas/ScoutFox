import type { VideoResult, CacheEntry, YouTubeConfig } from '../shared/types';
import { normalizeAmazonTitleToSearch, generateSearchQueries } from '../shared/normalizeTitle';

const DEFAULT_CONFIG: YouTubeConfig = {
  apiKey: '',
  cacheTTL: 24 * 60 * 60 * 1000,
  maxResults: 6,
};

let config: YouTubeConfig = { ...DEFAULT_CONFIG };

export function setApiKey(apiKey: string) {
  config.apiKey = apiKey;
  console.debug('YouTube API key set');
}

async function getApiKey(): Promise<string> {
  if (config.apiKey) {
    return config.apiKey;
  }

  const stored = await chrome.storage.local.get('youtubeApiKey');
  if (stored.youtubeApiKey) {
    config.apiKey = stored.youtubeApiKey;
    return config.apiKey;
  }

  throw new Error('YouTube API key not configured. Backend service is used by default, but API key is needed if backend is unavailable.');
}
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
 * Searches YouTube using Amazon product info via backend API
 * Falls back to local search if backend is unavailable
 */
export async function searchYouTubeForProduct(
  title: string,
  subtitle?: string | null,
  useAI: boolean = false
): Promise<VideoResult[]> {
  // Try backend API first
  try {
    const { VERCEL_API_URL } = await import('../shared/config');
    
    if (VERCEL_API_URL && !VERCEL_API_URL.includes('your-project-name')) {
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 second timeout (increased for slow backend)
      
      try {
        const apiUrl = `${VERCEL_API_URL}/api/search-youtube`;
        console.log('[Backend] Calling API:', apiUrl);
        console.log('[Backend] Request payload:', { productTitle: title, subtitle, optimizeTitle: useAI });
        
        const startTime = Date.now();
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            productTitle: title,
            subtitle: subtitle || null,
            optimizeTitle: useAI,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const duration = Date.now() - startTime;
        console.log(`[Backend] Response received in ${duration}ms - Status:`, response.status, response.statusText);

        if (response.ok) {
          const data = await response.json();
          console.log('[Backend] Response data:', data);
          
          if (data.success && data.results) {
            console.log('[Backend] Success! Found', data.results.length, 'results');
            return data.results;
          } else {
            console.warn('[Backend] Unsuccessful response:', data);
            throw new Error(data.error || 'Backend returned unsuccessful response');
          }
        } else {
          const errorText = await response.text().catch(() => 'Unknown error');
          console.error('[Backend] Error response:', response.status, errorText);
          throw new Error(`Backend API error: ${response.status} - ${errorText.substring(0, 100)}`);
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          console.error('[Backend] Request timed out after 25 seconds');
          throw new Error('Backend request timed out. The service may be slow or unavailable.');
        } else if (fetchError instanceof TypeError && fetchError.message.includes('Failed to fetch')) {
          console.error('[Backend] Network error:', fetchError.message);
          throw new Error('Failed to connect to backend. Check your internet connection or backend URL.');
        } else {
          console.error('[Backend] Error:', fetchError);
          throw fetchError;
        }
      }
    }
  } catch (error) {
    console.warn('[Backend] Backend failed, attempting fallback to local search:', error);
  }

  let searchTitle = title;
  
  if (useAI) {
    try {
      const { optimizeTitleForYouTube } = await import('../shared/groqClient');
      searchTitle = await optimizeTitleForYouTube(title, subtitle);
      console.debug('AI optimized title:', searchTitle);
    } catch (error) {
      console.warn('AI optimization failed, using basic normalization:', error);
    }
  }

  const queries = useAI 
    ? [`${searchTitle} review`, `${searchTitle} unboxing`, `${searchTitle} hands on`]
    : generateSearchQueries(title, subtitle);
  
  if (queries.length === 0) {
    return [];
  }

  // Try queries in order until we get results
  try {
    for (const query of queries) {
      try {
        const results = await searchYouTube(query);
        if (results.length > 0) {
          console.debug('Fallback local search succeeded');
          return results;
        }
      } catch (error) {
        console.warn(`Query "${query}" failed:`, error);
      }
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('API key not configured')) {
      throw new Error('Backend service unavailable and no API keys configured. Please check your connection or configure API keys in settings.');
    }
    throw error;
  }

  return [];
}

// Message type for runtime messages
type RuntimeMessage = 
  | { action: 'searchYouTube'; query?: string; maxResults?: number; bypassCache?: boolean }
  | { action: 'searchYouTubeForProduct'; title: string; subtitle?: string | null; bypassCache?: boolean; useAI?: boolean }
  | { action: 'setApiKey'; apiKey: string }
  | { action: 'setGroqApiKey'; apiKey: string }
  | { action: 'ping' }
  | { type: 'AMAZON_PRODUCT_DETECTED'; title: string; subtitle?: string | null; asin?: string };

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((
  message: RuntimeMessage,
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response: { success: boolean; data?: VideoResult[]; error?: string }) => void
) => {
  // Handle ping to wake up service worker
  if ('action' in message && message.action === 'ping') {
    console.log('[Background] Ping received');
    sendResponse({ success: true });
    return true;
  }
  
  // Handle async operations
  (async () => {
    if ('action' in message && message.action === 'searchYouTube') {
      console.log('[Background] Message received: searchYouTube');
      try {
        const results = await searchYouTube(message.query || '', message.maxResults, message.bypassCache || false);
        sendResponse({ success: true, data: results });
      } catch (error) {
        console.error('YouTube search error:', error);
        sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
      return;
    }

    if ('action' in message && message.action === 'searchYouTubeForProduct') {
      console.log('[Background] Message received: searchYouTubeForProduct');
      if (!message.title) {
        sendResponse({ success: false, error: 'Title is required' });
        return;
      }
      try {
        console.log('[Background] Starting YouTube search for product:', message.title);
        console.log('[Background] Subtitle:', message.subtitle);
        console.log('[Background] Use AI:', message.useAI);
        
        const results = await searchYouTubeForProduct(message.title, message.subtitle || null, message.useAI || false);
        
        console.log('[Background] Search completed, found', results.length, 'results');
        if (results.length > 0) {
          console.log('[Background] First result:', results[0].title);
        }
        
        sendResponse({ success: true, data: results });
      } catch (error) {
        console.error('[Background] YouTube product search error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred during search';
        console.error('[Background] Error details:', errorMessage);
        sendResponse({ 
          success: false, 
          error: errorMessage
        });
      }
      return;
    }

    if ('action' in message && message.action === 'setApiKey') {
      if (!message.apiKey) {
        sendResponse({ success: false, error: 'API key is required' });
        return;
      }
      setApiKey(message.apiKey);
      chrome.storage.local.set({ youtubeApiKey: message.apiKey });
      sendResponse({ success: true });
      return;
    }

    if ('action' in message && message.action === 'setGroqApiKey') {
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

    // Handle auto-detection from content script
    if ('type' in message && message.type === 'AMAZON_PRODUCT_DETECTED') {
      const { title, subtitle, asin } = message;
      const tabId = _sender.tab?.id;
      
      if (!tabId || !title) return;

      // Check cache first
      const cacheKey = `auto_search_${asin}`;
      const cached = await chrome.storage.local.get(cacheKey);
      
      if (cached[cacheKey]) {
        const entry = cached[cacheKey];
        const age = Date.now() - entry.fetchedAt;
        if (age < 24 * 60 * 60 * 1000) {
          // Send cached results to content script
          chrome.tabs.sendMessage(tabId, {
            type: 'YOUTUBE_RESULTS_READY',
            results: entry.results,
            productInfo: { title, subtitle: subtitle || null, asin },
          }).catch(() => {});
          return;
        }
      }

      // Notify content script that search started
      chrome.tabs.sendMessage(tabId, {
        type: 'YOUTUBE_SEARCH_STARTED',
      }).catch(() => {});

      // Perform search
      try {
        const { getGroqApiKey } = await import('../shared/groqClient');
        const groqKey = await getGroqApiKey();
        const results = await searchYouTubeForProduct(title, subtitle || null, !!groqKey);
        
        // Cache results
        await chrome.storage.local.set({
          [cacheKey]: {
            results,
            fetchedAt: Date.now(),
          },
        });

        // Send results to content script
        chrome.tabs.sendMessage(tabId, {
          type: 'YOUTUBE_RESULTS_READY',
          results,
          productInfo: { title, subtitle, asin },
        }).catch(() => {});
      } catch (error) {
        chrome.tabs.sendMessage(tabId, {
          type: 'YOUTUBE_SEARCH_ERROR',
          error: error instanceof Error ? error.message : 'Search failed',
        }).catch(() => {});
      }
      return;
    }
  })().catch(error => {
    console.error('Message handler error:', error);
    sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  });

  return true; // Keep channel open for async response
});
