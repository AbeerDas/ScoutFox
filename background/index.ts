/**
 * Background service worker entry point
 */

import './youtube';
import './amazon';

console.log('ScoutFox background service worker initialized');

// Keep service worker alive by listening to events
chrome.runtime.onInstalled.addListener(() => {
  console.log('ScoutFox extension installed/updated');
});

// Listen for extension startup
chrome.runtime.onStartup.addListener(() => {
  console.log('ScoutFox extension started');
});

// Listen for messages to keep service worker alive
chrome.runtime.onConnect.addListener(() => {
  console.log('Service worker connection established');
});
