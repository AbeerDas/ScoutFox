/**
 * YouTube content script for extracting product information and injecting "Search on Amazon" button
 */

import type { YouTubePageContext } from '../shared/types';

/**
 * Extract all available semantic signals from YouTube video page
 */
function extractYouTubeContext(): YouTubePageContext {
  // Video title
  const titleElement = document.querySelector('h1.ytd-watch-metadata yt-formatted-string, h1 yt-formatted-string');
  const videoTitle = titleElement?.textContent?.trim() || null;

  // Document title
  const documentTitle = document.title || null;

  // Channel name
  const channelElement = document.querySelector('ytd-channel-name a, #channel-name a, #owner-sub-count a');
  const channelName = channelElement?.textContent?.trim() || null;

  // Description - try to get expanded description
  let description: string | null = null;
  
  // Try to find and expand description if collapsed
  const moreButton = document.querySelector('#description #more, ytd-expander #more');
  if (moreButton && (moreButton as HTMLElement).textContent?.includes('more')) {
    (moreButton as HTMLElement).click();
    // Wait a bit for expansion
    setTimeout(() => {}, 100);
  }

  // Get description text
  const descriptionElement = document.querySelector('#description, ytd-expander #description');
  if (descriptionElement) {
    description = descriptionElement.textContent?.trim() || null;
  }

  // Get visible metadata (tags, badges, etc.)
  const metadataElements = document.querySelectorAll('ytd-watch-info-text, .ytd-watch-info-text, #info-text');
  let metadataText = '';
  metadataElements.forEach(el => {
    const text = el.textContent?.trim();
    if (text) {
      metadataText += text + ' ';
    }
  });

  // Meta tags
  const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
  const ogDescription = document.querySelector('meta[property="og:description"]')?.getAttribute('content');

  // Combine all text into raw blob
  const rawTextBlob = [
    videoTitle,
    documentTitle,
    channelName,
    description,
    metadataText,
    ogTitle,
    ogDescription,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  return {
    videoTitle,
    description,
    channelName,
    documentTitle,
    rawTextBlob,
  };
}

/**
 * Inject "Search on Amazon" button into YouTube page
 */
function injectAmazonButton() {
  // Check if button already exists
  if (document.getElementById('scoutfox-amazon-button')) {
    return;
  }

  // Find a good place to inject the button (near the subscribe button or action buttons)
  const targetContainer = document.querySelector(
    '#top-level-buttons-computed, ytd-menu-renderer, #actions, .ytd-watch-flexy'
  );

  if (!targetContainer) {
    // Fallback: inject near title
    const titleContainer = document.querySelector('ytd-watch-metadata, #above-the-fold');
    if (titleContainer) {
      createButton(titleContainer as HTMLElement);
    }
    return;
  }

  createButton(targetContainer as HTMLElement);
}

function createButton(container: HTMLElement) {
  const button = document.createElement('button');
  button.id = 'scoutfox-amazon-button';
  button.textContent = 'Search on Amazon';
  button.className = 'scoutfox-amazon-btn';
  
  button.addEventListener('click', async () => {
    button.disabled = true;
    button.textContent = 'Searching...';

    try {
      const context = extractYouTubeContext();
      
      // Send to background script
      const response = await chrome.runtime.sendMessage({
        type: 'SEARCH_AMAZON_FROM_YOUTUBE',
        context,
      });

      if (response.success && response.url) {
        window.open(response.url, '_blank');
      } else {
        alert('Failed to extract product. Please try again.');
      }
    } catch (error) {
      console.error('ScoutFox: Error searching Amazon', error);
      alert('An error occurred. Please try again.');
    } finally {
      button.disabled = false;
      button.textContent = 'Search on Amazon';
    }
  });

  // Add styles
  if (!document.getElementById('scoutfox-amazon-button-styles')) {
    const style = document.createElement('style');
    style.id = 'scoutfox-amazon-button-styles';
    style.textContent = `
      .scoutfox-amazon-btn {
        background: linear-gradient(135deg, #FF6B35 0%, #FF8C5A 100%);
        color: white;
        border: none;
        border-radius: 18px;
        padding: 10px 20px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        margin-left: 8px;
        transition: all 0.2s;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      .scoutfox-amazon-btn:hover {
        background: linear-gradient(135deg, #E55A2B 0%, #FF6B35 100%);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(255, 107, 53, 0.3);
      }
      .scoutfox-amazon-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    `;
    document.head.appendChild(style);
  }

  container.appendChild(button);
}

// Initial injection
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(injectAmazonButton, 1000);
  });
} else {
  setTimeout(injectAmazonButton, 1000);
}

// Watch for YouTube SPA navigation
let lastUrl = location.href;
const observer = new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    // Remove old button and inject new one
    const oldButton = document.getElementById('scoutfox-amazon-button');
    if (oldButton) {
      oldButton.remove();
    }
    setTimeout(injectAmazonButton, 1000);
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
});

// Also listen for popstate
window.addEventListener('popstate', () => {
  const oldButton = document.getElementById('scoutfox-amazon-button');
  if (oldButton) {
    oldButton.remove();
  }
  setTimeout(injectAmazonButton, 1000);
});
