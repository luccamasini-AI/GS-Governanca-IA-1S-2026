export type RagChunk = {
  id: string;
  documentId: string;
  documentName: string;
  text: string;
  embedding: number[];
  embeddingProvider?: "local" | "openai";
  embeddingModel?: string;
};

export type RagSource = {
  id: string;
  documentName: string;
  text: string;
  score: number;
};

const VECTOR_SIZE = 384;
const STOP_WORDS = new Set([
  "a",
  "as",
  "ao",
  "aos",
  "com",
  "da",
  "das",
  "de",
  "do",
  "dos",
  "e",
  "em",
  "na",
  "nas",
  "no",
  "nos",
  "o",
  "os",
  "para",
  "por",
  "que",
  "um",
  "uma",
]);

export function normalizeText(text: string) {
  return text
    .replace(/\s+/g, " ")
    .replace(/\u0000/g, "")
    .trim();
}

export function chunkText(text: string, maxChars = 900, overlap = 160) {
  const cleanText = normalizeText(text);

  if (!cleanText) {
    return [];
  }

  const sentences = cleanText.match(/[^.!?]+[.!?]+|\S.+$/g) ?? [cleanText];
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    const next = `${current} ${sentence}`.trim();

    if (next.length > maxChars && current) {
      chunks.push(current);
      current = current.slice(Math.max(0, current.length - overlap));
      current = `${current} ${sentence}`.trim();
    } else {
      current = next;
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

export function createChunks(documentId: string, documentName: string, text: string) {
  return chunkText(text).map((chunk, index) => ({
    id: `${documentId}-${index + 1}`,
    documentId,
    documentName,
    text: chunk,
    embedding: embedText(chunk),
    embeddingProvider: "local" as const,
    embeddingModel: "local-hashing-vector",
  }));
}

export async function createChunksWithEmbeddings(documentId: string, documentName: string, text: string) {
  const chunks = chunkText(text);

  if (!process.env.OPENAI_API_KEY) {
    return createChunks(documentId, documentName, text);
  }

  try {
    const model = process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";
    const embeddings = await createOpenAIEmbeddings(chunks, model);

    return chunks.map((chunk, index) => ({
      id: `${documentId}-${index + 1}`,
      documentId,
      documentName,
      text: chunk,
      embedding: embeddings[index],
      embeddingProvider: "openai" as const,
      embeddingModel: model,
    }));
  } catch (error) {
    console.warn("OpenAI embeddings unavailable; falling back to local vectors.", error);
    return createChunks(documentId, documentName, text);
  }
}

export async function retrieveRelevantChunks(question: string, chunks: RagChunk[], limit = 5) {
  const localQuestionEmbedding = embedText(question);
  const openAIQuestionEmbedding =
    process.env.OPENAI_API_KEY && chunks.some((chunk) => chunk.embeddingProvider === "openai")
      ? await createOpenAIEmbeddings([question], process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small")
          .then(([embedding]) => embedding)
          .catch(() => null)
      : null;

  return chunks
    .map((chunk) => {
      const questionEmbedding =
        chunk.embeddingProvider === "openai" && openAIQuestionEmbedding ? openAIQuestionEmbedding : localQuestionEmbedding;

      return {
        id: chunk.id,
        documentName: chunk.documentName,
        text: chunk.text,
        score: cosineSimilarity(questionEmbedding, chunk.embedding),
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

async function createOpenAIEmbeddings(input: string[], model: string) {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, input }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI embeddings failed with status ${response.status}`);
  }

  const payload = (await response.json()) as {
    data: Array<{ embedding: number[]; index: number }>;
  };

  return payload.data.sort((a, b) => a.index - b.index).map((item) => item.embedding);
}

export function embedText(text: string) {
  const vector = new Array<number>(VECTOR_SIZE).fill(0);
  const tokens = tokenize(text);

  for (const token of tokens) {
    const index = Math.abs(hashToken(token)) % VECTOR_SIZE;
    const sign = hashToken(`${token}:sign`) % 2 === 0 ? 1 : -1;
    vector[index] += sign * tokenWeight(token);
  }

  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));

  if (!magnitude) {
    return vector;
  }

  return vector.map((value) => Number((value / magnitude).toFixed(6)));
}

function tokenize(text: string) {
  return normalizeText(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .match(/[a-z0-9]+/g)
    ?.filter((token) => token.length > 2 && !STOP_WORDS.has(token)) ?? [];
}

function tokenWeight(token: string) {
  if (token.length > 9) {
    return 1.4;
  }

  if (token.length > 5) {
    return 1.15;
  }

  return 1;
}

function cosineSimilarity(a: number[], b: number[]) {
  let dot = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let index = 0; index < Math.min(a.length, b.length); index += 1) {
    dot += a[index] * b[index];
    magnitudeA += a[index] * a[index];
    magnitudeB += b[index] * b[index];
  }

  if (!magnitudeA || !magnitudeB) {
    return 0;
  }

  return dot / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
}

function hashToken(token: string) {
  let hash = 2166136261;

  for (let index = 0; index < token.length; index += 1) {
    hash ^= token.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash;
}
