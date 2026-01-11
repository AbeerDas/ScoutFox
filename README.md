# ScoutFox

A production-ready Chrome Extension (Manifest V3) that bridges Amazon and YouTube, enabling users to find product review videos directly from Amazon product pages, and search Amazon products from YouTube videos using AI-powered product extraction.

## 🎯 Overview

ScoutFox is a bidirectional Chrome extension that:
- **Amazon → YouTube**: Extracts product information from Amazon pages and searches YouTube for review videos
- **YouTube → Amazon**: Uses AI (LLM) to extract product names from YouTube videos and opens Amazon search results

Built with modern web technologies, TypeScript, React, and a serverless backend architecture.

## 🏗️ Architecture

### Tech Stack

- **Framework**: [WXT](https://wxt.dev/) (Vite + Chrome Extension tooling)
- **Language**: TypeScript (strict mode)
- **UI**: React 18 + Tailwind CSS
- **Build Tool**: Vite 5
- **Testing**: Vitest
- **Backend**: Vercel Serverless Functions (Node.js)
- **AI/LLM**: Groq API (Llama 3.3 70B)
- **APIs**: YouTube Data API v3

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Chrome Extension (MV3)                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │   Popup UI   │    │  Background │    │   Content   │   │
│  │   (React)    │◄──►│   Service   │◄──►│   Scripts   │   │
│  │              │    │   Worker    │    │             │   │
│  └──────────────┘    └──────────────┘    └──────────────┘   │
│         │                   │                    │           │
│         │                   │                    │           │
│         └───────────────────┴────────────────────┘           │
│                            │                                 │
│                            ▼                                 │
│              ┌──────────────────────────┐                    │
│              │   chrome.storage.local   │                    │
│              │   (State & Cache)        │                    │
│              └──────────────────────────┘                    │
└─────────────────────────────┬─────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Vercel Backend (Serverless)                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │ /api/extract-    │         │ /api/search-     │         │
│  │   product        │         │   youtube        │         │
│  │ (YouTube→Amazon) │         │ (Amazon→YouTube) │         │
│  └────────┬─────────┘         └────────┬─────────┘         │
│           │                            │                    │
│           ▼                            ▼                    │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │   Groq API       │         │  YouTube Data   │         │
│  │   (LLM)          │         │  API v3         │         │
│  └──────────────────┘         └──────────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

1. **Manifest V3 Compliance**: Uses service workers instead of background pages for better performance
2. **Least-Privilege Permissions**: Host permissions scoped to specific URL patterns (product pages only)
3. **Backend Proxy Architecture**: API keys stored server-side, never exposed to client
4. **State Persistence**: Results cached locally with URL-based invalidation
5. **Type Safety**: Full TypeScript with strict mode and shared type definitions
6. **Content Security Policy**: Strict CSP with no inline scripts, only external connections to trusted APIs

## 📁 Project Structure

```
ScoutFox/
├── background/              # Service worker scripts
│   ├── index.ts            # Service worker entry point
│   ├── youtube.ts          # YouTube API integration & caching
│   └── amazon.ts           # YouTube → Amazon search handler
│
├── content-scripts/         # DOM interaction scripts
│   ├── amazon.ts           # Amazon product extraction
│   └── youtube.ts          # YouTube context extraction
│
├── entrypoints/            # WXT entry points
│   ├── background.ts       # Background script entry
│   ├── content.ts          # Amazon content script entry
│   ├── youtube.ts          # YouTube content script entry
│   ├── popup.html          # Popup HTML structure
│   ├── popup.tsx           # Popup React entry point
│   ├── settings.html       # Settings page
│   └── privacy.html        # Privacy policy page
│
├── shared/                 # Shared utilities & types
│   ├── types.ts            # TypeScript type definitions
│   ├── config.ts           # Backend API configuration
│   ├── normalizeTitle.ts   # Amazon title normalization
│   ├── groqClient.ts       # Groq API client (fallback)
│   ├── llmExtractProduct.ts # LLM product extraction
│   ├── regexFallbackNormalize.ts # Regex fallback (deprecated)
│   └── utils.ts            # Utility functions
│
├── ui/                     # React UI components
│   ├── Popup.tsx           # Main popup component
│   ├── popup.css           # Popup styles (Tailwind + custom)
│   └── settings.ts         # Settings page logic
│
├── tests/                  # Unit tests
│   └── normalizeTitle.test.ts
│
├── scripts/                # Build & utility scripts
│   └── setApiKey.ts        # API key setup helper
│
├── wxt.config.ts           # WXT framework configuration
├── tsconfig.json           # TypeScript configuration
└── package.json            # Dependencies & scripts
```

## 🚀 Features

### Amazon → YouTube Flow

1. **Product Detection**: Automatically extracts product title, subtitle, and ASIN from Amazon product pages
2. **Query Optimization**: 
   - Optional AI-powered query optimization via Groq API
   - Removes marketing language, preserves model numbers
   - Generates multiple search query variants
3. **YouTube Search**: Queries YouTube Data API v3 for review videos
4. **Results Display**: Shows video thumbnails, titles, channels, view counts, and like counts
5. **Caching**: 24-hour TTL cache to minimize API calls

### YouTube → Amazon Flow

1. **Context Extraction**: Extracts video title, description, channel name, and page metadata
2. **AI Product Extraction**: Uses Groq LLM to identify products mentioned in videos
3. **Multiple Product Detection**: Detects up to 5 products per video (for comparison videos)
4. **Product Selection**: User selects from detected products
5. **Amazon Search**: Opens Amazon search results in new tab

### Additional Features

- **State Persistence**: Remembers last search results per page URL
- **Keyboard Shortcut**: Ctrl+M (Cmd+M on Mac) to open popup
- **Settings Page**: Configure API keys, toggle AI optimization
- **Privacy Policy**: Full privacy policy page with GDPR compliance
- **Error Handling**: Graceful degradation with user-friendly error messages
- **Multi-domain Support**: Works on all Amazon domains (.com, .ca, .co.uk, etc.)

## 🛠️ Development

### Prerequisites

- Node.js 18+
- npm or yarn
- Chrome browser (for testing)

### Setup

```bash
# Install dependencies
npm install

# Build for development
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

### Development Workflow

1. **Start dev server**: `npm run dev`
2. **Load extension**: 
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select `.output/chrome-mv3`
3. **Hot reload**: WXT automatically reloads on file changes

### Testing

```bash
# Run unit tests
npm test

# Watch mode
npm run test:watch
```

Tests cover:
- Title normalization logic
- Query generation
- Edge cases (empty titles, special characters, etc.)

## 🔐 Security & Privacy

### API Key Management

**Production Architecture:**
- API keys stored server-side in Vercel environment variables
- Extension makes requests to backend proxy
- Backend handles all third-party API calls
- No API keys exposed to client

**Optional User Keys:**
- Users can optionally provide their own API keys
- Stored in `chrome.storage.local` (encrypted by Chrome)
- Used as fallback if backend is unavailable
- Validated before saving

### Permissions

- **`storage`**: Cache results and store user preferences
- **`activeTab`**: Access current tab for product extraction
- **`scripting`**: Inject content scripts on Amazon/YouTube pages
- **`tabs`**: Open new tabs for YouTube videos and Amazon searches

**Host Permissions** (scoped for least-privilege):
- Amazon product pages only: `*://*.amazon.*/dp/*`, `*://*.amazon.*/gp/product/*`
- YouTube watch pages only: `*://*.youtube.com/watch*`
- Backend API: `https://yt-amazon-backend-proxy.vercel.app/*`

### Content Security Policy

- No inline scripts
- No `eval()` or `new Function()`
- Only trusted external connections (backend, Groq API, YouTube API)
- Strict CSP for extension pages

### Privacy

- No user tracking or analytics
- No personal data collection
- Product information only processed when user initiates action
- Full privacy policy available in extension

## 📊 Performance

### Caching Strategy

- **Local Cache**: `chrome.storage.local` with 24-hour TTL
- **URL-based Invalidation**: Cache keyed by product title + URL
- **State Persistence**: Last search results saved per page URL
- **Duplicate Prevention**: Skips API calls if same page detected

### API Quota Management

- **YouTube API**: ~106 units per search (100 for search + 6 for stats)
- **Caching**: Reduces repeated searches to 0 API calls
- **Backend Fallback**: User's personal keys used if backend quota exceeded
- **Error Handling**: Graceful degradation with clear error messages

## 🧪 Code Quality

### TypeScript

- Strict mode enabled
- Shared type definitions in `shared/types.ts`
- Type-safe message passing between components
- No `any` types (except for third-party API responses)

### Code Organization

- **Separation of Concerns**: Background scripts, content scripts, and UI are separate
- **Shared Utilities**: Common logic extracted to `shared/` directory
- **Type Safety**: Interfaces defined for all data structures
- **Error Handling**: Try-catch blocks with meaningful error messages

### Testing

- Unit tests for core normalization logic
- Test coverage for edge cases
- Vitest for fast test execution

## 🔄 Data Flow

### Amazon → YouTube Search

```
User clicks extension
    ↓
Popup opens → Detects Amazon page
    ↓
Content script extracts product info
    ↓
Background script normalizes title
    ↓
Backend API optimizes query (optional)
    ↓
Backend searches YouTube API
    ↓
Results cached & displayed
```

### YouTube → Amazon Search

```
User opens popup on YouTube page
    ↓
Content script extracts video context
    ↓
Backend API calls Groq LLM
    ↓
LLM extracts product names
    ↓
Multiple products displayed
    ↓
User selects product
    ↓
Amazon search opened in new tab
```

## 🚢 Deployment

### Chrome Web Store Submission

1. **Build production bundle**: `npm run build`
2. **Create ZIP**: Contents of `.output/chrome-mv3/` directory
3. **Submit**: Upload ZIP to Chrome Web Store Developer Dashboard

**ZIP file location**: `ScoutFox-extension.zip` (184 KB)

### Backend Deployment

Backend is deployed separately on Vercel:
- Repository: Separate repo for backend proxy
- Environment Variables: `GROQ_API_KEY`, `YOUTUBE_API_KEY`
- Endpoints: `/api/extract-product`, `/api/search-youtube`

## 📝 Key Implementation Details

### Title Normalization

The `normalizeAmazonTitleToSearch` function implements sophisticated text processing:

1. **HTML Entity Decoding**: Converts `&amp;` → `&`, etc.
2. **Separator Normalization**: Standardizes `—`, `|`, `:`, etc.
3. **Marketing Word Removal**: Filters out "New", "Latest", "2024", etc.
4. **Model Number Preservation**: Keeps essential identifiers (generations, sizes, storage)
5. **Subtitle Intelligence**: Only merges subtitle if it adds value (model numbers, specs)
6. **Query Variants**: Generates multiple search queries for better results

### State Management

- **React State**: Local component state for UI
- **Chrome Storage**: Persistent state across sessions
- **URL-based Keys**: Cache keys include page URL to prevent cross-page contamination
- **Automatic Restoration**: State restored when popup reopens on same page

### Error Handling

- **Network Errors**: Retry logic with exponential backoff
- **API Errors**: User-friendly error messages
- **Timeout Handling**: 15-25 second timeouts with fallback
- **Service Worker Inactivity**: Direct fetch from popup as fallback

## 🎨 UI/UX

- **Modern Design**: Clean, minimal interface with orange theme
- **Responsive**: Works well in extension popup constraints
- **Loading States**: Clear feedback during API calls
- **Error Messages**: Helpful, actionable error messages
- **Keyboard Shortcuts**: Ctrl+M to open popup
- **Accessibility**: Semantic HTML, proper ARIA labels

## 📚 Technologies & Patterns

- **WXT Framework**: Modern Chrome extension development
- **React Hooks**: `useState`, `useEffect` for state management
- **TypeScript**: Type safety throughout
- **Tailwind CSS**: Utility-first styling
- **Vite**: Fast build tool with HMR
- **Vitest**: Fast unit testing
- **Serverless Functions**: Vercel for backend API

## 🔮 Future Enhancements

- [ ] Support for more Amazon locales
- [ ] Video filtering (duration, date, channel)
- [ ] Bookmark/save favorite reviews
- [ ] Analytics dashboard
- [ ] Offline mode with service worker caching
- [ ] Browser extension for Firefox/Edge

## 📄 License

MIT

## 👤 Author

Built as a portfolio project demonstrating:
- Chrome Extension development (MV3)
- TypeScript expertise
- React UI development
- Serverless architecture
- API integration
- Security best practices
- Production-ready code quality

---

**Note**: This extension requires a backend API proxy for production use. The backend repository is separate and handles API key management and LLM processing.
