"use client";

import { useState } from "react";

export function CopyLinkButton({ value, className }: { value: string; className: string }) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be denied by the browser — the link text is
      // already visible on screen for a manual copy, so this is a silent
      // no-op rather than an error state.
    }
  }

  return (
    <button type="button" onClick={handleClick} className={className}>
      {copied ? "Copiado" : "Copiar enlace"}
    </button>
  );
}
