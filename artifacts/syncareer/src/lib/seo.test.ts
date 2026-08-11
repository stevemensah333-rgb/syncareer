import { afterEach, describe, expect, it } from 'vitest';
import { generateStructuredData, setMetaTags } from './seo';

afterEach(() => {
  document.head.innerHTML = '';
});

describe('SEO utilities', () => {
  it('updates one stable JSON-LD script per schema type', () => {
    const first = generateStructuredData('FAQPage', { headline: 'First' });
    const second = generateStructuredData('FAQPage', { headline: 'Latest' });

    expect(first).toBe(second);
    expect(document.querySelectorAll('script[type="application/ld+json"]')).toHaveLength(1);
    expect(JSON.parse(second.textContent ?? '{}')).toEqual({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      headline: 'Latest',
    });
  });

  it('keeps separate schema types and updates canonical metadata', () => {
    generateStructuredData('Organization', { name: 'Syncareer' });
    generateStructuredData('SoftwareApplication', { name: 'Syncareer' });
    setMetaTags({
      title: 'Syncareer test title',
      description: 'Test description',
      canonical: 'https://syncareer.me',
    });

    expect(document.querySelectorAll('script[type="application/ld+json"]')).toHaveLength(2);
    expect(document.title).toBe('Syncareer test title');
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(
      'Test description',
    );
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      'https://syncareer.me',
    );
  });
});
