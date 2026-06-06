import mammoth from "mammoth";
import { createRequire } from "module";
import { NextResponse } from "next/server";
import { createChunksWithEmbeddings, normalizeText, type RagChunk } from "@/lib/rag";

export const runtime = "nodejs";
export const maxDuration = 60;

const require = createRequire(import.meta.url);
type PdfParse = (buffer: Buffer) => Promise<{ text: string }>;

type IngestedDocument = {
  id: string;
  name: string;
  size: number;
  chunkCount: number;
  chunks: RagChunk[];
};

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files").filter((item): item is File => item instanceof File);

    if (!files.length) {
      return NextResponse.json({ error: "Envie ao menos um arquivo PDF, TXT ou DOCX." }, { status: 400 });
    }

    const documents: IngestedDocument[] = [];
    const errors: string[] = [];

    for (const file of files) {
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const text = normalizeText(await extractText(file, buffer));

        if (!text) {
          errors.push(`${file.name}: nenhum texto extraível encontrado.`);
          continue;
        }

        const documentId = `upload-${Date.now()}-${documents.length + 1}`;
        const chunks = await createChunksWithEmbeddings(documentId, file.name, text);

        documents.push({
          id: documentId,
          name: file.name,
          size: file.size,
          chunkCount: chunks.length,
          chunks,
        });
      } catch (error) {
        errors.push(`${file.name}: ${error instanceof Error ? error.message : "falha ao processar arquivo."}`);
      }
    }

    if (!documents.length) {
      return NextResponse.json(
        {
          error: errors.length
            ? errors.join(" ")
            : "Não foi possível extrair texto dos arquivos enviados.",
        },
        { status: 422 },
      );
    }

    return NextResponse.json({ documents, warnings: errors });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Falha inesperada ao processar o upload.",
      },
      { status: 500 },
    );
  }
}

async function extractText(file: File, buffer: Buffer) {
  const name = file.name.toLowerCase();

  if (name.endsWith(".txt") || file.type === "text/plain") {
    return buffer.toString("utf-8");
  }

  if (name.endsWith(".docx")) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    const pdfParse = require("pdf-parse/lib/pdf-parse.js") as PdfParse;
    const result = await pdfParse(buffer);
    return result.text;
  }

  throw new Error(`Formato não suportado: ${file.name}`);
}
