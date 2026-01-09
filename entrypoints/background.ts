/**
 * Background service worker entry point (WXT entrypoint)
 */

import { defineBackground } from 'wxt/sandbox';
import '../background/index';

export default defineBackground(() => {
  // Background script is initialized in background/index.ts
  console.log('ScoutFox background service worker initialized');
  
  // Handle keyboard shortcut (Ctrl+M / Cmd+M)
  chrome.commands.onCommand.addListener((command) => {
    if (command === 'open-popup') {
      chrome.action.openPopup();
    }
  });
});
