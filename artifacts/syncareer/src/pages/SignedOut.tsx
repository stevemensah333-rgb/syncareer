import { Link } from "react-router-dom";
import { MessageScreen } from "@/components/layout/MessageScreen";
import { buttonVariants } from "@/components/ui/button";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function SignedOut() {
  return (
    <MessageScreen
      eyebrow="Signed out"
      title="You've been signed out"
      description="Your session is closed safely. Pop back in whenever you're ready — your assessments, CV, and saved roles will be right where you left them."
      actions={
        <>
          <Link to={`${basePath}/sign-in`} className={buttonVariants()}>
            Sign back in
          </Link>
          <Link to={`${basePath}/`} className={buttonVariants({ variant: "outline" })}>
            Back to home
          </Link>
        </>
      }
      footer={
        <>
          New here?{" "}
          <Link to={`${basePath}/sign-up`} className="font-medium text-primary underline-offset-4 hover:underline">
            Create an account
          </Link>
        </>
      }
    />
  );
}
