# ScoutFox

[Webstore Link](https://chromewebstore.google.com/detail/scoutfox-amazon-to-youtub/cancdjeilnhhafmbmhmomnojmcgppjcl)

ScoutFox is a Chrome extension that connects Amazon and YouTube in both directions. From an Amazon product page, it helps you quickly find relevant YouTube review videos. From a YouTube video, it identifies products being discussed and opens the corresponding Amazon search results. The goal is simple: reduce the friction between researching products and watching real reviews.

The extension runs entirely in the browser, with a lightweight serverless backend used only where it makes sense (API key protection and AI-based extraction). It is built with TypeScript and React and follows Chrome Manifest V3 conventions.

## Overview

ScoutFox works in two main flows. On Amazon product pages, it extracts the product name and key identifiers, cleans the title, and searches YouTube for review videos that are actually relevant instead of marketing-heavy results. On YouTube watch pages, it analyzes the video context and uses an LLM to identify products mentioned in the video, then lets the user open Amazon search results for any of them.

The extension is designed to feel fast and predictable. Results are cached locally, API calls are minimized, and nothing runs unless the user explicitly opens the extension.

<img width="500" alt="image" src="https://github.com/user-attachments/assets/6cacd023-102c-4235-ba1a-26fd901e3371" />
<img width="500" alt="image" src="https://github.com/user-attachments/assets/17dff73c-ef7a-4a79-af6a-b73e7daac4b8" />


### System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    Chrome Extension (MV3)                    │
├─────────────────────────────────────────────────────────────-┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    │
│  │   Popup UI   │    │  Background  │    │   Content    │    │
│  │   (React)    │◄──►│   Service    │◄──►│   Scripts    │    │
│  │              │    │   Worker     │    │              │    │
│  └──────────────┘    └──────────────┘    └──────────────┘    │
│         │                   │                    │           │
│         │                   │                    │           │
│         └───────────────────┴────────────────────┘           │
│                            │                                 │
│                            ▼                                 │
│              ┌──────────────────────────┐                    │
│              │   chrome.storage.local   │                    │
│              │   (State & Cache)        │                    │
│              └──────────────────────────┘                    │
└─────────────────────────────┬────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────┐
│              Vercel Backend (Serverless)                   │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │ /api/extract-    │         │ /api/search-     │         │
│  │   product        │         │   youtube        │         │
│  │ (YouTube→Amazon) │         │ (Amazon→YouTube) │         │
│  └────────┬─────────┘         └────────┬─────────┘         │
│           │                            │                   │
│           ▼                            ▼                   │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │   Groq API       │         │  YouTube Data    │         │
│  │   (LLM)          │         │  API v3          │         │
│  └──────────────────┘         └──────────────────┘         │
└────────────────────────────────────────────────────────────┘
```


## Tech Stack

The extension is built using WXT, which provides Vite-based tooling specifically for Chrome extensions. Everything is written in strict TypeScript. The UI is a small React 18 app styled with Tailwind CSS and rendered inside the extension popup. Testing is done with Vitest.

For backend functionality, ScoutFox uses Vercel serverless functions. These act as a thin proxy layer for the YouTube Data API and the Groq LLM API (Llama 3.3 70B). This keeps API keys out of the client and allows request shaping, caching, and fallback behavior.

## How It Works

### Amazon to YouTube

When the extension is opened on an Amazon product page, a content script extracts the product title, subtitle, and ASIN from the DOM. This information is normalized to remove marketing language while preserving important identifiers like model numbers or storage sizes. The cleaned query is then sent to the backend, which performs a YouTube search and returns review-focused results. The extension displays video thumbnails, titles, channels, and engagement stats directly in the popup.

Results are cached locally for 24 hours using `chrome.storage.local`, keyed by URL and product title, so revisiting the same product does not trigger new API calls.

### YouTube to Amazon

On a YouTube watch page, the extension collects the video title, description, channel name, and surrounding metadata. This context is sent to the backend, where an LLM extracts product names mentioned in the video. The extension supports multiple products per video, which is useful for comparison or roundup-style reviews. The user can select a product, and the extension opens a new Amazon search tab for that item.

## Project Structure

The codebase is organized around clear separation of responsibilities. Background service workers handle coordination and API communication. Content scripts interact with Amazon and YouTube pages. The popup UI is a small React app. Shared logic, types, and utilities live in a common directory so they can be reused safely across environments.

Tests focus on the most error-prone logic, especially title normalization and query generation.

## Features

ScoutFox remembers the last results shown for a given page, supports keyboard shortcuts to open the popup, and includes a settings page for toggling AI-based optimization or providing optional personal API keys. It works across all major Amazon domains and degrades gracefully when APIs fail or quotas are exceeded.

A full privacy policy is included with the extension. No analytics or tracking are used, and no data is processed unless the user initiates an action.

## Security and Privacy

All third-party API keys are stored server-side in Vercel environment variables. The extension never exposes these keys to the client. For advanced users, optional personal API keys can be provided and are stored in `chrome.storage.local`, relying on Chrome’s built-in encryption.

Permissions are scoped tightly. The extension only runs on Amazon product pages and YouTube watch pages, and only accesses the active tab when needed. The content security policy disallows inline scripts, `eval`, and untrusted network connections.

## Performance

ScoutFox is designed to minimize API usage. Cached results eliminate repeated calls, and URL-based invalidation ensures correctness when navigating between products or videos. When quotas are exceeded, the extension falls back cleanly and surfaces clear error messages instead of failing silently.

## Development

Development requires Node.js 18 or newer and a Chromium-based browser. WXT handles hot reloading during development, making iteration fast. The production build outputs a standard MV3 bundle that can be zipped and uploaded directly to the Chrome Web Store.

## Deployment

The Chrome extension is built from the `.output/chrome-mv3` directory and submitted through the Chrome Web Store Developer Dashboard. The backend is deployed separately on Vercel and exposes only two endpoints: one for product extraction and one for YouTube search.

## Future Work

Planned improvements include better video filtering, saved/bookmarked reviews, expanded locale support, and ports to other browsers like Firefox and Edge.

## License

MIT

## Author

Built as a portfolio project to demonstrate Chrome extension development with Manifest V3, strong TypeScript usage, React-based UI design, serverless backend architecture, and secure API integration.
