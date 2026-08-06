export type YoutubeTechniqueExercise = {
  nameEs: string;
  nameEn?: string | null;
  isUnilateral: boolean;
};

const UNILATERAL_MENTION_PATTERN = /unilateral/i;

export function buildYoutubeTechniqueQuery({ nameEs, nameEn, isUnilateral }: YoutubeTechniqueExercise): string {
  const trimmedEs = nameEs.trim();
  const parts = [trimmedEs, "técnica"];

  if (isUnilateral && !UNILATERAL_MENTION_PATTERN.test(trimmedEs)) {
    parts.push("unilateral");
  }

  const trimmedEn = nameEn?.trim();
  const query = parts.join(" ");
  return trimmedEn ? `${query} (${trimmedEn})` : query;
}

export function buildYoutubeTechniqueSearchUrl(exercise: YoutubeTechniqueExercise): string {
  const query = buildYoutubeTechniqueQuery(exercise);
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}
