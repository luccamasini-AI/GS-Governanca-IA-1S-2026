import { NextResponse } from "next/server";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json({
    groqConfigured: Boolean(process.env.GROQ_API_KEY),
    openAIConfigured: Boolean(process.env.OPENAI_API_KEY),
    groqModel: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
    embeddingModel: process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small",
  });
}
