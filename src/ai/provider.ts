import { createGoogleGenerativeAI } from "@ai-sdk/google";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

export const planModel = google(process.env.GOOGLE_GENERATIVE_AI_MODEL ?? "gemini-2.5-flash");
