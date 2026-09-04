import { afterEach, describe, expect, it } from 'vitest';
import { generateStructuredData, removeStructuredData, setMetaTags, setRobotsMeta } from './seo';

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

  it('removes route-owned schema when its page unmounts', () => {
    generateStructuredData('FAQPage', { headline: 'FAQs' });
    generateStructuredData('Organization', { name: 'Syncareer' });

    removeStructuredData('FAQPage');

    expect(document.getElementById('seo-jsonld-faqpage')).toBeNull();
    expect(document.getElementById('seo-jsonld-organization')).not.toBeNull();
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

  it('lets authenticated pages opt out of indexing and restores the default on unmount', () => {
    setRobotsMeta('noindex, nofollow');
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
      'noindex, nofollow',
    );

    // Navigating away restores the shell default so public routes stay indexable.
    setRobotsMeta('index, follow');
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
      'index, follow',
    );
  });
});
