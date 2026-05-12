import { useEffect } from "react";
import { Link } from "react-router-dom";
import { BLOG_POSTS } from "@/data/blogPosts";
import { setMetaTags } from "@/lib/seo";
import LandingHeader from "@/components/landing/LandingHeader";
import LandingFooter from "@/components/landing/LandingFooter";
import { useNavigate } from "react-router-dom";

export default function Blog() {
  const navigate = useNavigate();

  useEffect(() => {
    setMetaTags({
      title: "Syncareer Blog — Career Advice for African Graduates",
      description: "Practical career guides on CVs, interviews, assessments, and graduate jobs in Africa. Written for students and recent graduates.",
      canonical: "https://syncareer.me/blog",
      ogTitle: "Syncareer Blog",
      ogDescription: "Practical career guides for African students and graduates.",
    });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader onSignIn={() => navigate("/sign-in")} onSignUp={() => navigate("/sign-up")} />
      <main className="container mx-auto max-w-4xl px-6 py-20">
        <header className="mb-14">
          <p className="text-xs uppercase tracking-[0.18em] text-primary mb-3">Resources</p>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mb-4">Career guides for African graduates</h1>
          <p className="text-foreground/65 text-lg max-w-2xl">Honest, practical advice on getting hired, building skills, and growing your career.</p>
        </header>

        <div className="space-y-10">
          {BLOG_POSTS.map((post) => (
            <article key={post.slug} className="border-b border-foreground/10 pb-10">
              <Link to={`/blog/${post.slug}`} className="group block">
                <p className="text-xs uppercase tracking-[0.14em] text-foreground/50 mb-2">
                  {post.category} · {post.readTime}
                </p>
                <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-3 group-hover:text-primary transition-colors">
                  {post.title}
                </h2>
                <p className="text-foreground/70 leading-relaxed">{post.description}</p>
                <p className="mt-3 text-sm text-foreground/50">
                  {new Date(post.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                </p>
              </Link>
            </article>
          ))}
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
