"use client";

import { useEffect } from "react";

/**
 * Submit the form with the given id on ⌘/Ctrl+Enter. Shared by both creation
 * flows so the keyboard affordance stays identical across them.
 */
export function useSubmitShortcut(formId: string): void {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        const form = document.getElementById(formId) as HTMLFormElement | null;
        form?.requestSubmit();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [formId]);
}
