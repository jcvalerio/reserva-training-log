"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  pendingChildren = "Guardando…",
  className,
  formAction,
  formNoValidate,
}: {
  children: React.ReactNode;
  pendingChildren?: React.ReactNode;
  className: string;
  // Lets one form carry a second, different submit target (e.g. a destructive
  // "borrar" alongside the primary "guardar"), instead of nesting forms.
  formAction?: (formData: FormData) => void;
  // Pairs with formAction: a secondary action shouldn't be blocked by
  // validation on fields it's about to discard anyway.
  formNoValidate?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className={className}
      formAction={formAction}
      formNoValidate={formNoValidate}
    >
      {pending ? pendingChildren : children}
    </button>
  );
}
