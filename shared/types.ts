/**
 * Shared TypeScript types for ScoutFox extension
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

export interface CacheEntry {
  results: VideoResult[];
  fetchedAt: number;
}

export interface YouTubeConfig {
  apiKey: string;
  maxResults: number;
  cacheTTL: number;
}

export interface AmazonProductInfo {
  title: string | null;
  subtitle: string | null;
  asin: string | null;
}

export interface GroqConfig {
  apiKey: string;
}

// YouTube → Amazon types
export interface YouTubePageContext {
  videoTitle: string | null;
  description: string | null;
  channelName: string | null;
  documentTitle: string | null;
  rawTextBlob: string;
}

export interface LLMExtractionResult {
  productName: string | null;
  confidence: number;
  rationale?: string;
}
