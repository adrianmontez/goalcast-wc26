"use client";

import { useEffect } from "react";

export default function useSaveScrollPosition(storageKey) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedPosition = sessionStorage.getItem(storageKey);

    if (savedPosition) {
      requestAnimationFrame(() => {
        window.scrollTo(0, Number(savedPosition));
      });
    }

    function savePosition() {
      sessionStorage.setItem(storageKey, String(window.scrollY));
    }

    window.addEventListener("beforeunload", savePosition);
    window.addEventListener("pagehide", savePosition);

    return () => {
      savePosition();
      window.removeEventListener("beforeunload", savePosition);
      window.removeEventListener("pagehide", savePosition);
    };
  }, [storageKey]);
}