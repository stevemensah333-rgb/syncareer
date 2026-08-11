import { useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { BLOG_POSTS } from "@/data/blogPosts";
import { setMetaTags, generateStructuredData } from "@/lib/seo";
import LandingHeader from "@/components/landing/LandingHeader";
import LandingFooter from "@/components/landing/LandingFooter";

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const post = BLOG_POSTS.find((p) => p.slug === slug);

  useEffect(() => {
    if (!post) return;
    setMetaTags({
      title: `${post.title} — Syncareer`,
      description: post.description,
      canonical: `https://syncareer.me/blog/${post.slug}`,
      ogTitle: post.title,
      ogDescription: post.description,
    });
    generateStructuredData("Article", {
      headline: post.title,
      description: post.description,
      datePublished: post.date,
      author: { "@type": "Organization", name: "Syncareer" },
      publisher: { "@type": "Organization", name: "Syncareer", logo: { "@type": "ImageObject", url: "https://syncareer.me/logo.png" } },
      mainEntityOfPage: `https://syncareer.me/blog/${post.slug}`,
    });
  }, [post]);

  if (!post) {
    return (
      <div className="min-h-screen bg-background">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-4 focus:py-3 focus:text-sm focus:font-medium focus:text-primary-foreground">Skip to main content</a>
        <LandingHeader onSignIn={() => navigate("/sign-in")} onSignUp={() => navigate("/sign-up")} />
        <main id="main-content" tabIndex={-1} className="container mx-auto max-w-3xl px-6 py-32 text-center focus:outline-none">
          <h1 className="text-3xl font-semibold mb-4">Post not found</h1>
          <Link to="/blog" className="text-primary hover:underline">← Back to blog</Link>
        </main>
        <LandingFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-4 focus:py-3 focus:text-sm focus:font-medium focus:text-primary-foreground">Skip to main content</a>
      <LandingHeader onSignIn={() => navigate("/sign-in")} onSignUp={() => navigate("/sign-up")} />
      <main id="main-content" tabIndex={-1} className="container mx-auto max-w-3xl px-6 py-20 focus:outline-none">
        <Link to="/blog" className="text-sm text-foreground/60 hover:text-foreground mb-8 inline-block">← All posts</Link>
        <article>
          <p className="text-xs uppercase tracking-[0.14em] text-primary mb-3">{post.category} · {post.readTime}</p>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mb-4">{post.title}</h1>
          <p className="text-sm text-foreground/55 mb-10">
            {new Date(post.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </p>
          <div
            className="prose prose-neutral dark:prose-invert max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-h2:text-2xl prose-h2:mt-10 prose-p:leading-relaxed prose-p:text-foreground/80"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </article>

        <div className="mt-16 pt-10 border-t border-foreground/10">
          <p className="text-sm text-foreground/60 mb-4">Continue reading</p>
          <div className="grid sm:grid-cols-2 gap-4">
            {BLOG_POSTS.filter((p) => p.slug !== post.slug).slice(0, 2).map((p) => (
              <Link key={p.slug} to={`/blog/${p.slug}`} className="block p-5 rounded-xl border border-foreground/10 hover:border-primary/40 transition-colors">
                <p className="text-xs uppercase tracking-[0.14em] text-foreground/50 mb-2">{p.category}</p>
                <h3 className="font-semibold leading-snug">{p.title}</h3>
              </Link>
            ))}
          </div>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
