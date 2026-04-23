"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

type DeferredInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function PwaClientShell() {
  const [promptEvent, setPromptEvent] = useState<DeferredInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    void navigator.serviceWorker.register("/sw.js", {
      scope: "/"
    });
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as DeferredInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  if (!promptEvent || dismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto flex max-w-3xl items-center justify-between gap-4 rounded-[28px] border border-border bg-card p-4 shadow-panel">
      <div>
        <p className="text-sm font-semibold">Install Thermal Lead Tracker</p>
        <p className="text-sm text-muted-foreground">
          Open it like a desktop workspace while keeping the MVP web-first.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          onClick={() => {
            setDismissed(true);
          }}
        >
          Later
        </Button>
        <Button
          onClick={async () => {
            await promptEvent.prompt();
            await promptEvent.userChoice;
            setPromptEvent(null);
          }}
        >
          Install
        </Button>
      </div>
    </div>
  );
}
