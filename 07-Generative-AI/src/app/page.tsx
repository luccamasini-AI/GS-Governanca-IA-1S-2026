"use client";

import {
  AlertCircle,
  Bot,
  BrainCircuit,
  CheckCircle2,
  FileText,
  Loader2,
  MessageSquare,
  Satellite,
  Send,
  UploadCloud,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { type RagChunk, type RagSource } from "@/lib/rag";
import { getSampleChunks, sampleDocuments } from "@/lib/sample-documents";

type UploadedDocument = {
  id: string;
  name: string;
  size?: number;
  chunkCount: number;
  chunks: RagChunk[];
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: RagSource[];
  model?: string;
  warning?: string;
};

type ApiStatus = {
  groqConfigured: boolean;
  openAIConfigured: boolean;
  groqModel: string;
  embeddingModel: string;
};

const sampleChunks = getSampleChunks();

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [useSamples, setUseSamples] = useState(true);
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [question, setQuestion] = useState("Como satélites ajudam no monitoramento de desastres naturais?");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Envie documentos ou use a base de exemplo e pergunte sobre clima, satélites, agricultura inteligente, monitoramento ambiental ou exploração espacial.",
      sources: sampleChunks.slice(0, 2).map((chunk) => ({
        id: chunk.id,
        documentName: chunk.documentName,
        text: chunk.text,
        score: 1,
      })),
    },
  ]);
  const [isUploading, setIsUploading] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<ApiStatus | null>(null);

  const allChunks = useMemo(
    () => [...(useSamples ? sampleChunks : []), ...documents.flatMap((document) => document.chunks)],
    [documents, useSamples],
  );

  const totalSources = (useSamples ? sampleDocuments.length : 0) + documents.length;

  useEffect(() => {
    fetch("/api/status")
      .then((response) => response.json())
      .then(setApiStatus)
      .catch(() => setApiStatus(null));
  }, []);

  async function handleUpload(files: FileList | null) {
    if (!files?.length) {
      return;
    }

    setIsUploading(true);
    setStatus(null);

    const formData = new FormData();
    Array.from(files).forEach((file) => formData.append("files", file));

    try {
      const response = await fetch("/api/ingest", {
        method: "POST",
        body: formData,
      });
      const payload = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(payload.error ?? "Falha ao processar arquivo.");
      }

      setDocuments((current) => [...current, ...payload.documents]);
      const warning = payload.warnings?.length ? ` Aviso: ${payload.warnings.join(" ")}` : "";
      setStatus(`${payload.documents.length} documento(s) indexado(s) com sucesso.${warning}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Falha ao processar arquivo.");
    } finally {
      setIsUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  async function handleAsk(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const currentQuestion = question.trim();

    if (!currentQuestion || isAsking) {
      return;
    }

    setIsAsking(true);
    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role: "user",
        content: currentQuestion,
      },
    ]);

    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: currentQuestion, chunks: allChunks }),
      });
      const payload = await readJsonResponse(response);

      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            payload.answer ??
            "Não consegui gerar a resposta agora, mas estes são os trechos mais relevantes recuperados.",
          sources: payload.sources,
          model: payload.model,
          warning: response.ok ? undefined : payload.error,
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Não foi possível consultar a API agora.",
          warning: error instanceof Error ? error.message : "Erro desconhecido.",
        },
      ]);
    } finally {
      setIsAsking(false);
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#080d14] text-slate-100">
      <div className="pointer-events-none fixed inset-0 opacity-70">
        <div className="absolute left-[-10%] top-20 h-[520px] w-[520px] rounded-full border border-cyan-300/10" />
        <div className="absolute right-[-12%] top-[-10%] h-[720px] w-[720px] rounded-full border border-cyan-300/10" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent" />
      </div>

      <section className="relative grid min-h-screen grid-cols-1 lg:grid-cols-[360px_1fr]">
        <aside className="border-b border-white/10 bg-[#0b111b]/95 p-5 lg:border-b-0 lg:border-r">
          <div className="mb-7 flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-lg bg-cyan-400 text-slate-950">
              <Satellite size={24} strokeWidth={2.2} />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-normal">GS Generative AI - 1S 2026</h1>
              <p className="text-sm text-slate-400">Assistente RAG espacial</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="group grid w-full place-items-center rounded-lg border border-dashed border-cyan-300/35 bg-cyan-300/[0.06] px-5 py-7 text-center transition hover:border-cyan-300/80 hover:bg-cyan-300/[0.1]"
          >
            <input
              ref={inputRef}
              type="file"
              multiple
              accept=".pdf,.txt,.docx,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={(event) => handleUpload(event.target.files)}
            />
            {isUploading ? (
              <Loader2 className="mb-3 animate-spin text-cyan-200" size={30} />
            ) : (
              <UploadCloud className="mb-3 text-cyan-200" size={30} />
            )}
            <span className="text-sm font-semibold">Upload de PDF, TXT ou DOCX</span>
            <span className="mt-1 text-xs leading-5 text-slate-400">
              O texto será extraído, dividido em chunks e indexado em vetores semânticos.
            </span>
          </button>

          {status ? (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-white/10 bg-white/[0.04] p-3 text-xs text-slate-300">
              <AlertCircle className="mt-0.5 shrink-0 text-amber-300" size={15} />
              <span>{status}</span>
            </div>
          ) : null}

          <div className="mt-6 rounded-lg border border-white/10 bg-white/[0.035] p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <BrainCircuit size={17} className="text-cyan-200" />
                Base vetorial
              </div>
              <span className="rounded-md bg-emerald-300/10 px-2 py-1 text-xs text-emerald-200">
                {allChunks.length} chunks
              </span>
            </div>
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md bg-slate-950/40 p-3 text-sm">
              <span>Usar documentos de exemplo</span>
              <input
                checked={useSamples}
                onChange={(event) => setUseSamples(event.target.checked)}
                type="checkbox"
                className="h-4 w-4 accent-cyan-300"
              />
            </label>
          </div>

          <div className="mt-5">
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="font-semibold">Documentos carregados</span>
              <span className="text-slate-400">{totalSources} fontes</span>
            </div>
            <div className="space-y-2">
              {useSamples
                ? sampleDocuments.map((document) => (
                    <DocumentRow key={document.id} name={document.name} chunkCount={1} variant="sample" />
                  ))
                : null}
              {documents.map((document) => (
                <DocumentRow
                  key={document.id}
                  name={document.name}
                  chunkCount={document.chunkCount}
                  size={document.size}
                  variant="upload"
                />
              ))}
            </div>
          </div>
        </aside>

        <section className="flex min-h-screen flex-col p-4 sm:p-6 lg:p-8">
          <header className="mb-5 grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <h2 className="max-w-3xl text-3xl font-semibold leading-tight tracking-normal sm:text-4xl">
                Pergunte aos documentos da nova economia espacial.
              </h2>
            </div>
            <div
              className={`rounded-lg border px-4 py-3 text-sm ${
                apiStatus?.groqConfigured && apiStatus.openAIConfigured
                  ? "border-emerald-200/25 bg-emerald-200/10 text-emerald-100"
                  : "border-amber-200/25 bg-amber-200/10 text-amber-100"
              }`}
            >
              <div className="flex items-center gap-2 font-semibold">
                {apiStatus?.groqConfigured && apiStatus.openAIConfigured ? (
                  <CheckCircle2 size={16} />
                ) : (
                  <AlertCircle size={16} />
                )}
                APIs
              </div>
              <p className="mt-1 text-xs opacity-75">
                {apiStatus?.groqConfigured && apiStatus.openAIConfigured
                  ? "Groq e OpenAI configuradas para geração e embeddings."
                  : "Configure Groq e OpenAI no .env.local para a demo completa."}
              </p>
            </div>
          </header>

          <div className="grid flex-1 gap-4 xl:grid-cols-[1fr_360px]">
            <section className="flex min-h-[560px] flex-col rounded-lg border border-white/10 bg-[#0d1420]/90 shadow-2xl shadow-black/25">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <MessageSquare size={17} className="text-cyan-200" />
                  Chat RAG
                </div>
                <span className="text-xs text-slate-400">Groq Llama 70B + recuperação semântica</span>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto p-4">
                {messages.map((message) => (
                  <ChatBubble key={message.id} message={message} />
                ))}
                {isAsking ? (
                  <div className="flex items-center gap-2 text-sm text-cyan-100">
                    <Loader2 className="animate-spin" size={16} />
                    Recuperando contexto e consultando o modelo...
                  </div>
                ) : null}
              </div>

              <form onSubmit={handleAsk} className="border-t border-white/10 p-4">
                <div className="flex gap-3">
                  <input
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    className="h-12 min-w-0 flex-1 rounded-lg border border-white/10 bg-slate-950/70 px-4 text-sm outline-none transition placeholder:text-slate-500 focus:border-cyan-300/70"
                    placeholder="Digite uma pergunta sobre os documentos..."
                  />
                  <button
                    disabled={isAsking || !question.trim()}
                    className="inline-flex h-12 items-center gap-2 rounded-lg bg-cyan-300 px-5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
                    type="submit"
                  >
                    <Send size={17} />
                    Perguntar
                  </button>
                </div>
              </form>
            </section>

            <aside className="rounded-lg border border-white/10 bg-[#0d1420]/80 p-4">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
                <CheckCircle2 size={17} className="text-emerald-300" />
                Fluxo implementado
              </div>
              <div className="space-y-3 text-sm text-slate-300">
                {[
                  "Extração de texto: PDF, TXT e DOCX",
                  "Chunking com sobreposição",
                  apiStatus?.openAIConfigured
                    ? `Embeddings OpenAI (${apiStatus.embeddingModel})`
                    : "Embeddings locais por hashing vetorial",
                  "Vector store em memória no navegador",
                  "Busca por similaridade cosseno",
                  "Resposta generativa via Groq API",
                ].map((item) => (
                  <div key={item} className="flex gap-3 rounded-md bg-white/[0.035] p-3">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-cyan-300" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </section>
      </section>
    </main>
  );
}

function DocumentRow({
  name,
  chunkCount,
  size,
  variant,
}: {
  name: string;
  chunkCount: number;
  size?: number;
  variant: "sample" | "upload";
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-3">
      <FileText className={variant === "sample" ? "text-cyan-200" : "text-emerald-200"} size={18} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="mt-1 text-xs text-slate-400">
          {chunkCount} chunk(s){size ? ` - ${Math.round(size / 1024)} KB` : " - exemplo"}
        </p>
      </div>
    </div>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isAssistant = message.role === "assistant";

  return (
    <article className={`flex ${isAssistant ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-3xl rounded-lg border p-4 ${
          isAssistant
            ? "border-white/10 bg-white/[0.045] text-slate-100"
            : "border-cyan-300/30 bg-cyan-300/10 text-cyan-50"
        }`}
      >
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
          {isAssistant ? <Bot size={14} /> : <MessageSquare size={14} />}
          {isAssistant ? "Assistente" : "Você"}
          {message.model ? <span className="normal-case tracking-normal text-cyan-200">{message.model}</span> : null}
        </div>
        {message.warning ? (
          <div className="mb-3 rounded-md border border-amber-200/25 bg-amber-200/10 p-3 text-sm text-amber-100">
            {message.warning}
          </div>
        ) : null}
        <p className="whitespace-pre-wrap text-sm leading-7">{message.content}</p>
        {message.sources?.length ? (
          <div className="mt-4 grid gap-2">
            {message.sources.map((source, index) => (
              <div key={source.id} className="rounded-md border border-white/10 bg-slate-950/45 p-3">
                <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                  <span className="font-semibold text-cyan-100">
                    Fonte {index + 1}: {source.documentName}
                  </span>
                  <span className="text-slate-500">{source.score.toFixed(3)}</span>
                </div>
                <p className="line-clamp-3 text-xs leading-5 text-slate-400">{source.text}</p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}

async function readJsonResponse(response: Response) {
  const text = await response.text();

  if (!text) {
    return { error: "A API não retornou conteúdo. Tente um arquivo menor ou verifique o terminal do servidor." };
  }

  try {
    return JSON.parse(text);
  } catch {
    return { error: text.slice(0, 240) || "Resposta inválida da API." };
  }
}
