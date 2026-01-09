/**
 * Unit tests for normalizeAmazonTitleToSearch function
 */

import { describe, it, expect } from 'vitest';
import { normalizeAmazonTitleToSearch, generateSearchQueries } from '../shared/normalizeTitle';

describe('normalizeAmazonTitleToSearch', () => {
  it('should normalize Echo Dot title correctly', () => {
    const title = 'Echo Dot (5th Gen, 2022 release) – Smart speaker with Alexa — Charcoal';
    const result = normalizeAmazonTitleToSearch(title);
    
    // Should remove marketing words, preserve generation, remove separators
    expect(result).toContain('echo dot');
    expect(result).toContain('5th gen');
    expect(result).not.toContain('2022');
    expect(result).not.toContain('release');
    expect(result).not.toContain('smart speaker');
    expect(result).not.toContain('alexa');
    expect(result).not.toContain('charcoal');
  });

  it('should normalize AirPods Pro with subtitle correctly', () => {
    const title = 'Apple AirPods Pro (2nd Generation)';
    const subtitle = 'Active Noise Cancellation, MagSafe Case';
    const result = normalizeAmazonTitleToSearch(title, subtitle);
    
    // Should preserve generation, include relevant subtitle info
    expect(result).toContain('apple airpods pro');
    expect(result).toContain('2nd generation');
    // Subtitle adds value (noise cancellation is a tech term)
    expect(result.length).toBeGreaterThan(title.toLowerCase().length);
  });

  it('should normalize Philips Norelco Multigroom correctly', () => {
    const title = 'Philips Norelco Multigroom 7000 MG7750/49 (Premium, 24-in-1)';
    const result = normalizeAmazonTitleToSearch(title);
    
    // Should preserve model number, remove marketing words
    expect(result).toContain('philips norelco multigroom');
    expect(result).toContain('7000');
    expect(result).toContain('mg7750');
    expect(result).not.toContain('premium');
    expect(result).not.toContain('24-in-1');
  });

  it('should normalize Samsung TV title correctly', () => {
    const title = 'Samsung 85" Class QN90C Neo QLED 4K Smart TV (2024)';
    const result = normalizeAmazonTitleToSearch(title);
    
    // Should preserve size, model, tech specs, remove year
    expect(result).toContain('samsung');
    expect(result).toContain('qn90c');
    expect(result).toContain('85');
    expect(result).toContain('neo qled');
    expect(result).toContain('4k');
    expect(result).not.toContain('2024');
    expect(result).not.toContain('class');
    expect(result).not.toContain('smart tv');
  });

  it('should normalize Bose QuietComfort correctly', () => {
    const title = 'Bose QuietComfort 45 — Noise Cancelling Headphones — Triple Black';
    const result = normalizeAmazonTitleToSearch(title);
    
    // Should preserve model, remove color and separators
    expect(result).toContain('bose quietcomfort');
    expect(result).toContain('45');
    expect(result).not.toContain('noise cancelling');
    expect(result).not.toContain('headphones');
    expect(result).not.toContain('triple black');
  });

  it('should normalize Smart Watch title correctly', () => {
    const title = 'Smart Watch 2024 | Heart Rate, SpO2, Sleep Tracking (Unbranded) - 44mm';
    const result = normalizeAmazonTitleToSearch(title);
    
    // Should preserve size, remove year and marketing
    expect(result).toContain('smart watch');
    expect(result).toContain('44mm');
    expect(result).not.toContain('2024');
    expect(result).not.toContain('heart rate');
    expect(result).not.toContain('unbranded');
  });

  it('should normalize Nintendo Switch title correctly', () => {
    const title = 'Nintendo Switch – Neon Red/Neon Blue';
    const result = normalizeAmazonTitleToSearch(title);
    
    // Should preserve brand and product name, remove color variants
    expect(result).toContain('nintendo switch');
    expect(result).not.toContain('neon');
    expect(result).not.toContain('red');
    expect(result).not.toContain('blue');
  });

  it('should normalize Logitech G502 title correctly', () => {
    const title = 'Logitech G502 HERO High Performance Wired Gaming Mouse';
    const result = normalizeAmazonTitleToSearch(title);
    
    // Should preserve brand and model, remove marketing words
    expect(result).toContain('logitech');
    expect(result).toContain('g502');
    expect(result).toContain('hero');
    expect(result).not.toContain('high performance');
    expect(result).not.toContain('wired');
    expect(result).not.toContain('gaming');
    expect(result).not.toContain('mouse');
  });

  it('should handle null subtitle gracefully', () => {
    const title = 'Test Product Title';
    const result = normalizeAmazonTitleToSearch(title, null);
    
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
  });

  it('should limit query length to ~120 characters', () => {
    const longTitle = 'A'.repeat(200) + ' Product Title';
    const result = normalizeAmazonTitleToSearch(longTitle);
    
    expect(result.length).toBeLessThanOrEqual(120);
  });

  it('should preserve essential identifiers like size and capacity', () => {
    const title = 'iPhone 15 Pro Max (256GB) - Titanium';
    const result = normalizeAmazonTitleToSearch(title);
    
    // Should preserve capacity in parentheses
    expect(result).toContain('256gb');
    expect(result).toContain('iphone');
    expect(result).toContain('15');
    expect(result).toContain('pro');
    expect(result).toContain('max');
  });
});

describe('generateSearchQueries', () => {
  it('should generate multiple query variants', () => {
    const title = 'Echo Dot (5th Gen)';
    const queries = generateSearchQueries(title);
    
    expect(queries.length).toBeGreaterThan(0);
    expect(queries.length).toBeLessThanOrEqual(5);
    
    // Should include review variant
    const hasReview = queries.some(q => q.includes('review'));
    expect(hasReview).toBe(true);
  });

  it('should generate queries with unboxing variant', () => {
    const title = 'Apple AirPods Pro';
    const queries = generateSearchQueries(title);
    
    const hasUnboxing = queries.some(q => q.includes('unboxing'));
    expect(hasUnboxing).toBe(true);
  });

  it('should generate brand + model query when both are present', () => {
    const title = 'Logitech G502 HERO';
    const queries = generateSearchQueries(title);
    
    // Should have a query with brand and model
    const hasBrandModel = queries.some(q => 
      q.includes('logitech') && q.includes('g502')
    );
    expect(hasBrandModel).toBe(true);
  });

  it('should handle empty title gracefully', () => {
    const queries = generateSearchQueries('');
    expect(queries.length).toBe(0);
  });
});
