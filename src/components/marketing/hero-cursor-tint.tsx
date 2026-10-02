"use client";
import { useEffect, useRef } from "react";

/**
 * Faint primary-blue tint that follows a fine-pointer mouse inside its parent (the home hero).
 * Event-driven only: no idle animation loop, no React state per pointer event.
 * Mounts listeners only on fine-pointer desktops that have not asked for reduced motion.
 */
export function HeroCursorTint() {
  const tintRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const tint = tintRef.current;
    const host = tint?.parentElement;
    if (!tint || !host) return;
    const gate = window.matchMedia(
      "(min-width: 1024px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)"
    );
    let dispose = () => {};
    const sync = () => {
      dispose();
      dispose = () => {};
      if (!gate.matches) return;
      let frame = 0;
      let clientX = 0;
      let clientY = 0;
      const flush = () => {
        frame = 0;
        const r = host.getBoundingClientRect();
        if (clientX < r.left || clientX > r.right || clientY < r.top || clientY > r.bottom) {
          tint.removeAttribute("data-active");
          return;
        }
        tint.style.setProperty("--gc-pointer-x", `${clientX - r.left}px`);
        tint.style.setProperty("--gc-pointer-y", `${clientY - r.top}px`);
        tint.dataset.active = "true";
      };
      const move = (event: PointerEvent) => {
        if (event.pointerType !== "mouse") return;
        clientX = event.clientX;
        clientY = event.clientY;
        if (!frame) frame = window.requestAnimationFrame(flush);
      };
      const leave = () => {
        if (frame) window.cancelAnimationFrame(frame);
        frame = 0;
        tint.removeAttribute("data-active");
      };
      const visibility = () => { if (document.hidden) leave(); };
      host.addEventListener("pointermove", move, { passive: true });
      host.addEventListener("pointerleave", leave);
      window.addEventListener("blur", leave);
      document.addEventListener("visibilitychange", visibility);
      dispose = () => {
        leave();
        host.removeEventListener("pointermove", move);
        host.removeEventListener("pointerleave", leave);
        window.removeEventListener("blur", leave);
        document.removeEventListener("visibilitychange", visibility);
      };
    };
    sync();
    gate.addEventListener("change", sync);
    return () => { dispose(); gate.removeEventListener("change", sync); };
  }, []);
  return <div ref={tintRef} aria-hidden="true" className="gc-cursor-tint pointer-events-none" />;
}
