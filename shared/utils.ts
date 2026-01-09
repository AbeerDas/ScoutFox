/**
 * Formats a number count into a human-readable string (e.g., 1.2K, 3.4M)
 */
export function formatCount(n: string | number): string {
  const num = typeof n === 'string' ? parseInt(n, 10) : n;
  
  if (isNaN(num)) {
    return '—';
  }

  if (num < 1000) {
    return num.toString();
  }

  if (num < 1000000) {
    const k = num / 1000;
    return k % 1 === 0 ? `${k}K` : `${k.toFixed(1)}K`;
  }

  if (num < 1000000000) {
    const m = num / 1000000;
    return m % 1 === 0 ? `${m}M` : `${m.toFixed(1)}M`;
  }

  const b = num / 1000000000;
  return b % 1 === 0 ? `${b}B` : `${b.toFixed(1)}B`;
}

/**
 * Sanitizes text by trimming and normalizing whitespace
 */
export function sanitizeText(text: string | null | undefined): string | null {
  if (!text) return null;
  return text.trim().replace(/\s+/g, ' ') || null;
}
