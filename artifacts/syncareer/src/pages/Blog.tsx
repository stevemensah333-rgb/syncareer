import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import syncareerLogo from '@/assets/syncareer-logo.svg';
import { setMetaTags, generateStructuredData, removeStructuredData, setBreadcrumbSchema } from '@/lib/seo';
import { BLOG_POST_METAS } from '@/data/blogPosts';

const SITE_URL = 'https://syncareer.me';

export default function Blog() {
  useEffect(() => {
    setMetaTags({
      title: 'Blog — Syncareer',
      description:
        'Practical career guidance for students and recent graduates: CV writing, interview preparation, and finding real entry-level jobs. Written for the African graduate market.',
      canonical: `${SITE_URL}/blog`,
      ogTitle: 'Syncareer Blog — Career guidance for graduates',
      ogDescription:
        'Practical career guidance for students and recent graduates: CV writing, interview preparation, and finding real entry-level jobs.',
      ogUrl: `${SITE_URL}/blog`,
      ogImage: `${SITE_URL}/og-image.png`,
      ogImageWidth: 1200,
      ogImageHeight: 630,
      ogImageAlt: 'Syncareer — Career guidance for graduates.',
      twitterCard: 'summary_large_image',
      twitterTitle: 'Syncareer Blog — Career guidance for graduates',
      twitterDescription:
        'Practical career guidance for students and recent graduates: CV writing, interview preparation, and finding real entry-level jobs.',
      twitterImage: `${SITE_URL}/og-image.png`,
    });

    setBreadcrumbSchema([
      { name: 'Home', url: SITE_URL },
      { name: 'Blog', url: `${SITE_URL}/blog` },
    ]);

    generateStructuredData('Blog', {
      name: 'Syncareer Blog',
      url: `${SITE_URL}/blog`,
    });

    return () => removeStructuredData('Blog', 'BreadcrumbList');
  }, []);

  return (
    <div className="theme-pf min-h-screen bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-4 focus:py-3 focus:text-sm focus:font-medium focus:text-primary-foreground"
      >
        Skip to main content
      </a>

      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
        <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex min-h-11 items-center gap-2 rounded-md" aria-label="Syncareer home">
            <img src={syncareerLogo} alt="" className="h-7 w-7" />
            <span className="text-lg font-semibold tracking-tight">Syncareer</span>
          </Link>
          <nav className="flex items-center gap-1 text-sm" aria-label="Blog navigation">
            <Link
              to="/"
              className="flex min-h-11 items-center rounded-md border px-3 font-medium"
            >
              Back to Syncareer
            </Link>
          </nav>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="focus:outline-none">
        <header className="border-b bg-secondary/45">
          <div className="mx-auto max-w-[1240px] px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
            <p className="dossier-eyebrow text-primary">Resources</p>
            <h1 className="dossier-title mt-3 text-[32px] leading-9 tracking-[-0.01em] sm:text-[40px] sm:leading-11">
              Career guidance for graduates
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
              Practical, honest advice on writing a CV that gets read, preparing for interviews,
              and finding real entry-level opportunities. No marketing language — just what works.
            </p>
          </div>
        </header>

        <div className="mx-auto max-w-[1240px] px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {BLOG_POST_METAS.map((post) => (
              <Link
                key={post.slug}
                to={`/blog/${post.slug}`}
                className="group flex flex-col rounded-surface border bg-card p-6 transition-colors duration-150 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <p className="dossier-eyebrow">
                  {post.category}
                </p>
                <h2 className="mt-3 text-lg font-semibold leading-7 tracking-[-0.01em] text-foreground group-hover:text-primary">
                  {post.title}
                </h2>
                <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">
                  {post.description}
                </p>
                <div className="mt-5 flex items-center justify-between text-xs text-muted-foreground">
                  <time dateTime={post.publishedAt}>
                    {new Date(post.publishedAt).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </time>
                  <span>{post.readingTime}</span>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-16 rounded-surface border bg-card p-8 sm:p-10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold tracking-[-0.01em]">
                  Put this into practice
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Syncareer is free. Save a real opportunity, build a stronger CV, and practice
                  for the interview — all in one place.
                </p>
              </div>
              <Link
                to="/sign-up?returnTo=%2Fopportunities"
                className="inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Explore opportunities
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
