# GS Generative AI - 1S 2026
- Lucca Phelipe Masini (RM 564121)
- Igor Paixão Sarak (RM 563726)
- Bernardo Braga Perobeli (RM 562468)

Assistente inteligente com arquitetura RAG para responder perguntas sobre documentos e dados da nova economia espacial: clima, satélites, agricultura inteligente, monitoramento ambiental, desastres naturais e exploração espacial.

## Funcionalidades

- Interface web em Next.js para upload de documentos e chat.
- Leitura de arquivos `PDF`, `TXT` e `DOCX`.
- Chunking de texto com sobreposição.
- Embeddings OpenAI para uploads, com fallback local por hashing vetorial.
- Vector store em memória no navegador para demonstração.
- Busca semântica por similaridade cosseno.
- Respostas generativas com Groq API e modelo Llama 70B.
- Documentos de exemplo embutidos para demo imediata.

## Como executar

```bash
npm install
npm run dev
```

Acesse `http://localhost:3000`.

## Variáveis de ambiente

Crie um arquivo `.env.local`:

```bash
GROQ_API_KEY=sua_chave_groq
GROQ_MODEL=llama-3.3-70b-versatile
OPENAI_API_KEY=sua_chave_openai
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

Sem `GROQ_API_KEY`, a aplicação ainda executa a recuperação semântica e mostra as fontes recuperadas, mas informa que a chave da Groq precisa ser configurada para gerar a resposta final. Sem `OPENAI_API_KEY`, os embeddings usam fallback local determinístico.

## Fluxo RAG

1. O usuário carrega documentos ou usa a base de exemplo.
2. A rota `/api/ingest` extrai texto de PDF, TXT ou DOCX.
3. O texto é normalizado e dividido em chunks.
4. Cada chunk recebe embedding OpenAI quando configurado, ou embedding local determinístico como fallback.
5. A pergunta do usuário também vira embedding.
6. A aplicação recupera os chunks mais similares.
7. A rota `/api/ask` envia pergunta e contexto recuperado ao modelo Groq.
8. A resposta é exibida com as fontes usadas.

## Documentos oficiais NASA/NOAA

Para uma demonstração mais completa, adicione PDFs ou textos oficiais em uma pasta local, por exemplo `data/external-docs`, e envie esses arquivos pela interface.

Sugestões de fontes:

- NASA Earthdata
- NASA Technical Reports Server
- NOAA Climate.gov
- Relatórios ambientais e climáticos públicos

## Scripts

```bash
npm run dev
npm run build
npm run lint
```

## Entregáveis

- Aplicação funcional.
- Repositório organizado.
- Documento técnico em `docs/documento-tecnico.md`.
- Documento técnico em PDF em `docs/documento-tecnico.pdf`.
- Roteiro do vídeo demonstrativo em `docs/roteiro-video.md`.
