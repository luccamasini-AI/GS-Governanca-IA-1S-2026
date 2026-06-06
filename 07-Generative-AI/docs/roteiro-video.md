# Roteiro do vídeo demonstrativo

Tempo máximo: 5 minutos.

## 1. Abertura - 30s

Apresentar o projeto **GS Generative AI - 1S 2026** como um assistente RAG para documentos da nova economia espacial.

Explicar o problema: documentos técnicos de clima, satélites, agricultura inteligente, monitoramento ambiental e exploração espacial são extensos, e o assistente ajuda a consultar informações com base em fontes recuperadas.

## 2. Arquitetura - 60s

Mostrar o fluxo:

1. Upload ou documentos de exemplo.
2. Extração de texto.
3. Divisão em chunks.
4. Geração de embeddings.
5. Vector store local.
6. Recuperação dos trechos mais similares.
7. Resposta com modelo Groq Llama 70B.

## 3. Demonstração prática - 2min

Abrir a aplicação local.

Mostrar:

- documentos de exemplo carregados;
- upload de um arquivo TXT, PDF ou DOCX;
- pergunta sobre desastres naturais, satélites ou agricultura inteligente;
- resposta gerada;
- fontes recuperadas com trechos e scores.

## 4. Tecnologias - 45s

Citar:

- Next.js, React e TypeScript;
- Tailwind CSS;
- `pdf-parse`;
- `mammoth`;
- embeddings locais;
- Groq API.

## 5. Limitações e melhorias - 45s

Explicar que a versão atual usa vector store em memória e embeddings locais para demonstração. Como melhorias, citar banco vetorial persistente, embeddings especializados, OCR e filtros avançados.
