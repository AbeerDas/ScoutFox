# Quick Start Guide

## 1. Install Dependencies

```bash
npm install
```

## 2. Set Up YouTube API Key

**Option A: Using the helper script**
```bash
npm run set-api-key
```

**Option B: Manual setup (after building)**
- Build the extension: `npm run build`
- Load it in Chrome
- Enter API key in the popup

## 3. Start Development

```bash
npm run dev
```

## 4. Load Extension in Chrome

1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `.output/chrome-mv3` directory

## 5. Test the Extension

1. Navigate to an Amazon product page (e.g., https://www.amazon.com/dp/B08C1W5N87)
2. Click the ScoutFox extension icon
3. Click "Search Reviews"
4. View YouTube review results!

## 6. Run Tests

```bash
npm test
```

## Troubleshooting

- **Extension not loading**: Make sure you're loading from `.output/chrome-mv3`
- **No results**: Check that your API key is set correctly
- **API errors**: Verify your YouTube API quota in Google Cloud Console

For more details, see [README.md](./README.md).
