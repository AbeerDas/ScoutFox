/**
 * Deterministic regex-based fallback for extracting product names from YouTube text
 * This is a guaranteed fallback when LLM extraction fails or has low confidence
 */

/**
 * Normalizes YouTube video title and description into an Amazon-searchable product name
 * 
 * Rules:
 * - Remove: "review", "unboxing", "vs", "after X months", emojis, ALL CAPS emphasis
 * - Preserve: Brand, model numbers, generations, size/storage
 * - Output must be Amazon-search ready, max ~120 chars
 */
export function normalizeYouTubeTextFallback(
  title: string,
  description?: string
): string {
  // Combine title and description
  let text = title;
  if (description) {
    text += ' ' + description;
  }

  // Remove emojis (basic regex)
  text = text.replace(/[\u{1F600}-\u{1F64F}]/gu, ''); // Emoticons
  text = text.replace(/[\u{1F300}-\u{1F5FF}]/gu, ''); // Misc symbols
  text = text.replace(/[\u{1F680}-\u{1F6FF}]/gu, ''); // Transport
  text = text.replace(/[\u{2600}-\u{26FF}]/gu, ''); // Misc symbols
  text = text.replace(/[\u{2700}-\u{27BF}]/gu, ''); // Dingbats
  text = text.replace(/[^\w\s\-.,()]/g, ''); // Remove remaining special chars except basic punctuation

  // Remove common YouTube video prefixes/suffixes
  const patternsToRemove = [
    /\b(review|unboxing|unbox|opening|first look|hands on|hands-on)\b/gi,
    /\b(vs|versus|comparison|compared to|vs\.)\b/gi,
    /\bafter \d+\s*(months?|weeks?|days?|years?)\b/gi,
    /\b\d+\s*(months?|weeks?|days?|years?)\s*(later|after|update)\b/gi,
    /\b(worth it|should you buy|don't buy|buy this|honest review)\b/gi,
    /\b(2024|2023|2022|2021|2020)\s*(review|update)\b/gi,
    /\b(you need to know|everything you need|before you buy)\b/gi,
    /\b(real talk|honest|brutally honest|spoiler)\b/gi,
    /\b(part \d+|episode \d+)\b/gi,
    /\b(ft\.|featuring|with)\b/gi,
  ];

  for (const pattern of patternsToRemove) {
    text = text.replace(pattern, ' ');
  }

  // Remove excessive whitespace
  text = text.replace(/\s+/g, ' ').trim();

  // Remove ALL CAPS words that are likely emphasis (but keep acronyms like "USB", "HDMI")
  text = text.replace(/\b([A-Z]{3,})\b/g, (match) => {
    // Keep common acronyms
    const keepAcronyms = ['USB', 'HDMI', 'USB-C', 'USB-A', 'SD', 'SSD', 'HDD', 'RAM', 'CPU', 'GPU', 'OLED', 'LCD', 'LED', 'IPS', 'HDR', '4K', '8K', '1080p', '720p', 'WiFi', 'Wi-Fi', 'BT', 'NFC', 'GPS'];
    if (keepAcronyms.includes(match)) {
      return match;
    }
    // Convert ALL CAPS to Title Case if it's a word
    if (match.length > 2) {
      return match.charAt(0) + match.slice(1).toLowerCase();
    }
    return match;
  });

  // Extract potential product indicators
  // Look for patterns like "Brand Model Number" or "Brand Model Generation"
  const brandPatterns = [
    /\b(Apple|Samsung|Sony|Google|Microsoft|LG|Dell|HP|Lenovo|Asus|Acer|Razer|Logitech|Bose|JBL|Sennheiser|Anker|Belkin|Corsair|HyperX)\b/gi,
  ];

  // Try to find brand + model pattern
  let productName = text;
  
  // If we found a brand, try to extract the following words (likely model)
  for (const brandPattern of brandPatterns) {
    const brandMatch = text.match(brandPattern);
    if (brandMatch) {
      const brandIndex = text.indexOf(brandMatch[0]);
      // Extract next 2-5 words after brand
      const afterBrand = text.substring(brandIndex + brandMatch[0].length).trim();
      const words = afterBrand.split(/\s+/).slice(0, 5);
      productName = brandMatch[0] + ' ' + words.join(' ');
      break;
    }
  }

  // Clean up
  productName = productName
    .replace(/\s+/g, ' ')
    .trim();

  // Remove trailing punctuation and common suffixes
  productName = productName.replace(/[.,;:!?]+$/, '');

  // Limit length
  if (productName.length > 120) {
    productName = productName.substring(0, 117) + '...';
  }

  // If we have nothing useful, return a cleaned version of the original title
  if (productName.length < 3) {
    productName = title
      .replace(/[^\w\s\-.,()]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 120);
  }

  return productName || 'product';
}
