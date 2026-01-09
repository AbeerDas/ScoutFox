/**
 * Main popup UI component for displaying YouTube review results
 * Redesigned with animations, orange theme, and Material icons
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

  const [youtubeApiKey, setYoutubeApiKey] = useState<string>('');
  const [groqApiKey, setGroqApiKey] = useState<string>('');
  const [showSettings, setShowSettings] = useState(false);
  const [useAI, setUseAI] = useState(true);
  const [sortBy, setSortBy] = useState<'likes' | 'views'>('views');

  // Load persisted state and API keys on mount
  useEffect(() => {
    chrome.storage.local.get(['youtubeApiKey', 'groqApiKey', 'popupState', 'useAI'], (data) => {
      if (data.youtubeApiKey) {
        setYoutubeApiKey(data.youtubeApiKey);
      }
      if (data.groqApiKey) {
        setGroqApiKey(data.groqApiKey);
      }
      if (data.useAI !== undefined) {
        setUseAI(data.useAI);
      }
      // Restore previous state if available
      if (data.popupState) {
        try {
          const savedState = JSON.parse(data.popupState);
          if (savedState.results && savedState.results.length > 0) {
            setState(savedState);
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
      // Show settings if no API keys
      if (!data.youtubeApiKey) {
        setShowSettings(true);
      }
    });
  }, []);

  // Save state whenever it changes
  useEffect(() => {
    if (state.results.length > 0 || state.productInfo) {
      chrome.storage.local.set({ popupState: JSON.stringify(state) });
    }
  }, [state]);

  const handleSearch = async (bypassCache: boolean = false) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Check for all Amazon domains
      const amazonDomains = ['amazon.com', 'amazon.ca', 'amazon.co.uk', 'amazon.de', 'amazon.fr', 
        'amazon.it', 'amazon.es', 'amazon.co.jp', 'amazon.in', 'amazon.com.au', 
        'amazon.com.br', 'amazon.com.mx', 'amazon.nl', 'amazon.se', 'amazon.pl',
        'amazon.sg', 'amazon.ae', 'amazon.sa', 'amazon.tr'];
      
      if (!tab.url || !amazonDomains.some(domain => tab.url?.includes(domain))) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: 'Please navigate to an Amazon product page first.',
        }));
        return;
      }

      let productInfo: AmazonProductInfo | null = null;
      
      try {
        const response = await chrome.tabs.sendMessage(tab.id!, { action: 'extractProductInfo' }) as { success: boolean; data?: AmazonProductInfo; error?: string };
        if (response.success) {
          productInfo = response.data || null;
        } else {
          throw new Error(response.error || 'Failed to extract product info');
        }
      } catch (error) {
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id! },
            files: ['content-scripts/content.js'],
          });
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

      // Search YouTube with optional AI optimization
      const searchResponse = await chrome.runtime.sendMessage({
        action: 'searchYouTubeForProduct',
        title: productInfo.title,
        subtitle: productInfo.subtitle,
        bypassCache,
        useAI: useAI && !!groqApiKey,
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

  const handleSetYoutubeApiKey = async () => {
    if (!youtubeApiKey.trim()) return;
    try {
      await chrome.runtime.sendMessage({ action: 'setApiKey', apiKey: youtubeApiKey.trim() });
      await chrome.storage.local.set({ youtubeApiKey: youtubeApiKey.trim() });
      setShowSettings(false);
    } catch (error) {
      console.error('Failed to set YouTube API key:', error);
    }
  };

  const handleSetGroqApiKey = async () => {
    if (!groqApiKey.trim()) return;
    try {
      await chrome.runtime.sendMessage({ action: 'setGroqApiKey', apiKey: groqApiKey.trim() });
      await chrome.storage.local.set({ groqApiKey: groqApiKey.trim() });
    } catch (error) {
      console.error('Failed to set Groq API key:', error);
    }
  };

  const openVideo = (videoId: string) => {
    chrome.tabs.create({ url: `https://www.youtube.com/watch?v=${videoId}` });
  };

  return (
    <div className="popup-container">
      {/* Header with logo and settings */}
      <div className="popup-header">
        <div className="header-left">
          <div 
            className={showSettings ? "logo-link clickable" : "logo-link"} 
            onClick={showSettings ? () => setShowSettings(false) : undefined}
            style={showSettings ? { cursor: 'pointer' } : {}}
          >
            <img src={chrome.runtime.getURL('FoxLogo.png')} alt="ScoutFox" className="logo-icon" width="32" height="32" />
          </div>
          <h1 
            className="popup-title"
            onClick={showSettings ? () => setShowSettings(false) : undefined}
            style={showSettings ? { cursor: 'pointer' } : {}}
          >
            ScoutFox
          </h1>
        </div>
        <div className="header-right">
          <button 
            className="mail-btn" 
            onClick={() => {
              const subject = encodeURIComponent('ScoutFox Support');
              const body = encodeURIComponent('Hello,\n\n');
              window.open(`mailto:abeerdas647@gmail.com?subject=${subject}&body=${body}`, '_blank');
            }}
            title="Contact Support"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
            </svg>
          </button>
          <button 
            className="settings-btn" 
            onClick={() => {
              chrome.tabs.create({ url: chrome.runtime.getURL('settings.html') });
            }}
            title="Settings"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94L14.4 2.81c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="settings-panel">
          <div className="settings-section">
            <label className="settings-label">YouTube API Key:</label>
            <input
              type="password"
              value={youtubeApiKey}
              onChange={(e) => setYoutubeApiKey(e.target.value)}
              placeholder="Enter YouTube Data API v3 key"
              className="settings-input"
            />
            <button onClick={handleSetYoutubeApiKey} className="btn-save">Save</button>
          </div>
          <div className="settings-section">
            <label className="settings-label">Groq API Key (for AI optimization):</label>
            <input
              type="password"
              value={groqApiKey}
              onChange={(e) => setGroqApiKey(e.target.value)}
              placeholder="Enter Groq API key"
              className="settings-input"
            />
            <button onClick={handleSetGroqApiKey} className="btn-save">Save</button>
          </div>
          <div className="settings-section">
            <label className="settings-checkbox-label">
              <input
                type="checkbox"
                checked={useAI}
                onChange={(e) => {
                  setUseAI(e.target.checked);
                  chrome.storage.local.set({ useAI: e.target.checked });
                }}
              />
              Use AI to optimize search queries
            </label>
          </div>
          <button onClick={() => setShowSettings(false)} className="btn-close-settings">Close</button>
        </div>
      )}

      {/* Search Button */}
      {!showSettings && (
        <>
          <button
            onClick={() => handleSearch(false)}
            disabled={state.loading || !youtubeApiKey}
            className="btn-search"
          >
            {state.loading ? (
              <span className="loading-spinner"></span>
            ) : (
              'Search Reviews'
            )}
          </button>

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
            </div>
          )}

          {state.loading && (
            <div className="loading">
              <p>Searching YouTube for reviews...</p>
              <div className="loading-progress">
                <div className="loading-progress-bar"></div>
              </div>
            </div>
          )}

          {!state.loading && state.results.length > 0 && (
            <div className="results-section">
              <div className="results-header">
                <div className="sort-toggle">
                  <button
                    className={`sort-btn ${sortBy === 'likes' ? 'active' : ''}`}
                    onClick={() => setSortBy('likes')}
                  >
                    Likes
                  </button>
                  <button
                    className={`sort-btn ${sortBy === 'views' ? 'active' : ''}`}
                    onClick={() => setSortBy('views')}
                  >
                    Views
                  </button>
                </div>
                <h2 className="results-title">Found {state.results.length} Review{state.results.length !== 1 ? 's' : ''}</h2>
              </div>
              <div className="results-list">
                {[...state.results]
                  .sort((a, b) => {
                    if (sortBy === 'likes') {
                      const aLikes = a.likeCount || 0;
                      const bLikes = b.likeCount || 0;
                      return bLikes - aLikes;
                    } else {
                      return b.viewCount - a.viewCount;
                    }
                  })
                  .map((video) => (
                  <div
                    key={video.videoId}
                    className="result-item"
                    onClick={() => openVideo(video.videoId)}
                  >
                    <div className="thumbnail-wrapper">
                      <img
                        src={video.thumbnailUrl}
                        alt={video.title}
                        className="result-thumbnail"
                      />
                      <div className="external-link-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                          <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
                        </svg>
                      </div>
                    </div>
                    <div className="result-content">
                      <h3 className="result-video-title" title={video.title}>
                        {video.title}
                      </h3>
                      <p className="result-channel">{video.channelTitle}</p>
                      <div className="result-stats">
                        <span className="result-stat">
                          <svg className="stat-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                          </svg>
                          {formatCount(video.viewCount)}
                        </span>
                        {video.likeCount !== undefined && (
                          <span className="result-stat">
                            <svg className="stat-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/>
                            </svg>
                            {formatCount(video.likeCount)}
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
