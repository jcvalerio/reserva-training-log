import { createGoogleGenerativeAI } from "@ai-sdk/google";

import { env } from "@/env";

const google = createGoogleGenerativeAI({
  apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY,
});

export const planModel = google(env.GOOGLE_GENERATIVE_AI_MODEL ?? "gemini-2.5-flash");
