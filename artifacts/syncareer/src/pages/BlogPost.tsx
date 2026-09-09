import { useEffect } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import syncareerLogo from '@/assets/syncareer-logo.svg';
import { setMetaTags, generateStructuredData, removeStructuredData, setBreadcrumbSchema } from '@/lib/seo';
import { getBlogPost, getRelatedPosts } from '@/data/blogPosts';

const SITE_URL = 'https://syncareer.me';

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const post = slug ? getBlogPost(slug) : undefined;

  useEffect(() => {
    if (!post) return;

    const url = `${SITE_URL}/blog/${post.slug}`;
    setMetaTags({
      title: `${post.title} — Syncareer Blog`,
      description: post.description,
      canonical: url,
      keywords: post.keywords.join(', '),
      ogTitle: post.title,
      ogDescription: post.description,
      ogUrl: url,
      ogImage: `${SITE_URL}/og-image.png`,
      ogImageWidth: 1200,
      ogImageHeight: 630,
      ogImageAlt: post.title,
      twitterCard: 'summary_large_image',
      twitterTitle: post.title,
      twitterDescription: post.description,
      twitterImage: `${SITE_URL}/og-image.png`,
    });

    setBreadcrumbSchema([
      { name: 'Home', url: SITE_URL },
      { name: 'Blog', url: `${SITE_URL}/blog` },
      { name: post.title, url },
    ]);

    generateStructuredData('Article', {
      headline: post.title,
      description: post.description,
      datePublished: post.publishedAt,
      dateModified: post.publishedAt,
      author: { '@type': 'Organization', name: 'Syncareer' },
      publisher: {
        '@type': 'Organization',
        name: 'Syncareer',
        logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo.png` },
      },
      mainEntityOfPage: url,
      keywords: post.keywords.join(', '),
    });

    return () => removeStructuredData('Article', 'BreadcrumbList');
  }, [post]);

  if (!post) return <Navigate to="/blog" replace />;

  const related = getRelatedPosts(post.slug);

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
              to="/blog"
              className="flex min-h-11 items-center rounded-md px-3 font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Blog
            </Link>
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
        <article>
          <header className="border-b bg-secondary/45">
            <div className="mx-auto max-w-[820px] px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
              <nav aria-label="Breadcrumb" className="mb-4">
                <Link
                  to="/blog"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  Blog
                </Link>
              </nav>
              <p className="dossier-eyebrow text-primary">{post.category}</p>
              <h1 className="dossier-title mt-3 text-[28px] leading-8 tracking-[-0.01em] sm:text-[36px] sm:leading-10">
                {post.title}
              </h1>
              <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
                {post.description}
              </p>
              <div className="mt-5 flex items-center gap-3 text-sm text-muted-foreground">
                <time dateTime={post.publishedAt}>
                  {new Date(post.publishedAt).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </time>
                <span aria-hidden="true">·</span>
                <span>{post.readingTime}</span>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-[820px] px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
            <div className="blog-article">{post.content}</div>

            <div className="mt-14 rounded-surface border bg-primary/5 p-6 sm:p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold tracking-[-0.01em]">
                    {post.cta.label}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Free for students and recent graduates. No subscription, no paid tier.
                  </p>
                </div>
                <Link
                  to={post.cta.href}
                  className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  {post.cta.label}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>

            {related.length > 0 && (
              <div className="mt-14 border-t pt-10">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Keep reading
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {related.map((rel) => (
                    <Link
                      key={rel.slug}
                      to={`/blog/${rel.slug}`}
                      className="group flex flex-col rounded-surface border bg-card p-5 transition-colors duration-150 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                <p className="dossier-eyebrow">
                  {rel.category}
                </p>
                      <h3 className="mt-2 text-base font-semibold leading-7 tracking-[-0.01em] group-hover:text-primary">
                        {rel.title}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">{rel.readingTime}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </article>
      </main>
    </div>
  );
}
