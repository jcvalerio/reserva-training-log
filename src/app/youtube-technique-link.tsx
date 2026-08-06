import { buildYoutubeTechniqueSearchUrl, type YoutubeTechniqueExercise } from "@/training/youtube-technique";

export function YoutubeTechniqueIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth={1.6} />
      <path d="M10 8.3v7.4l6.2-3.7z" fill="currentColor" />
    </svg>
  );
}

export function YoutubeTechniqueLink({ nameEs, nameEn, isUnilateral }: YoutubeTechniqueExercise) {
  const href = buildYoutubeTechniqueSearchUrl({ nameEs, nameEn, isUnilateral });

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Ver técnica de ${nameEs} en YouTube`}
      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-zinc-300 ring-1 ring-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 active:text-emerald-300"
    >
      <YoutubeTechniqueIcon className="h-5 w-5" />
    </a>
  );
}
