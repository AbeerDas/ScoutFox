/**
 * Settings page script
 * Handles API key management and backend status checking
 */

const VERCEL_API_URL = 'https://yt-amazon-backend-proxy.vercel.app';

async function validateYouTubeApiKey(key: string): Promise<boolean> {
  try {
    const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=test&key=${key}&maxResults=1`);
    return response.ok;
  } catch {
    return false;
  }
}

async function validateGroqApiKey(key: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 5,
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

function showToast(message: string, isError: boolean = false): void {
  const toast = document.getElementById('toast');
  if (!toast) return;
  
  toast.textContent = message;
  toast.className = `toast ${isError ? 'error' : ''} show`;
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// Check backend status
async function checkBackendStatus(): Promise<void> {
  const card = document.getElementById('backend-status-card');
  const message = document.getElementById('backend-status-message');
  if (!card || !message) return;
  
  const icon = document.getElementById('backend-status-icon') || card.querySelector('.status-icon');
  if (!icon) return;
  
  try {
    console.log('[Settings] Checking backend status...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${VERCEL_API_URL}/api/search-youtube`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productTitle: 'test', optimizeTitle: false }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    console.log('[Settings] Backend response:', response.status);
    
      if (response.status === 400 || response.status === 500 || response.ok) {
        card.className = 'backend-status-card connected';
        icon.className = 'status-icon connected';
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z');
        svg.appendChild(path);
        icon.textContent = '';
        icon.appendChild(svg);
      
      try {
        const responseData = await response.json();
        console.log('[Settings] Response data:', responseData);
        if (responseData.error && responseData.error.includes('quota')) {
          message.textContent = 'Our servers are running but YouTube API quota is currently exceeded. Please use your own API keys or try again later.';
        } else {
          message.textContent = 'Our servers are running and operational. You can use our service or your own API keys.';
        }
      } catch (parseError) {
        console.log('[Settings] Could not parse response as JSON');
        message.textContent = 'Our servers are running and operational. You can use our service or your own API keys.';
      }
      } else {
        card.className = 'backend-status-card disconnected';
        icon.className = 'status-icon disconnected';
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z');
        svg.appendChild(path);
        icon.textContent = '';
        icon.appendChild(svg);
        message.textContent = 'Backend service is currently unavailable. Please use your own API keys.';
      }
    } catch (error: any) {
      console.error('[Settings] Backend status check error:', error);
      card.className = 'backend-status-card disconnected';
      icon.className = 'status-icon disconnected';
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z');
      svg.appendChild(path);
      icon.textContent = '';
      icon.appendChild(svg);
    if (error.name === 'AbortError') {
      message.textContent = 'Backend status check timed out. Please use your own API keys.';
    } else {
      message.textContent = 'Unable to reach backend service. Please use your own API keys.';
    }
  }
}

// Update usage indicator
function updateUsageIndicators(): void {
  chrome.storage.local.get(['youtubeApiKey', 'groqApiKey', 'useOwnYouTubeKey', 'useOwnGroqKey'], (data) => {
    // YouTube
    const youtubeUsage = document.getElementById('youtube-usage');
    const youtubeUsageText = document.getElementById('youtube-usage-text');
    if (youtubeUsage && youtubeUsageText) {
      const useOwnYoutube = data.useOwnYouTubeKey && data.youtubeApiKey;
      
      if (useOwnYoutube) {
        youtubeUsage.className = 'usage-indicator active';
        youtubeUsageText.textContent = 'Your personal API key';
      } else {
        youtubeUsage.className = 'usage-indicator';
        youtubeUsageText.textContent = 'ScoutFox backend service';
      }
    }

    // Groq
    const groqUsage = document.getElementById('groq-usage');
    const groqUsageText = document.getElementById('groq-usage-text');
    if (groqUsage && groqUsageText) {
      const useOwnGroq = data.useOwnGroqKey && data.groqApiKey;
      
      if (useOwnGroq) {
        groqUsage.className = 'usage-indicator active';
        groqUsageText.textContent = 'Your personal API key';
      } else {
        groqUsage.className = 'usage-indicator';
        groqUsageText.textContent = 'ScoutFox backend service';
      }
    }
  });
}

// Load saved keys and preferences
function loadSettings(): void {
  chrome.storage.local.get(['youtubeApiKey', 'groqApiKey', 'useOwnYouTubeKey', 'useOwnGroqKey'], (data) => {
    console.log('[Settings] Loading settings:', data);
    
    // YouTube
    const useOwnYoutube = data.useOwnYouTubeKey && data.youtubeApiKey;
    const youtubeToggle = document.getElementById('use-own-youtube') as HTMLInputElement;
    if (youtubeToggle) {
      youtubeToggle.checked = useOwnYoutube;
    }
    
    if (data.youtubeApiKey) {
      const keyDisplay = document.getElementById('youtube-key-display');
      const keyValue = document.getElementById('youtube-key-value');
      const inputSection = document.getElementById('youtube-input-section');
      
      if (keyDisplay) keyDisplay.classList.add('show');
      if (keyValue) keyValue.textContent = '•'.repeat(data.youtubeApiKey.length);
      if (inputSection) inputSection.style.display = 'none';
    } else {
      const keyDisplay = document.getElementById('youtube-key-display');
      const inputSection = document.getElementById('youtube-input-section');
      
      if (keyDisplay) keyDisplay.classList.remove('show');
      if (inputSection) inputSection.style.display = useOwnYoutube ? 'block' : 'none';
    }

    // Groq
    const useOwnGroq = data.useOwnGroqKey && data.groqApiKey;
    const groqToggle = document.getElementById('use-own-groq') as HTMLInputElement;
    if (groqToggle) {
      groqToggle.checked = useOwnGroq;
    }
    
    if (data.groqApiKey) {
      const keyDisplay = document.getElementById('groq-key-display');
      const keyValue = document.getElementById('groq-key-value');
      const inputSection = document.getElementById('groq-input-section');
      
      if (keyDisplay) keyDisplay.classList.add('show');
      if (keyValue) keyValue.textContent = '•'.repeat(data.groqApiKey.length);
      if (inputSection) inputSection.style.display = 'none';
    } else {
      const keyDisplay = document.getElementById('groq-key-display');
      const inputSection = document.getElementById('groq-input-section');
      
      if (keyDisplay) keyDisplay.classList.remove('show');
      if (inputSection) inputSection.style.display = useOwnGroq ? 'block' : 'none';
    }

    updateUsageIndicators();
  });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Privacy Policy link
  const privacyLink = document.getElementById('privacy-policy-link');
  if (privacyLink) {
    privacyLink.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: chrome.runtime.getURL('privacy.html') });
    });
  }
  // Toggle handlers
  const youtubeToggle = document.getElementById('use-own-youtube');
  if (youtubeToggle) {
    youtubeToggle.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      chrome.storage.local.get(['youtubeApiKey'], (data) => {
        if (target.checked) {
          // Show input if no key exists
          const inputSection = document.getElementById('youtube-input-section');
          if (!data.youtubeApiKey) {
            if (inputSection) inputSection.style.display = 'block';
            showToast('Enter your API key below and click Save', false);
          } else {
            chrome.storage.local.set({ useOwnYouTubeKey: true }, () => {
              console.log('[Settings] Saved useOwnYouTubeKey: true');
              updateUsageIndicators();
              showToast('Now using your YouTube API key');
            });
          }
        } else {
          chrome.storage.local.set({ useOwnYouTubeKey: false }, () => {
            console.log('[Settings] Saved useOwnYouTubeKey: false');
            const inputSection = document.getElementById('youtube-input-section');
            if (inputSection) inputSection.style.display = 'none';
            updateUsageIndicators();
            showToast('Switched to ScoutFox backend service');
          });
        }
      });
    });
  }

  const groqToggle = document.getElementById('use-own-groq');
  if (groqToggle) {
    groqToggle.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      chrome.storage.local.get(['groqApiKey'], (data) => {
        if (target.checked) {
          // Show input if no key exists
          const inputSection = document.getElementById('groq-input-section');
          if (!data.groqApiKey) {
            if (inputSection) inputSection.style.display = 'block';
            showToast('Enter your API key below and click Save', false);
          } else {
            chrome.storage.local.set({ useOwnGroqKey: true }, () => {
              console.log('[Settings] Saved useOwnGroqKey: true');
              updateUsageIndicators();
              showToast('Now using your Groq API key');
            });
          }
        } else {
          chrome.storage.local.set({ useOwnGroqKey: false }, () => {
            console.log('[Settings] Saved useOwnGroqKey: false');
            const inputSection = document.getElementById('groq-input-section');
            if (inputSection) inputSection.style.display = 'none';
            updateUsageIndicators();
            showToast('Switched to ScoutFox backend service');
          });
        }
      });
    });
  }

  // See/Delete handlers
  let youtubeKeyVisible = false;
  const youtubeSeeBtn = document.getElementById('youtube-see-btn');
  if (youtubeSeeBtn) {
    youtubeSeeBtn.addEventListener('click', () => {
      chrome.storage.local.get(['youtubeApiKey'], (data) => {
        youtubeKeyVisible = !youtubeKeyVisible;
        const keyValue = document.getElementById('youtube-key-value');
        if (keyValue) {
          keyValue.textContent = youtubeKeyVisible ? data.youtubeApiKey : '•'.repeat(data.youtubeApiKey.length);
        }
      });
    });
  }

  const youtubeDeleteBtn = document.getElementById('youtube-delete-btn');
  if (youtubeDeleteBtn) {
    youtubeDeleteBtn.addEventListener('click', () => {
      if (confirm('Delete your YouTube API key? You will use ScoutFox backend service instead.')) {
        chrome.storage.local.remove(['youtubeApiKey', 'useOwnYouTubeKey'], () => {
          chrome.runtime.sendMessage({ action: 'setApiKey', apiKey: '' });
          loadSettings();
          showToast('YouTube API key deleted. Using ScoutFox backend service.');
        });
      }
    });
  }

  let groqKeyVisible = false;
  const groqSeeBtn = document.getElementById('groq-see-btn');
  if (groqSeeBtn) {
    groqSeeBtn.addEventListener('click', () => {
      chrome.storage.local.get(['groqApiKey'], (data) => {
        groqKeyVisible = !groqKeyVisible;
        const keyValue = document.getElementById('groq-key-value');
        if (keyValue) {
          keyValue.textContent = groqKeyVisible ? data.groqApiKey : '•'.repeat(data.groqApiKey.length);
        }
      });
    });
  }

  const groqDeleteBtn = document.getElementById('groq-delete-btn');
  if (groqDeleteBtn) {
    groqDeleteBtn.addEventListener('click', () => {
      if (confirm('Delete your Groq API key? You will use ScoutFox backend service instead.')) {
        chrome.storage.local.remove(['groqApiKey', 'useOwnGroqKey'], () => {
          chrome.runtime.sendMessage({ action: 'setGroqApiKey', apiKey: '' });
          loadSettings();
          showToast('Groq API key deleted. Using ScoutFox backend service.');
        });
      }
    });
  }

  // Save handlers
  const saveYoutubeBtn = document.getElementById('save-youtube');
  if (saveYoutubeBtn) {
    saveYoutubeBtn.addEventListener('click', async () => {
      const keyInput = document.getElementById('youtube-key') as HTMLInputElement;
      if (!keyInput) return;
      
      const key = keyInput.value.trim();
      
      if (!key) {
        showToast('Please enter an API key', true);
        return;
      }

      try {
        console.log('[Settings] Validating YouTube API key...');
        const isValid = await validateYouTubeApiKey(key);
        if (!isValid) {
          showToast('Invalid API key. Would you like to use ScoutFox backend service instead?', true);
          if (confirm('Invalid YouTube API key detected. Would you like to use ScoutFox backend service instead?')) {
            chrome.storage.local.set({ useOwnYouTubeKey: false });
            loadSettings();
          }
          return;
        }
        
        console.log('[Settings] Saving YouTube API key...');
        await chrome.runtime.sendMessage({ action: 'setApiKey', apiKey: key });
        await chrome.storage.local.set({ youtubeApiKey: key, useOwnYouTubeKey: true }, () => {
          console.log('[Settings] YouTube API key saved to storage');
          keyInput.value = '';
          loadSettings();
          showToast('YouTube API key saved!');
        });
      } catch (error: any) {
        console.error('[Settings] Error saving YouTube key:', error);
        showToast('Failed to save API key: ' + (error.message || 'Unknown error'), true);
      }
    });
  }

  const saveGroqBtn = document.getElementById('save-groq');
  if (saveGroqBtn) {
    saveGroqBtn.addEventListener('click', async () => {
      const keyInput = document.getElementById('groq-key') as HTMLInputElement;
      if (!keyInput) return;
      
      const key = keyInput.value.trim();
      
      if (!key) {
        showToast('Please enter an API key', true);
        return;
      }

      try {
        console.log('[Settings] Validating Groq API key...');
        const isValid = await validateGroqApiKey(key);
        if (!isValid) {
          showToast('Invalid API key. Would you like to use ScoutFox backend service instead?', true);
          if (confirm('Invalid Groq API key detected. Would you like to use ScoutFox backend service instead?')) {
            chrome.storage.local.set({ useOwnGroqKey: false });
            loadSettings();
          }
          return;
        }
        
        console.log('[Settings] Saving Groq API key...');
        await chrome.runtime.sendMessage({ action: 'setGroqApiKey', apiKey: key });
        await chrome.storage.local.set({ groqApiKey: key, useOwnGroqKey: true }, () => {
          console.log('[Settings] Groq API key saved to storage');
          keyInput.value = '';
          loadSettings();
          showToast('Groq API key saved!');
        });
      } catch (error: any) {
        console.error('[Settings] Error saving Groq key:', error);
        showToast('Failed to save API key: ' + (error.message || 'Unknown error'), true);
      }
    });
  }

  // Initialize
  checkBackendStatus();
  loadSettings();
});
