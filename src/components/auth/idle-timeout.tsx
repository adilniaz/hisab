"use client";
import { useEffect, useRef } from "react";
import { signOut } from "next-auth/react";

const IDLE_MS = 30 * 60 * 1000;

export function IdleTimeout() {
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    function reset() {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => signOut({ callbackUrl: "/login" }), IDLE_MS);
    }
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, reset));
    reset();
    return () => {
      clearTimeout(timer.current);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, []);

  return null;
}
