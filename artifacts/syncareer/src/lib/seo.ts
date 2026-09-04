/**
 * SEO and metadata utilities
 */

export interface PageMetadata {
  title?: string;
  description?: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogImageWidth?: number;
  ogImageHeight?: number;
  ogImageAlt?: string;
  ogUrl?: string;
  twitterCard?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  canonical?: string;
}

/**
 * Update document head with meta tags
 */
export function setMetaTags(metadata: PageMetadata) {
  // Title
  if (metadata.title) {
    document.title = metadata.title;
  }

  // Meta description
  if (metadata.description) {
    updateMetaTag('name', 'description', metadata.description);
  }

  // Keywords
  if (metadata.keywords) {
    updateMetaTag('name', 'keywords', metadata.keywords);
  }

  // Open Graph tags
  if (metadata.ogTitle) {
    updateMetaTag('property', 'og:title', metadata.ogTitle);
  }
  if (metadata.ogDescription) {
    updateMetaTag('property', 'og:description', metadata.ogDescription);
  }
  if (metadata.ogImage) {
    updateMetaTag('property', 'og:image', metadata.ogImage);
  }
  if (metadata.ogImageWidth) {
    updateMetaTag('property', 'og:image:width', String(metadata.ogImageWidth));
  }
  if (metadata.ogImageHeight) {
    updateMetaTag('property', 'og:image:height', String(metadata.ogImageHeight));
  }
  if (metadata.ogImageAlt) {
    updateMetaTag('property', 'og:image:alt', metadata.ogImageAlt);
  }
  if (metadata.ogUrl) {
    updateMetaTag('property', 'og:url', metadata.ogUrl);
  }

  // Twitter Card
  if (metadata.twitterCard) {
    updateMetaTag('name', 'twitter:card', metadata.twitterCard);
  }
  if (metadata.twitterTitle) {
    updateMetaTag('name', 'twitter:title', metadata.twitterTitle);
  }
  if (metadata.twitterDescription) {
    updateMetaTag('name', 'twitter:description', metadata.twitterDescription);
  }
  if (metadata.twitterImage) {
    updateMetaTag('name', 'twitter:image', metadata.twitterImage);
  }

  // Canonical URL
  if (metadata.canonical) {
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      (canonical as HTMLLinkElement).rel = 'canonical';
      document.head.appendChild(canonical);
    }
    (canonical as HTMLLinkElement).href = metadata.canonical;
  }
}

/**
 * Update or create meta tag
 */
function updateMetaTag(type: 'name' | 'property', name: string, content: string) {
  let tag = document.querySelector(`meta[${type}="${name}"]`);
  
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(type, name);
    document.head.appendChild(tag);
  }
  
  tag.setAttribute('content', content);
}

/**
 * Singleton `<meta name="robots">` manager for authenticated/personalised
 * routes. The SPA shell's default is `index, follow`; protected pages with
 * private data (e.g. Opportunities) opt out while mounted and restore the
 * default on unmount so public routes keep their global behaviour.
 */
export function setRobotsMeta(content: string) {
  updateMetaTag('name', 'robots', content);
}

/**
 * Generate JSON-LD structured data for rich snippets
 */
function structuredDataId(type: string) {
  return `seo-jsonld-${type.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

export function generateStructuredData(type: string, data: Record<string, unknown>) {
  // Keep one current schema per type. SPA routes and React Strict Mode can run
  // effects more than once; updating a keyed script avoids duplicate entities
  // while preserving the existing client-side SEO integration.
  const id = structuredDataId(type);
  let script = document.getElementById(id) as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement('script');
    script.id = id;
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': type,
    ...data,
  });
  return script;
}

export function removeStructuredData(...types: string[]) {
  for (const type of types) document.getElementById(structuredDataId(type))?.remove();
}

/**
 * Organization schema
 */
export function setOrganizationSchema(org: {
  name: string;
  logo: string;
  url: string;
  sameAs?: string[];
}) {
  generateStructuredData('Organization', {
    name: org.name,
    logo: org.logo,
    url: org.url,
    ...(org.sameAs && org.sameAs.length > 0 ? { sameAs: org.sameAs } : {}),
  });
}

/**
 * BreadcrumbList schema for navigation
 */
export function setBreadcrumbSchema(items: Array<{ name: string; url: string }>) {
  generateStructuredData('BreadcrumbList', {
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  });
}

/**
 * Software Application schema
 */
export function setApplicationSchema(app: {
  name: string;
  description: string;
  url: string;
  image: string;
  applicationCategory: string;
}) {
  generateStructuredData('SoftwareApplication', {
    name: app.name,
    description: app.description,
    url: app.url,
    image: app.image,
    applicationCategory: app.applicationCategory,
  });
}
