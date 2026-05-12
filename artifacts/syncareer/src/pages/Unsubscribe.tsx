import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<"validating" | "valid" | "invalid" | "already" | "submitting" | "done" | "error">("validating");
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }
    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: SUPABASE_ANON_KEY } }
        );
        const data = await res.json();
        if (!res.ok) {
          setState("invalid");
          setErrorMsg(data?.error || "Invalid link");
          return;
        }
        if (data?.valid === false && data?.reason === "already_unsubscribed") {
          setState("already");
          return;
        }
        setState("valid");
      } catch {
        setState("invalid");
      }
    })();
  }, [token]);

  const confirm = async () => {
    if (!token) return;
    setState("submitting");
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/handle-email-unsubscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) {
        setState("error");
        setErrorMsg(data?.error || "Something went wrong");
        return;
      }
      setState("done");
    } catch {
      setState("error");
      setErrorMsg("Network error");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center space-y-5">
        <h1 className="text-2xl font-semibold tracking-tight">Email preferences</h1>

        {state === "validating" && <p className="text-foreground/65">Checking your link…</p>}

        {state === "valid" && (
          <>
            <p className="text-foreground/70">
              You're about to unsubscribe from Syncareer onboarding emails.
              Important account and security emails will still be delivered.
            </p>
            <Button onClick={confirm} className="rounded-full">Confirm unsubscribe</Button>
          </>
        )}

        {state === "submitting" && <p className="text-foreground/65">Updating your preferences…</p>}

        {state === "done" && (
          <p className="text-foreground/80">
            You're unsubscribed. We're sorry to see you go.
          </p>
        )}

        {state === "already" && (
          <p className="text-foreground/80">You're already unsubscribed.</p>
        )}

        {state === "invalid" && (
          <p className="text-foreground/70">
            This unsubscribe link is invalid or has expired.{errorMsg ? ` (${errorMsg})` : ""}
          </p>
        )}

        {state === "error" && (
          <>
            <p className="text-foreground/70">{errorMsg}</p>
            <Button variant="outline" onClick={confirm} className="rounded-full">Try again</Button>
          </>
        )}
      </div>
    </div>
  );
}
