/**
 * Main popup UI component for displaying YouTube review results
 */

import React, { useState, useEffect } from 'react';
import type { VideoResult, AmazonProductInfo } from '../shared/types';
import { formatCount } from '../shared/utils';
import './popup.css';

interface PopupState {
  loading: boolean;
  error: string | null;
  results: VideoResult[];
  productInfo: AmazonProductInfo | null;
}

export default function Popup() {
  const [state, setState] = useState<PopupState>({
    loading: false,
    error: null,
    results: [],
    productInfo: null,
  });

  const [apiKey, setApiKey] = useState<string>('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);

  // Check if API key is set on mount
  useEffect(() => {
    chrome.storage.local.get('youtubeApiKey', (data) => {
      if (data.youtubeApiKey) {
        setApiKey(data.youtubeApiKey);
      } else {
        setShowApiKeyInput(true);
      }
    });
  }, []);

  const handleSearch = async (bypassCache: boolean = false) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.url || !tab.url.includes('amazon.com')) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: 'Please navigate to an Amazon product page first.',
        }));
        return;
      }

      // Inject content script if needed and extract product info
      let productInfo: AmazonProductInfo | null = null;
      
      try {
        const response = await chrome.tabs.sendMessage(tab.id!, { action: 'extractProductInfo' }) as { success: boolean; data?: AmazonProductInfo; error?: string };
        if (response.success) {
          productInfo = response.data || null;
        } else {
          throw new Error(response.error || 'Failed to extract product info');
        }
      } catch (error) {
        // Try injecting script first
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id! },
            files: ['content-scripts/content.js'],
          });
          // Wait a bit for script to load
          await new Promise(resolve => setTimeout(resolve, 100));
          const response = await chrome.tabs.sendMessage(tab.id!, { action: 'extractProductInfo' }) as { success: boolean; data?: AmazonProductInfo; error?: string };
          if (response.success) {
            productInfo = response.data || null;
          } else {
            throw new Error(response.error || 'Failed to extract product info');
          }
        } catch (injectError) {
          throw new Error('Could not extract product information from page. Please refresh and try again.');
        }
      }

      if (!productInfo || !productInfo.title) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: 'Could not find product title on this page.',
        }));
        return;
      }

      setState(prev => ({ ...prev, productInfo }));

      // Search YouTube
      const searchResponse = await chrome.runtime.sendMessage({
        action: 'searchYouTubeForProduct',
        title: productInfo.title,
        subtitle: productInfo.subtitle,
        bypassCache,
      }) as { success: boolean; data?: VideoResult[]; error?: string };

      if (searchResponse.success) {
        setState(prev => ({
          ...prev,
          loading: false,
          results: searchResponse.data || [],
        }));
      } else {
        throw new Error(searchResponse.error || 'Failed to search YouTube');
      }
    } catch (error) {
      console.error('Search error:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      }));
    }
  };

  const handleSetApiKey = async () => {
    if (!apiKey.trim()) {
      return;
    }

    try {
      await chrome.runtime.sendMessage({
        action: 'setApiKey',
        apiKey: apiKey.trim(),
      });
      await chrome.storage.local.set({ youtubeApiKey: apiKey.trim() });
      setShowApiKeyInput(false);
    } catch (error) {
      console.error('Failed to set API key:', error);
    }
  };

  const openVideo = (videoId: string) => {
    chrome.tabs.create({ url: `https://www.youtube.com/watch?v=${videoId}` });
  };

  return (
    <div className="popup-container">
      <div className="popup-header">
        <h1 className="popup-title">ScoutFox</h1>
        <p className="popup-subtitle">Find YouTube Reviews</p>
      </div>

      {showApiKeyInput && (
        <div className="api-key-section">
          <label className="api-key-label">
            YouTube API Key:
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your YouTube Data API v3 key"
              className="api-key-input"
            />
          </label>
          <button onClick={handleSetApiKey} className="btn btn-primary">
            Save API Key
          </button>
          <p className="api-key-hint">
            Get your API key from{' '}
            <a
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google Cloud Console
            </a>
          </p>
        </div>
      )}

      {!showApiKeyInput && (
        <>
          <div className="actions-section">
            <button
              onClick={() => handleSearch(false)}
              disabled={state.loading}
              className="btn btn-primary"
            >
              {state.loading ? 'Searching...' : 'Search Reviews'}
            </button>
            {state.results.length > 0 && (
              <button
                onClick={() => handleSearch(true)}
                disabled={state.loading}
                className="btn btn-secondary"
              >
                Refresh
              </button>
            )}
          </div>

          {state.productInfo && (
            <div className="product-info">
              <p className="product-title">{state.productInfo.title}</p>
              {state.productInfo.subtitle && (
                <p className="product-subtitle">{state.productInfo.subtitle}</p>
              )}
            </div>
          )}

          {state.error && (
            <div className="error-message">
              <p>{state.error}</p>
              {state.error.includes('API key') && (
                <button
                  onClick={() => setShowApiKeyInput(true)}
                  className="btn btn-secondary"
                >
                  Update API Key
                </button>
              )}
            </div>
          )}

          {state.loading && (
            <div className="loading">
              <p>Searching YouTube for reviews...</p>
            </div>
          )}

          {!state.loading && state.results.length > 0 && (
            <div className="results-section">
              <h2 className="results-title">Found {state.results.length} Review{state.results.length !== 1 ? 's' : ''}</h2>
              <div className="results-list">
                {state.results.map((video) => (
                  <div
                    key={video.videoId}
                    className="result-item"
                    onClick={() => openVideo(video.videoId)}
                  >
                    <img
                      src={video.thumbnailUrl}
                      alt={video.title}
                      className="result-thumbnail"
                    />
                    <div className="result-content">
                      <h3 className="result-video-title" title={video.title}>
                        {video.title}
                      </h3>
                      <p className="result-channel">{video.channelTitle}</p>
                      <div className="result-stats">
                        <span className="result-stat">
                          👁 {formatCount(video.viewCount)}
                        </span>
                        {video.likeCount !== undefined && (
                          <span className="result-stat">
                            👍 {formatCount(video.likeCount)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!state.loading && state.results.length === 0 && !state.error && state.productInfo && (
            <div className="no-results">
              <p>No reviews found. Try refreshing or check your search query.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
