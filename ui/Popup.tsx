import React, { useState, useEffect } from 'react';
import type { VideoResult, AmazonProductInfo, YouTubePageContext } from '../shared/types';
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
  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [isYouTubePage, setIsYouTubePage] = useState(false);
  const [detectedProducts, setDetectedProducts] = useState<Array<{ productName: string; confidence: number }>>([]);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [detectingProduct, setDetectingProduct] = useState(false);
  const [isUnsupportedPage, setIsUnsupportedPage] = useState(false);

  useEffect(() => {
    const checkBackendStatus = async () => {
      try {
        const { VERCEL_API_URL } = await import('../shared/config');
        if (VERCEL_API_URL && !VERCEL_API_URL.includes('your-project-name')) {
          const response = await fetch(`${VERCEL_API_URL}/api/search-youtube`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productTitle: 'test', optimizeTitle: false }),
          });
          
          if (response.status === 400 || response.status === 500 || response.ok) {
            setBackendStatus('connected');
          } else {
            setBackendStatus('disconnected');
          }
        } else {
          setBackendStatus('disconnected');
        }
      } catch (error) {
        console.warn('Backend status check failed:', error);
        setBackendStatus('disconnected');
      }
    };

    checkBackendStatus();
  }, []);
  useEffect(() => {
    (async () => {
      const data = await chrome.storage.local.get(['youtubeApiKey', 'groqApiKey', 'popupState', 'useAI']);
      
      if (data.youtubeApiKey) {
        setYoutubeApiKey(data.youtubeApiKey);
      }
      if (data.groqApiKey) {
        setGroqApiKey(data.groqApiKey);
      }
      if (data.useAI !== undefined) {
        setUseAI(data.useAI);
      }
      
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const isYouTube = tab.url && (tab.url.toLowerCase().includes('youtube.com/watch') || tab.url.toLowerCase().includes('youtu.be/'));
      
      if (!isYouTube && data.popupState && tab.url) {
        try {
          const savedState = JSON.parse(data.popupState);
          if (savedState.results && savedState.results.length > 0 && savedState.lastUrl === tab.url) {
            setState(savedState);
          }
        } catch (e) {
        }
      }
    })();
  }, []);

  useEffect(() => {
    if (state.results.length > 0 || state.productInfo) {
      chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
        const stateWithUrl = { ...state, lastUrl: tab.url };
        chrome.storage.local.set({ popupState: JSON.stringify(stateWithUrl) });
      });
    }
  }, [state]);

  useEffect(() => {
    const checkPageTypeAndDetect = async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab.url) {
          const url = tab.url.toLowerCase();
          const isYouTube = url.includes('youtube.com/watch') || url.includes('youtu.be/');
          setIsYouTubePage(isYouTube);
          
          if (isYouTube) {
            setState({
              loading: false,
              error: null,
              results: [],
              productInfo: null,
            });
            chrome.storage.local.remove('popupState');
            setIsUnsupportedPage(false);
            
            setDetectingProduct(true);
            try {
              let context: YouTubePageContext | null = null;
              
              try {
                const response = await chrome.tabs.sendMessage(tab.id!, { action: 'extractYouTubeContext' }) as { success: boolean; data?: YouTubePageContext; error?: string };
                if (response.success && response.data) {
                  context = response.data;
                }
              } catch (msgError) {
                try {
                  await chrome.scripting.executeScript({
                    target: { tabId: tab.id! },
                    files: ['youtube.js'],
                  });
                  await new Promise(resolve => setTimeout(resolve, 500));
                  const retryResponse = await chrome.tabs.sendMessage(tab.id!, { action: 'extractYouTubeContext' }) as { success: boolean; data?: YouTubePageContext; error?: string };
                  if (retryResponse.success && retryResponse.data) {
                    context = retryResponse.data;
                  }
                } catch (injectError) {
                  console.error('[Popup] Failed to extract context for auto-detection:', injectError);
                }
              }
              
              if (context) {
                const amazonResponse = await chrome.runtime.sendMessage({
                  type: 'SEARCH_AMAZON_FROM_YOUTUBE',
                  context,
                }) as { success: boolean; url?: string; error?: string; products?: Array<{ productName: string; confidence: number }> };
                
                if (amazonResponse.success && amazonResponse.products && amazonResponse.products.length > 0) {
                  setDetectedProducts(amazonResponse.products);
                  setSelectedProduct(amazonResponse.products[0].productName);
                }
              }
            } catch (error) {
              console.error('[Popup] Auto-detection error:', error);
            } finally {
              setDetectingProduct(false);
            }
          } else {
            setDetectedProducts([]);
            setSelectedProduct(null);
            
            const amazonDomains = ['amazon.com', 'amazon.ca', 'amazon.co.uk', 'amazon.de', 'amazon.fr', 
              'amazon.it', 'amazon.es', 'amazon.co.jp', 'amazon.in', 'amazon.com.au', 
              'amazon.com.br', 'amazon.com.mx', 'amazon.nl', 'amazon.se', 'amazon.pl',
              'amazon.sg', 'amazon.ae', 'amazon.sa', 'amazon.tr'];
            
            if (tab.url && amazonDomains.some(domain => tab.url!.toLowerCase().includes(domain))) {
              setIsUnsupportedPage(false);
              const data = await chrome.storage.local.get(['popupState']);
              if (data.popupState) {
                try {
                  const savedState = JSON.parse(data.popupState);
                  if (savedState.lastUrl === tab.url && savedState.results && savedState.results.length > 0) {
                    setState(savedState);
                  } else {
                    setTimeout(() => {
                      handleSearch(false);
                    }, 300);
                  }
                } catch (e) {
                  setTimeout(() => {
                    handleSearch(false);
                  }, 300);
                }
              } else {
                setTimeout(() => {
                  handleSearch(false);
                }, 300);
              }
            } else {
              setIsUnsupportedPage(true);
            }
          }
        }
      } catch (error) {
        console.error('Error checking page type:', error);
      }
    };
    checkPageTypeAndDetect();
  }, []);

  const handleSearch = async (bypassCache: boolean = false) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.url) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: 'Unable to detect current page.',
        }));
        return;
      }

      const url = tab.url.toLowerCase();
      const isYouTube = url.includes('youtube.com/watch') || url.includes('youtu.be/');
      
      if (isYouTube) {
        try {
          let context: YouTubePageContext | null = null;
          
          try {
            const response = await chrome.tabs.sendMessage(tab.id!, { action: 'extractYouTubeContext' }) as { success: boolean; data?: YouTubePageContext; error?: string };
            if (response.success && response.data) {
              context = response.data;
            } else {
              throw new Error(response.error || 'Failed to extract context');
            }
          } catch (msgError) {
            console.log('[Popup] First message attempt failed, trying to inject YouTube script:', msgError);
            try {
              await chrome.scripting.executeScript({
                target: { tabId: tab.id! },
                files: ['youtube.js'],
              });
              await new Promise(resolve => setTimeout(resolve, 500));
              const retryResponse = await chrome.tabs.sendMessage(tab.id!, { action: 'extractYouTubeContext' }) as { success: boolean; data?: YouTubePageContext; error?: string };
              if (retryResponse.success && retryResponse.data) {
                context = retryResponse.data;
              } else {
                throw new Error(retryResponse.error || 'Failed to extract context after injection');
              }
            } catch (injectError) {
              console.error('[Popup] Failed to inject or communicate with YouTube script:', injectError);
              throw new Error('Could not extract product information from YouTube page. Please refresh the page and try again.');
            }
          }
          
          if (!context || !context.videoTitle) {
            console.error('[Popup] Context is missing or invalid:', context);
            throw new Error('Could not extract YouTube context. The page may not be fully loaded.');
          }
          
          if (selectedProduct) {
            const encoded = encodeURIComponent(selectedProduct);
            const amazonURL = `https://www.amazon.com/s?k=${encoded}`;
            chrome.tabs.create({ url: amazonURL });
            setState(prev => ({ ...prev, loading: false }));
            return;
          }
          
          const amazonResponse = await chrome.runtime.sendMessage({
            type: 'SEARCH_AMAZON_FROM_YOUTUBE',
            context,
          }) as { success: boolean; url?: string; error?: string; products?: Array<{ productName: string; confidence: number }> };
          
          if (amazonResponse.success && amazonResponse.products && amazonResponse.products.length > 0) {
            setDetectedProducts(amazonResponse.products);
            setSelectedProduct(amazonResponse.products[0].productName);
            setState(prev => ({ ...prev, loading: false }));
            return;
          } else if (amazonResponse.success && amazonResponse.url) {
            chrome.tabs.create({ url: amazonResponse.url });
            setState(prev => ({ ...prev, loading: false }));
            return;
          } else {
            throw new Error(amazonResponse.error || 'Failed to extract product');
          }
        } catch (error) {
          console.error('YouTube to Amazon search error:', error);
          setState(prev => ({
            ...prev,
            loading: false,
            error: error instanceof Error ? error.message : 'Failed to search Amazon from YouTube',
          }));
          return;
        }
      }
      
      const amazonDomains = ['amazon.com', 'amazon.ca', 'amazon.co.uk', 'amazon.de', 'amazon.fr', 
        'amazon.it', 'amazon.es', 'amazon.co.jp', 'amazon.in', 'amazon.com.au', 
        'amazon.com.br', 'amazon.com.mx', 'amazon.nl', 'amazon.se', 'amazon.pl',
        'amazon.sg', 'amazon.ae', 'amazon.sa', 'amazon.tr'];
      
      if (!amazonDomains.some(domain => url.includes(domain))) {
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

      try {
        const { VERCEL_API_URL } = await import('../shared/config');
        
        if (VERCEL_API_URL && !VERCEL_API_URL.includes('your-project-name')) {
          console.log('[Popup] Trying direct backend call:', VERCEL_API_URL);
          
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000);
          
          try {
            const response = await fetch(`${VERCEL_API_URL}/api/search-youtube`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                productTitle: productInfo.title,
                subtitle: productInfo.subtitle || null,
                optimizeTitle: useAI,
              }),
              signal: controller.signal,
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
              const data = await response.json();
              if (data.success && data.results) {
                console.log('[Popup] Direct backend call succeeded!');
                setState(prev => ({
                  ...prev,
                  loading: false,
                  results: data.results || [],
                }));
                return;
              }
            }
          } catch (fetchError) {
            clearTimeout(timeoutId);
            if (fetchError instanceof Error && fetchError.name !== 'AbortError') {
              console.warn('[Popup] Direct backend call failed, trying service worker:', fetchError);
            }
          }
        }
      } catch (configError) {
        console.warn('[Popup] Could not import config, trying service worker:', configError);
      }

      console.log('[Popup] Attempting to use service worker...');
      const searchPromise = chrome.runtime.sendMessage({
        action: 'searchYouTubeForProduct',
        title: productInfo.title,
        subtitle: productInfo.subtitle,
        bypassCache,
        useAI: useAI,
      }) as Promise<{ success: boolean; data?: VideoResult[]; error?: string }>;

      const timeoutPromise = new Promise<{ success: boolean; error: string }>((resolve) => {
        setTimeout(() => {
          resolve({ success: false, error: 'Request timed out. Please reload the extension and try again.' });
        }, 15000);
      });

      const searchResponse = await Promise.race([searchPromise, timeoutPromise]);

      if (searchResponse.success && 'data' in searchResponse) {
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
    <div className={`popup-container ${state.results.length > 0 ? 'has-results' : ''}`}>
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
              window.open(`aamailto:abeerdas647@gmail.com?subject=${subject}&body=${body}`, '_blank');
            }}
            title="Contact Support"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
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
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94L14.4 2.81c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
            </svg>
          </button>
          <button 
            className="privacy-btn" 
            onClick={() => {
              chrome.tabs.create({ url: chrome.runtime.getURL('privacy.html') });
            }}
            title="Privacy Policy"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
            </svg>
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="settings-panel">
          <h2 className="settings-title">Settings</h2>
          
          <div className="settings-section">
            <div className="backend-status">
              <span className="backend-status-label">ScoutFox Service:</span>
                      <span className={`backend-status-indicator ${backendStatus}`}>
                        {backendStatus === 'checking' && 'Checking...'}
                        {backendStatus === 'connected' && 'Connected'}
                        {backendStatus === 'disconnected' && 'Disconnected'}
                      </span>
            </div>
            <p className="settings-description">
              {backendStatus === 'connected' 
                ? 'Using ScoutFox backend service (no API keys needed)'
                : backendStatus === 'checking'
                ? 'Checking connection to ScoutFox service...'
                : 'Backend unavailable. You can use your own API keys below.'}
            </p>
          </div>

          <div className="settings-divider"></div>

          <h3 className="settings-subtitle">Optional: Use Your Own API Keys</h3>
          <p className="settings-description">
            If you prefer to use your own API keys instead of the ScoutFox service, enter them below.
          </p>

          <div className="settings-section">
            <label className="settings-label">YouTube API Key:</label>
            <input
              type="password"
              value={youtubeApiKey}
              onChange={(e) => setYoutubeApiKey(e.target.value)}
              placeholder="Enter YouTube API Key (optional)"
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
              placeholder="Enter Groq API key (optional)"
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

      {!showSettings && (
        <>
          {isUnsupportedPage && (
            <div className="unsupported-page">
              <p className="unsupported-message">Navigate to an Amazon product page to find YouTube reviews, or a YouTube video page to search for products on Amazon. You can also press Ctrl+M (Cmd+M on Mac) to open ScoutFox on any page.</p>
            </div>
          )}

          {isYouTubePage && detectingProduct && (
            <div className="product-detecting">
              <p>Detecting products...</p>
            </div>
          )}

          {isYouTubePage && detectedProducts.length > 0 && (
            <div className="products-list">
              <p className="products-label">Select a product:</p>
              <div className="products-buttons">
                {detectedProducts.map((product, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedProduct(product.productName)}
                    className={`product-button ${selectedProduct === product.productName ? 'selected' : ''}`}
                  >
                    {product.productName}
                  </button>
                ))}
              </div>
            </div>
          )}

          {isYouTubePage && detectedProducts.length > 0 && (
            <button
              onClick={() => {
                if (selectedProduct) {
                  const encoded = encodeURIComponent(selectedProduct);
                  const amazonURL = `https://www.amazon.com/s?k=${encoded}`;
                  chrome.tabs.create({ url: amazonURL });
                }
              }}
              disabled={!selectedProduct}
              className="btn-search"
            >
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                Search on Amazon
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
                </svg>
              </span>
            </button>
          )}

          {!isYouTubePage && !isUnsupportedPage && (
            <button
              onClick={() => handleSearch(false)}
              disabled={state.loading || detectingProduct}
              className="btn-search"
            >
              {state.loading ? (
                <span className="loading-spinner"></span>
              ) : (
                'Search Reviews'
              )}
            </button>
          )}

          {!isYouTubePage && state.productInfo && (
            <div className="product-info">
              <p className="product-label">Last Product detected:</p>
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
                    className={`sort-btn ${sortBy === 'views' ? 'active' : ''}`}
                    onClick={() => setSortBy('views')}
                  >
                    Views
                  </button>
                  <button
                    className={`sort-btn ${sortBy === 'likes' ? 'active' : ''}`}
                    onClick={() => setSortBy('likes')}
                  >
                    Likes
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
                    </div>
                    <div className="result-content">
                      <h3 className="result-video-title" title={video.title}>
                        {video.title}
                      </h3>
                      <p className="result-channel">{video.channelTitle}</p>
                      <div className="result-stats">
                        <span className="result-stat">
                          {formatCount(video.viewCount)} views
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
                      <div className="external-link-icon">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
                        </svg>
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
