import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { MessageScreen } from "@/components/layout/MessageScreen";
import { buttonVariants } from "@/components/ui/button";
import { useNoIndex } from "@/hooks/useNoIndex";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const NotFound = () => {
  const location = useLocation();

  // Unknown URLs are not content and must not be indexed.
  useNoIndex();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <MessageScreen
      eyebrow="Page not found"
      title="This page took a wrong turn"
      description="We can't find what you were looking for. The link may be old, or the page may have moved — let's get you back on track."
      actions={
        <>
          <Link to={`${basePath}/`} className={buttonVariants()}>
            Back to home
          </Link>
          <Link to={`${basePath}/sign-in`} className={buttonVariants({ variant: "outline" })}>
            Sign in instead
          </Link>
        </>
      }
    />
  );
};

export default NotFound;
