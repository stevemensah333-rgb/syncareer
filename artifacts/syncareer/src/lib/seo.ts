/**
 * SEO and metadata utilities
 */

export interface PageMetadata {
  title: string;
  description: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogUrl?: string;
  twitterCard?: string;
  canonical?: string;
}

/**
 * Update document head with meta tags
 */
export function setMetaTags(metadata: PageMetadata) {
  // Title
  document.title = metadata.title;
  
  // Meta description
  updateMetaTag('name', 'description', metadata.description);
  
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
  if (metadata.ogUrl) {
    updateMetaTag('property', 'og:url', metadata.ogUrl);
  }
  
  // Twitter Card
  if (metadata.twitterCard) {
    updateMetaTag('name', 'twitter:card', metadata.twitterCard);
  }
  
  // Canonical URL
  if (metadata.canonical) {
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = metadata.canonical;
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
 * Generate JSON-LD structured data for rich snippets
 */
export function generateStructuredData(type: string, data: any) {
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': type,
    ...data,
  });
  document.head.appendChild(script);
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
    sameAs: org.sameAs || [],
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
