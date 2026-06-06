import Groq from "groq-sdk";
import { NextResponse } from "next/server";
import { type RagChunk, type RagSource, retrieveRelevantChunks } from "@/lib/rag";

export const runtime = "nodejs";

type AskPayload = {
  question?: string;
  chunks?: RagChunk[];
};

export async function POST(request: Request) {
  let sourcesForError: RagSource[] = [];

  try {
    const payload = (await request.json()) as AskPayload;
    const question = payload.question?.trim();
    const chunks = payload.chunks ?? [];

    if (!question) {
      return NextResponse.json({ error: "Digite uma pergunta para consultar o assistente." }, { status: 400 });
    }

    if (!chunks.length) {
      return NextResponse.json(
        { error: "Nenhum documento foi indexado. Use os exemplos ou envie arquivos." },
        { status: 400 },
      );
    }

    const sources = await retrieveRelevantChunks(question, chunks, 5);
    sourcesForError = sources;

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        {
          error:
            "GROQ_API_KEY não configurada. Crie um arquivo .env.local com sua chave da Groq para gerar respostas.",
          sources,
        },
        { status: 503 },
      );
    }

    const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const model = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";
    const context = sources
      .map(
        (source, index) =>
          `[Fonte ${index + 1}: ${source.documentName} | score ${source.score.toFixed(3)}]\n${source.text}`,
      )
      .join("\n\n");

    const completion = await client.chat.completions.create({
      model,
      temperature: 0.25,
      max_tokens: 850,
      messages: [
        {
          role: "system",
          content:
            "Você é um assistente acadêmico de IA generativa com RAG. Responda em português do Brasil, use apenas o contexto fornecido quando ele for suficiente, indique limitações quando faltar evidência e cite as fontes recuperadas no formato [Fonte 1].",
        },
        {
          role: "user",
          content: `Pergunta: ${question}\n\nContexto recuperado:\n${context}`,
        },
      ],
    });

    const answer = completion.choices[0]?.message?.content?.trim();

    if (!answer) {
      return NextResponse.json(
        {
          error: "A Groq respondeu sem conteúdo. Verifique o modelo configurado em GROQ_MODEL.",
          model,
          sources,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      answer,
      model,
      sources,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const readableError =
      message.includes("Invalid API Key") || message.includes("expired_api_key") || message.includes("401")
        ? "Chave Groq inválida ou expirada. Atualize GROQ_API_KEY no arquivo .env.local."
        : message
          ? `Falha ao consultar a Groq: ${message}`
          : "Falha ao consultar a Groq.";

    return NextResponse.json(
      {
        error: readableError,
        sources: sourcesForError.length ? sourcesForError : undefined,
      },
      { status: 502 },
    );
  }
}
