# ScoutFox Privacy Policy

**Effective Date:** [Date]

This Privacy Policy describes ScoutFox's information practices for its Chrome browser extension. We take your privacy seriously and want you to understand exactly what information we collect, how we process that information, and how to contact us about this policy. Please read this policy carefully.

## Who is Responsible for Data Collection and Processing?

**Controller**

The legal person responsible for the collection, processing and/or use of personal information in connection with ScoutFox ("Controller") is:

Abeer Das
abeerdas647@gmail.com

## What is Personal Information?

Personal information means any information relating to an identified or identifiable natural person. This includes details such as name and email address, but also information that could be used to identify you indirectly, such as browsing patterns or device identifiers.

## Information ScoutFox Collects

### Data Processed Locally (Never Sent to Servers)

The following data is processed entirely within your browser and never transmitted:

- **Cached Search Results**: YouTube video search results are stored locally in your browser for 24 hours to improve performance and reduce API calls
- **User Preferences**: Your API key preferences and search settings (stored in Chrome's local storage)
- **Extension State**: Temporary state information to restore your previous search results when reopening the extension

### Data Extracted from Web Pages

When you use ScoutFox, the extension extracts publicly visible information from web pages you visit:

**From Amazon Product Pages:**
- Product title (e.g., "Echo Dot (5th Gen)")
- Product subtitle/description
- ASIN (Amazon Standard Identification Number)
- Current page URL (to identify product pages)

**From YouTube Video Pages:**
- Video title
- Video description
- Channel name
- Public metadata (Open Graph tags, keywords)

**Important**: This extraction only occurs when you explicitly interact with the extension (clicking the extension icon or the "Search for Products" button). The extension does not automatically collect data in the background.

### Data Transmitted to Our Backend Service

When you use ScoutFox's core functionality, the following data is sent to our backend service hosted on Vercel (`yt-amazon-backend-proxy.vercel.app`):

**For Amazon → YouTube Search:**
- Product title and subtitle (to search YouTube for review videos)
- Optimization preference (whether to use AI for query optimization)

**For YouTube → Amazon Search:**
- Video title
- Video description
- Channel name
- Page metadata (to extract product name using AI)

**Purpose**: This data is used solely to:
1. Search YouTube for product review videos (Amazon → YouTube)
2. Extract product names from YouTube videos using AI/LLM processing (YouTube → Amazon)
3. Generate optimized search queries

**Data Processing**: Our backend uses an AI language model (LLM) to analyze YouTube video content and infer the most likely physical product being discussed. The AI output is used only to generate an Amazon search query. The AI does not make decisions about you, does not profile you, and does not store your data.

### Data Transmitted to Third-Party APIs (Optional)

If you choose to provide your own API keys in the extension settings:

**Groq API** (`api.groq.com`):
- Product titles (for AI-powered search query optimization)
- Only used if you enable AI optimization and provide your own Groq API key

**YouTube Data API** (`www.googleapis.com`):
- Search queries (to find YouTube videos)
- Only used if you provide your own YouTube API key

**Important**: If you use our backend service (default), all API calls are proxied through our servers using our API keys. Your data is never sent directly to third-party APIs unless you explicitly provide your own API keys.

### Information We Do NOT Collect

ScoutFox does **not** collect, store, or transmit:

- Personal identifiers (name, email, address, phone number)
- Browsing history (beyond the current page you're viewing)
- Account credentials or passwords
- Payment information
- Location data
- Device identifiers (beyond what Chrome automatically provides)
- Analytics or telemetry data
- User tracking data
- Advertising identifiers
- Any data from pages other than Amazon product pages and YouTube video pages

## How ScoutFox Processes and Uses Collected Information

### Core Functionality

**Amazon → YouTube Search:**
1. You visit an Amazon product page and click the ScoutFox extension icon
. We extract the product title and subtitle from the page
3. We send this information to our backend service (or use your API key if provided)
4. Our backend searches YouTube for review videos matching the product
5. Results are displayed in the extension popup
6. Results are cached locally for 24 hours

**YouTube → Amazon Search:**
1. You visit a YouTube video page and click the "Search for Products" button
2. We extract video title, description, and metadata from the page
3. We send this information to our backend service
4. Our backend uses an AI language model to analyze the content and infer the product name
5. An Amazon search URL is generated and opened in a new tab
6. No data is stored server-side after the search is completed

### AI/LLM Processing Disclosure

ScoutFox uses an AI language model (LLM) hosted on our backend servers to:

- **Analyze YouTube video content** (title, description, metadata) to identify the product being discussed
- **Generate optimized search queries** for YouTube searches (if AI optimization is enabled)

**What the AI Does:**
- Reads publicly visible video information
- Identifies product names, brands, and model numbers
- Generates search queries

**What the AI Does NOT Do:**
- Make decisions about you
- Create profiles of you
- Store your data
- Share your data with third parties
- Use your data for training or improvement of AI models

**AI Output**: The AI's output (product name or search query) is used immediately to generate a search URL and is not intentionally stored or retained beyond what is technically necessary to complete the request.

### Data Retention

- **Backend Processing**: Data sent to our backend is processed in real-time and not intentionally stored or retained beyond what is technically necessary to complete the request
- **Local Storage**: Cached search results are stored locally in your browser for 24 hours, then automatically cleared
- **API Keys**: If you provide your own API keys, they are stored locally in your browser until you delete them
- **No Server-Side Storage**: We do not maintain databases or logs of your searches, product information, or video content

## Data Sharing and Third Parties

### Our Backend Service (Vercel)

ScoutFox uses Vercel (Vercel Inc.) to host our backend API service. When data is sent to our backend:

- **Purpose**: Processing searches and AI/LLM analysis
- **Data Shared**: Product titles, video titles, descriptions, and metadata (as described above)
- **Vercel's Role**: Infrastructure provider only - they do not access, use, or store your data
- **Vercel Privacy Policy**: [https://vercel.com/legal/privacy-policy](https://vercel.com/legal/privacy-policy)

### AI/LLM Service (Groq)

If you provide your own Groq API key, your product titles are sent directly to Groq's API for AI optimization. If you use our backend service, we use our own Groq API key and your data is proxied through our servers.

- **Groq Privacy Policy**: [https://groq.com/legal/privacy](https://groq.com/legal/privacy)

### YouTube Data API (Google)

If you provide your own YouTube API key, your search queries are sent directly to Google's YouTube Data API. If you use our backend service, we use our own YouTube API key and your data is proxied through our servers.

- **Google Privacy Policy**: [https://policies.google.com/privacy](https://policies.google.com/privacy)

### No Data Sales or Advertising

ScoutFox **never** sells, rents, or shares your personal information or browsing data with:
- Advertisers
- Data brokers
- Marketing companies
- Analytics services (beyond what's necessary for core functionality)
- Any third party for commercial purposes

### Legal Requirements

ScoutFox may disclose information if required by law, court order, or government regulation. We will notify you of such requests when legally permitted to do so.

## Data Security

### Local Storage Security

- All data stored locally in your browser is protected by Chrome's extension storage mechanisms and access controls
- API keys are stored in Chrome's secure local storage
- You can clear all data at any time via Chrome settings

### Transmission Security

- All data transmitted to our backend uses HTTPS encryption
- All API calls use secure, encrypted connections
- API keys are never exposed in network requests (all proxied through backend)

### Server-Side Security

- Our backend servers use industry-standard security measures
- API keys are stored securely on our servers and never exposed to clients
- Data is processed in real-time and not intentionally stored or retained beyond what is technically necessary to complete the request
- Access to backend infrastructure is restricted and monitored

**Important**: While we take reasonable steps to secure your data, no system is 100% secure. You use ScoutFox at your own risk.

## User Control and Consent

### How You Control Data Collection

ScoutFox only processes data when you explicitly take action:

1. **Amazon → YouTube**: Click the extension icon and click "Search Reviews"
2. **YouTube → Amazon**: Click the "Search for Products" button on a YouTube video page

The extension does **not** automatically collect or process data in the background. All data processing is initiated by your explicit actions.

By initiating these actions, you provide consent for the described data processing to occur.

### Your Choices

You have full control over:

- **Using Your Own API Keys**: Provide your own API keys in settings to avoid using our backend service
- **Disabling AI Optimization**: Turn off AI optimization in settings
- **Clearing Data**: Clear all cached data and API keys at any time
- **Uninstalling**: Uninstall the extension at any time to remove all data

### How to Clear Your Data

1. **Via Chrome Settings**:
   - Go to `chrome://extensions/`
   - Find ScoutFox
   - Click "Remove" to uninstall (this clears all data)

2. **Via Extension Storage** (Advanced):
   - Open Chrome DevTools
   - Go to Application → Storage → Extension → ScoutFox
   - Clear all stored data

## Children's Privacy

ScoutFox is not intended for children. We do not knowingly collect personal data from individuals under the age required for consent under applicable law (13 in the United States, and up to 16 in certain EU countries). If you believe we have inadvertently collected information from a child, please contact us immediately at abeerdas647@gmail.com and we will delete it promptly.

## Your Rights (GDPR and CCPA Compliance)

If you are located in the European Economic Area (EEA) or California, you have the following rights:

### Right to Access

You have the right to request information about what data we have collected about you. Since ScoutFox stores data locally in your browser, you can access it directly via Chrome DevTools.

### Right to Rectification

You can correct or update your API keys and preferences at any time in the extension settings.

### Right to Erasure

You can delete all data by uninstalling the extension or clearing Chrome's extension storage.

### Right to Data Portability

You can export your cached search results and preferences via Chrome DevTools if needed.

### Right to Object

You can stop using ScoutFox at any time by uninstalling the extension. Since we don't track you or store your data, uninstalling removes all traces.

### Right to Withdraw Consent

You can withdraw consent by uninstalling the extension or disabling it in Chrome settings.

### How to Exercise Your Rights

To exercise any of these rights, please contact us at abeerdas647@gmail.com. Since most data is stored locally in your browser, you can also exercise many of these rights directly by clearing your browser data or uninstalling the extension.

## Policy Updates

ScoutFox reserves the right to update this Privacy Policy from time to time. When we make changes:

- We will update the "Effective Date" at the top of this page
- For substantial changes, we will notify users through the extension or via email (if you have provided your email)
- Your continued use of ScoutFox after changes constitutes acceptance of the updated policy

## Contact

If you have questions, concerns, or requests regarding this Privacy Policy or ScoutFox's data practices, please contact us at:

**Email**: abeerdas647@gmail.com

We will respond to your inquiry within a reasonable timeframe.

## Compliance

This Privacy Policy is designed to comply with:

- Chrome Web Store Developer Program Policies
- General Data Protection Regulation (GDPR)
- California Consumer Privacy Act (CCPA)
- Children's Online Privacy Protection Act (COPPA)

---

**Note**: By using ScoutFox, you acknowledge that you have read and understood this Privacy Policy. If you do not agree, please do not use the extension.

## Legal Basis for Processing (GDPR)

We process data based on:

- **User consent** (Article 6(1)(a)) when you initiate searches
- **Legitimate interest** (Article 6(1)(f)) in providing the extension's core functionality
