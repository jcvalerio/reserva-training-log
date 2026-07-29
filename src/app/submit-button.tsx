"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  pendingChildren = "Guardando…",
  className,
}: {
  children: React.ReactNode;
  pendingChildren?: React.ReactNode;
  className: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} aria-disabled={pending} className={className}>
      {pending ? pendingChildren : children}
    </button>
  );
}
