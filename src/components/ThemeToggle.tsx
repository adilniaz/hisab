"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState<boolean | null>(null);

  useEffect(() => {
    // Deferred: the theme class is only knowable client-side (set by the
    // blocking init script), so read it after mount to avoid an SSR
    // hydration mismatch.
    void Promise.resolve().then(() =>
      setIsDark(document.documentElement.classList.contains("dark")),
    );
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      // localStorage can throw in privacy mode — theme still applies for this page view
    }
  }

  if (isDark === null) {
    return <Button variant="ghost" size="icon-sm" className="invisible" aria-hidden="true" />;
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={toggle}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
    >
      {isDark ? <Sun /> : <Moon />}
    </Button>
  );
}
