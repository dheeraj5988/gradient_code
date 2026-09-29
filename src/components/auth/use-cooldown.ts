"use client";
import { useCallback, useEffect, useState } from "react";

/**
 * Countdown that survives page refreshes (end time kept in sessionStorage), so refreshing
 * the page cannot be used to skip the wait. Supabase enforces its own limit server-side too.
 */
export function useCooldown(key: string) {
  const read = () => { try { return Number(sessionStorage.getItem(key)) || 0; } catch { return 0; } };
  const [left, setLeft] = useState(0);
  const tick = useCallback(() => setLeft(Math.max(0, Math.ceil((read() - Date.now()) / 1000))), []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [tick]);
  const start = useCallback((seconds: number) => {
    try { sessionStorage.setItem(key, String(Date.now() + seconds * 1000)); } catch { /* ignore */ }
    setLeft(seconds);
  }, [key]);
  return { left, start };
}
