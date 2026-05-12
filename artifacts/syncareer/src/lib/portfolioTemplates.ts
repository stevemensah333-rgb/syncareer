/**
 * Portfolio template registry. Each template is a set of CSS classes + font pair
 * that gets applied to the public portfolio shell. Accent color is injected as
 * a CSS variable so users can theme it.
 */

export type TemplateId = 'minimal' | 'editorial' | 'bold' | 'dark' | 'creative';

export interface PortfolioTemplate {
  id: TemplateId;
  name: string;
  description: string;
  /** className applied to the outer wrapper */
  wrapperClass: string;
  /** className applied to project cards */
  cardClass: string;
  /** className applied to the hero */
  heroClass: string;
  /** Heading font (Google Fonts family name, no fallback) */
  headingFont: string;
  /** Body font */
  bodyFont: string;
}

export const PORTFOLIO_TEMPLATES: Record<TemplateId, PortfolioTemplate> = {
  minimal: {
    id: 'minimal',
    name: 'Minimal',
    description: 'Lots of whitespace, restrained typography, neutral palette.',
    wrapperClass: 'bg-white text-neutral-900',
    cardClass: 'border border-neutral-200 hover:border-[var(--portfolio-accent)] transition-colors',
    heroClass: 'border-b border-neutral-200',
    headingFont: 'Inter',
    bodyFont: 'Inter',
  },
  editorial: {
    id: 'editorial',
    name: 'Editorial',
    description: 'Magazine-inspired with serif headlines and large hero text.',
    wrapperClass: 'bg-[#fbf9f4] text-neutral-900',
    cardClass: 'border border-neutral-200 bg-white hover:shadow-md transition-shadow',
    heroClass: 'border-b border-neutral-300',
    headingFont: 'Playfair Display',
    bodyFont: 'Inter',
  },
  bold: {
    id: 'bold',
    name: 'Bold',
    description: 'High-contrast brutalist look with chunky type and color blocks.',
    wrapperClass: 'bg-[#fefce8] text-neutral-900',
    cardClass: 'border-2 border-neutral-900 bg-white hover:-translate-y-1 transition-transform',
    heroClass: 'border-b-2 border-neutral-900',
    headingFont: 'Space Grotesk',
    bodyFont: 'Space Grotesk',
  },
  dark: {
    id: 'dark',
    name: 'Dark Tech',
    description: 'Dark mode with mono accents — great for engineers.',
    wrapperClass: 'bg-[#0b0d10] text-neutral-100',
    cardClass: 'border border-neutral-800 bg-[#13161a] hover:border-[var(--portfolio-accent)] transition-colors',
    heroClass: 'border-b border-neutral-800',
    headingFont: 'JetBrains Mono',
    bodyFont: 'Inter',
  },
  creative: {
    id: 'creative',
    name: 'Creative',
    description: 'Soft gradients and playful curves for designers and creatives.',
    wrapperClass: 'bg-gradient-to-br from-[#fff5f7] via-white to-[#f5f7ff] text-neutral-900',
    cardClass: 'border border-white bg-white/80 backdrop-blur shadow-sm hover:shadow-lg transition-shadow rounded-2xl',
    heroClass: 'border-b border-neutral-200/60',
    headingFont: 'Fraunces',
    bodyFont: 'Inter',
  },
};

export function getTemplate(id?: string | null): PortfolioTemplate {
  if (id && id in PORTFOLIO_TEMPLATES) return PORTFOLIO_TEMPLATES[id as TemplateId];
  return PORTFOLIO_TEMPLATES.minimal;
}

/** Inject Google Fonts <link> tags for a template (idempotent). */
export function ensureFontsLoaded(template: PortfolioTemplate) {
  const families = Array.from(new Set([template.headingFont, template.bodyFont]));
  const id = `portfolio-fonts-${families.join('-').replace(/\s+/g, '_')}`;
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?${families
    .map((f) => `family=${encodeURIComponent(f)}:wght@400;500;600;700;800`)
    .join('&')}&display=swap`;
  document.head.appendChild(link);
}

/**
 * Parse a Figma file URL and extract a fileKey + nodeId. We can't actually call
 * the Figma API without a personal token, but we can guide users to paste a
 * Figma "Tokens Studio" JSON export or a simple color list.
 */
export function parseDesignTokens(json: string): { accent?: string; heading?: string; body?: string } | null {
  try {
    const parsed = JSON.parse(json);
    const accent =
      parsed.accent ||
      parsed.primary ||
      parsed.colors?.accent ||
      parsed.colors?.primary ||
      parsed.global?.colors?.primary?.value;
    const heading = parsed.headingFont || parsed.fonts?.heading || parsed.typography?.heading;
    const body = parsed.bodyFont || parsed.fonts?.body || parsed.typography?.body;
    if (!accent && !heading && !body) return null;
    return { accent, heading, body };
  } catch {
    return null;
  }
}
