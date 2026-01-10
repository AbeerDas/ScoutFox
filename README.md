# ScoutFox - Amazon to YouTube Review Search

A Chrome extension (MV3) built with WXT that extracts product information from Amazon pages and searches YouTube for relevant review videos.

## Features

- **Smart Product Extraction**: Automatically extracts product title, subtitle, and ASIN from Amazon pages
- **Intelligent Query Normalization**: Transforms Amazon product titles into optimized YouTube search queries
- **YouTube Integration**: Searches YouTube Data API v3 for review videos
- **Caching**: Local caching with configurable TTL (default 24 hours) to minimize API calls
- **Clean UI**: Modern React-based popup interface with Tailwind CSS
- **Type-Safe**: Full TypeScript implementation with strict mode
- **Tested**: Unit tests for title normalization logic

## Project Structure

```
ScoutFox/
├── background/          # Service worker (YouTube API integration)
│   ├── index.ts
│   └── youtube.ts
├── content-scripts/     # Content scripts for Amazon page extraction
│   └── amazon.ts
├── entrypoints/         # WXT entry points
│   ├── background.ts
│   ├── content.ts
│   ├── popup.html
│   └── popup.tsx
├── shared/              # Shared utilities and types
│   ├── normalizeTitle.ts
│   ├── types.ts
│   └── utils.ts
├── tests/               # Unit tests
│   └── normalizeTitle.test.ts
├── ui/                  # React UI components
│   ├── Popup.tsx
│   └── popup.css
└── scripts/             # Helper scripts
    └── setApiKey.ts
```

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- A YouTube Data API v3 key ([Get one here](https://console.cloud.google.com/apis/credentials))

### Installation

1. **Clone or navigate to the project directory:**
   ```bash
   cd ScoutFox
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up your YouTube API key:**

   **Option A: Using the helper script (for local development):**
   ```bash
   npm run set-api-key
   # Enter your API key when prompted
   ```

   **Option B: Manual setup:**
   - Open the extension popup after building
   - Enter your API key in the input field
   - Click "Save API Key"

   **Option C: Environment variable (for build-time injection):**
   ```bash
   export YOUTUBE_API_KEY=your_api_key_here
   npm run build
   ```

### Development

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Load the extension in Chrome:**
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `.output/chrome-mv3` directory

3. **Test the extension:**
   - Navigate to any Amazon product page (e.g., `https://www.amazon.com/dp/B08C1W5N87`)
   - Click the ScoutFox extension icon
   - Click "Search Reviews"
   - View YouTube review results

### Building for Production

```bash
npm run build
```

The built extension will be in `.output/chrome-mv3/`.

### Running Tests

```bash
npm test
```

Watch mode:
```bash
npm run test:watch
```

## Security & API Key Management

### Important Security Notes

**For Local Development / POC:**
- The extension stores the API key in `chrome.storage.local` (encrypted by Chrome)
- This is acceptable for personal use or testing
- The API key is visible in the extension's storage and could be extracted

**For Production / Public Distribution:**

**DO NOT** embed the API key in client-side code. Instead, use one of these approaches:

1. **Backend Proxy (Recommended):**
   - Create a small backend service (e.g., Cloud Run, Netlify Functions, AWS Lambda)
   - Store the API key securely on the backend
   - Have the extension call your backend, which then calls YouTube API
   - This keeps the API key server-side and allows you to implement rate limiting, logging, etc.

2. **Google Cloud API Key Restrictions:**
   - If you must use client-side keys, restrict them in Google Cloud Console:
     - Go to [API Credentials](https://console.cloud.google.com/apis/credentials)
     - Edit your API key
     - Under "Application restrictions", select "HTTP referrers"
     - Add your extension's Chrome Web Store URL or specific domains
     - Under "API restrictions", limit to "YouTube Data API v3"
   - This prevents unauthorized use but doesn't hide the key

3. **Quota Management:**
   - Monitor your YouTube API quota usage in Google Cloud Console
   - Set up alerts for quota exhaustion
   - The extension implements caching to minimize API calls
   - Consider implementing per-user rate limiting in production

### API Quota Considerations

YouTube Data API v3 has the following quotas (default free tier):
- **Queries per day**: 10,000 units
- **search.list**: 100 units per request
- **videos.list**: 1 unit per request

**Our extension usage:**
- Each search = 1 `search.list` (100 units) + N `videos.list` (N units, where N = number of results, max 6)
- Worst case: ~106 units per search
- With 24-hour caching: ~106 units per unique product per day
- **Estimated capacity**: ~94 unique product searches per day (free tier)

**Caching strategy:**
- Results are cached for 24 hours (configurable)
- Identical queries within TTL return cached results (0 API calls)
- This dramatically reduces quota usage for repeated searches

## Architecture

### Content Script → Background Script Communication

1. **Content Script** (`content-scripts/amazon.ts`):
   - Runs on Amazon product pages
   - Extracts product title, subtitle, ASIN from DOM
   - Sends extracted data to background script via `chrome.runtime.sendMessage`

2. **Background Script** (`background/youtube.ts`):
   - Receives product info from content script
   - Normalizes title using `normalizeAmazonTitleToSearch`
   - Generates search query variants
   - Queries YouTube Data API v3
   - Caches results in `chrome.storage.local`
   - Returns results to popup

3. **Popup UI** (`ui/Popup.tsx`):
   - React component that orchestrates the search flow
   - Displays loading states, errors, and results
   - Handles API key input and storage

### Title Normalization Logic

The `normalizeAmazonTitleToSearch` function implements:

1. **Text Cleaning:**
   - Decodes HTML entities
   - Normalizes separators (—, |, :, etc.)
   - Removes brand/vendor prefixes/suffixes

2. **Marketing Word Removal:**
   - Removes words like "New", "Latest", "2024", "With", "Includes"
   - Preserves model numbers, sizes, capacities, generations

3. **Parenthetical Handling:**
   - Removes marketing parentheticals: "(Updated)", "(New)"
   - Preserves essential identifiers: "(64GB)", "(5th Gen)", "(85 inch)"

4. **Subtitle Merging:**
   - Only appends subtitle if it adds high-value tokens (model numbers, specs, tech terms)

5. **Query Generation:**
   - Creates multiple query variants: "product review", "product unboxing", "brand model review"
   - Tries queries in order until results are found

## Testing

### Unit Tests

Run the test suite:
```bash
npm test
```

Tests cover:
- Title normalization with various Amazon title formats
- Subtitle merging logic
- Query generation
- Edge cases (empty titles, long titles, etc.)

### Manual Testing

1. **Test on various Amazon product pages:**
   - Electronics: `https://www.amazon.com/dp/B08C1W5N87` (Echo Dot)
   - Headphones: `https://www.amazon.com/dp/B0BDHB9Y8H` (AirPods Pro)
   - TVs: `https://www.amazon.com/dp/B0B7BP6CJN` (Samsung TV)

2. **Verify caching:**
   - Search for a product
   - Search again immediately (should use cache)
   - Check browser DevTools → Network tab (should see no YouTube API calls on second search)

3. **Test error handling:**
   - Use invalid API key (should show error message)
   - Test on non-Amazon pages (should show appropriate error)

## Troubleshooting

### Extension not loading
- Ensure you're loading from `.output/chrome-mv3` directory
- Check browser console for errors
- Verify all dependencies are installed: `npm install`

### No results found
- Verify API key is set correctly
- Check YouTube API quota in Google Cloud Console
- Try refreshing the search (bypasses cache)
- Verify you're on an Amazon product page

### API errors (403/429)
- **403 Forbidden**: API key may be invalid or restricted
- **429 Too Many Requests**: Quota exceeded, wait or upgrade quota
- Check error message in popup for details

## Future Enhancements

- [ ] Add LLM-based query paraphrasing for improved results (OpenAI/local)
- [ ] Support for multiple Amazon locales (.co.uk, .de, etc.)
- [ ] Filter results by video duration, upload date
- [ ] Bookmark/save favorite reviews
- [ ] Analytics dashboard for API usage
- [ ] Backend proxy implementation example

## License

MIT

## Contributing

Contributions welcome! Please open an issue or submit a pull request.
