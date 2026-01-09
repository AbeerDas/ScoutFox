/**
 * Normalizes Amazon product title and subtitle into a concise search query
 * suitable for YouTube review discovery.
 * 
 * Rules:
 * 1. Merge title and subtitle intelligently (subtitle appended only if it adds high-value tokens)
 * 2. Remove vendor prefixes/suffixes: "by <brand>", common separators
 * 3. Strip marketing words but preserve model numbers and essential attributes
 * 4. Strip parenthetical notes like (Updated), but preserve essential identifiers like (64GB)
 * 5. Collapse whitespace and limit to ~120 characters
 * 6. Generate multiple query variants with search intent tokens
 */

/**
 * Common marketing words to remove
 */
const MARKETING_WORDS = new Set([
  'new', 'latest', '2024', '2025', '2023', '2022', '2021',
  'with', 'includes', 'pack of', 'set of', 'bundle',
  'premium', 'professional', 'pro', 'plus', 'max', 'ultra',
  'updated', 'upgraded', 'enhanced', 'improved',
]);

/**
 * Common separators to normalize
 */
const SEPARATORS = /[-|—:•]/g;

/**
 * Parenthetical patterns to remove (but preserve size/capacity/model identifiers)
 */
const REMOVABLE_PARENTHETICAL = /\(updated\)|\(upgraded\)|\(enhanced\)|\(new\)|\(latest\)/gi;
const PRESERVE_PARENTHETICAL = /\((\d+\s*(gb|tb|mb|inch|inches|mm|cm|gen|generation|th|nd|rd|st))\)/gi;

/**
 * Brand/model prefixes to remove
 */
const BRAND_PREFIX = /^by\s+[^|—:•]+/i;
const VENDOR_SUFFIX = /\s+by\s+[^|—:•]+$/i;

/**
 * Normalizes a single string by removing marketing words, normalizing separators, etc.
 */
function normalizeText(text: string): string {
  // Decode HTML entities (basic)
  let normalized = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');

  // Normalize separators
  normalized = normalized.replace(SEPARATORS, ' ');

  // Remove brand/vendor prefixes and suffixes
  normalized = normalized.replace(BRAND_PREFIX, '').replace(VENDOR_SUFFIX, '');

  // Remove removable parentheticals (but preserve size/capacity ones)
  normalized = normalized.replace(REMOVABLE_PARENTHETICAL, '');
  
  // Preserve important parentheticals by temporarily marking them
  const preserved: string[] = [];
  normalized = normalized.replace(PRESERVE_PARENTHETICAL, (match) => {
    preserved.push(match);
    return ` __PRESERVE_${preserved.length - 1}__ `;
  });

  // Split into words and filter
  const words = normalized
    .split(/\s+/)
    .map(w => w.trim().toLowerCase())
    .filter(w => {
      if (!w || w.length < 2) return false;
      // Remove marketing words
      if (MARKETING_WORDS.has(w)) return false;
      // Remove standalone numbers that are likely years (2020-2029)
      if (/^20[0-9]{2}$/.test(w)) return false;
      return true;
    });

  // Restore preserved parentheticals
  words.forEach((word, idx) => {
    const match = word.match(/^__preserve_(\d+)__$/);
    if (match) {
      const preserveIdx = parseInt(match[1], 10);
      words[idx] = preserved[preserveIdx].toLowerCase();
    }
  });

  return words.join(' ').trim();
}

/**
 * Determines if subtitle adds high-value tokens (model numbers, specs, etc.)
 */
function subtitleAddsValue(subtitle: string): boolean {
  const normalized = normalizeText(subtitle);
  // Check if it contains model numbers, sizes, or technical terms
  const hasModelNumber = /\b([a-z]+\d+|\d+[a-z]+|[a-z]+\d+[a-z]+)\b/i.test(subtitle);
  const hasSize = /\b(\d+\s*(gb|tb|mb|inch|inches|mm|cm))\b/i.test(subtitle);
  const hasTechTerm = /\b(noise\s*cancelling|wireless|bluetooth|4k|8k|oled|led|hdr)\b/i.test(subtitle);
  
  return hasModelNumber || hasSize || hasTechTerm || normalized.length > 10;
}

/**
 * Extracts brand and model from normalized text for competitor inference
 */
function extractBrandModel(text: string): { brand?: string; model?: string } {
  const words = text.split(/\s+/);
  const brand = words[0] || undefined;
  
  // Try to find model number (alphanumeric pattern)
  const modelMatch = text.match(/\b([a-z]+\d+[a-z]*|\d+[a-z]+)\b/i);
  const model = modelMatch ? modelMatch[1] : undefined;
  
  return { brand, model };
}

/**
 * Main function: normalizes Amazon title and subtitle into a search query
 */
export function normalizeAmazonTitleToSearch(
  title: string,
  subtitle?: string | null
): string {
  if (!title || !title.trim()) {
    return '';
  }

  let normalized = normalizeText(title);

  // Append subtitle if it adds value
  if (subtitle && subtitle.trim() && subtitleAddsValue(subtitle)) {
    const normalizedSubtitle = normalizeText(subtitle);
    if (normalizedSubtitle) {
      normalized = `${normalized} ${normalizedSubtitle}`;
    }
  }

  // Collapse repeated whitespace
  normalized = normalized.replace(/\s+/g, ' ').trim();

  // Limit length to ~120 characters
  if (normalized.length > 120) {
    normalized = normalized.substring(0, 120).trim();
    // Try to cut at word boundary
    const lastSpace = normalized.lastIndexOf(' ');
    if (lastSpace > 80) {
      normalized = normalized.substring(0, lastSpace);
    }
  }

  return normalized;
}

/**
 * Generates multiple search query variants ordered by likely relevance
 */
export function generateSearchQueries(
  title: string,
  subtitle?: string | null
): string[] {
  const normalized = normalizeAmazonTitleToSearch(title, subtitle);
  if (!normalized) {
    return [];
  }

  const queries: string[] = [];
  const { brand, model } = extractBrandModel(normalized);

  // Primary query: normalized + "review"
  queries.push(`${normalized} review`);

  // Variant: normalized + "unboxing"
  queries.push(`${normalized} unboxing`);

  // Variant: brand + model + "review" (if we have both)
  if (brand && model) {
    queries.push(`${brand} ${model} review`);
  }

  // Variant: normalized + "hands on"
  queries.push(`${normalized} hands on`);

  // Optional: competitor variant (if "Pro", "Plus" detected)
  if (/\b(pro|plus|max|ultra)\b/i.test(normalized)) {
    // Try to create a "vs" query (simplified - just add "vs")
    const baseWithoutPro = normalized.replace(/\b(pro|plus|max|ultra)\b/gi, '').trim();
    if (baseWithoutPro && baseWithoutPro !== normalized) {
      queries.push(`${normalized} vs ${baseWithoutPro}`);
    }
  }

  // Limit to 5 queries max
  return queries.slice(0, 5);
}
