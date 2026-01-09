/**
 * Product information extracted from Amazon page
 */
export interface AmazonProductInfo {
  title: string | null;
  subtitle: string | null;
  asin?: string;
}

/**
 * YouTube video result from API
 */
export interface VideoResult {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  viewCount: number;
  likeCount?: number;
  publishedAt: string;
}

/**
 * Cache entry structure
 */
export interface CacheEntry {
  results: VideoResult[];
  fetchedAt: number;
}

/**
 * YouTube API configuration
 */
export interface YouTubeConfig {
  apiKey: string;
  cacheTTL?: number; // in milliseconds, default 24 hours
  maxResults?: number; // default 6
}
