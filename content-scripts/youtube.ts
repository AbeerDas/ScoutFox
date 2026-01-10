import type { YouTubePageContext } from '../shared/types';

function extractYouTubeContext(): YouTubePageContext {
  const titleElement = document.querySelector('h1.ytd-watch-metadata') as HTMLElement;
  const videoTitle = titleElement?.innerText?.trim() || null;
  const documentTitle = document.title || null;
  const channelElement = document.querySelector('#channel-name a') as HTMLElement;
  const channelName = channelElement?.innerText?.trim() || null;

  let description: string | null = null;
  const descriptionElement = document.querySelector('#description-inline-expander') as HTMLElement;
  if (descriptionElement) {
    description = descriptionElement.innerText?.trim() || null;
  }
  
  if (!description) {
    const fallbackDesc = document.querySelector('#description, ytd-expander #description') as HTMLElement;
    if (fallbackDesc) {
      description = fallbackDesc.innerText?.trim() || null;
    }
  }

  const keywords = document.querySelector('meta[name="keywords"]')?.getAttribute('content');
  const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
  const ogDescription = document.querySelector('meta[property="og:description"]')?.getAttribute('content');
  
  const rawTextBlob = [
    videoTitle,
    documentTitle,
    channelName,
    description,
    keywords,
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

function injectAmazonButton() {
  if (document.getElementById('scoutfox-amazon-button')) {
    return;
  }

  const targetContainer = document.querySelector(
    '#top-level-buttons-computed, ytd-menu-renderer, #actions, .ytd-watch-flexy'
  );

  if (!targetContainer) {
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
  button.textContent = 'Search for Products';
  button.className = 'scoutfox-amazon-btn';
  
  button.addEventListener('click', async () => {
    button.disabled = true;
    button.textContent = 'Searching...';

    try {
      const context = extractYouTubeContext();
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
      button.textContent = 'Search for Products';
    }
  });
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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(injectAmazonButton, 1000);
  });
} else {
  setTimeout(injectAmazonButton, 1000);
}

let lastUrl = location.href;
const observer = new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
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

window.addEventListener('popstate', () => {
  const oldButton = document.getElementById('scoutfox-amazon-button');
  if (oldButton) {
    oldButton.remove();
  }
  setTimeout(injectAmazonButton, 1000);
});

chrome.runtime.onMessage.addListener((
  message: { action: string },
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response: { success: boolean; data?: YouTubePageContext; error?: string }) => void
) => {
  if (message.action === 'extractYouTubeContext') {
    try {
      console.log('[YouTube] Extracting context...');
      const context = extractYouTubeContext();
      console.log('[YouTube] Context extracted:', {
        hasVideoTitle: !!context.videoTitle,
        hasDescription: !!context.description,
        hasChannelName: !!context.channelName,
        rawTextBlobLength: context.rawTextBlob?.length || 0,
      });
      
      if (!context.videoTitle && !context.documentTitle) {
        console.warn('[YouTube] No title found in context');
        sendResponse({ 
          success: false, 
          error: 'Could not find video title on page. Make sure you are on a YouTube video page.' 
        });
        return true;
      }
      
      sendResponse({ success: true, data: context });
    } catch (error) {
      console.error('[YouTube] Error extracting context:', error);
      sendResponse({ success: false, error: String(error) });
    }
    return true;
  }
  return false;
});
