import { useEffect, useState } from "react";
import { Download } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Safari adds a non-standard `standalone` boolean to navigator on iOS.
interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

interface InstallButtonProps {
  className?: string;
  label?: string;
}

export default function InstallButton({
  className = "",
  label = "Install app",
}: InstallButtonProps) {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const navWithStandalone = window.navigator as NavigatorWithStandalone;
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      navWithStandalone.standalone === true;
    setIsStandalone(standalone);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const installed = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installed);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  if (isStandalone || !deferredPrompt) return null;

  const onClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  return (
    <button
      onClick={onClick}
      type="button"
      className={
        className ||
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-white/85 hover:text-white hover:bg-white/10 transition-colors"
      }
    >
      <Download className="h-3.5 w-3.5" />
      <span>{label}</span>
    </button>
  );
}
