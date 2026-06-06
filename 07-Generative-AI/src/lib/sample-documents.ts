import { createChunks } from "@/lib/rag";

export const sampleDocuments = [
  {
    id: "sample-climate",
    name: "Clima espacial e observação da Terra.txt",
    text: "Satélites de observação da Terra combinam sensores ópticos, radar e infravermelho para acompanhar temperatura da superfície, cobertura de nuvens, queimadas e mudanças no uso do solo. Em um fluxo RAG, relatórios climáticos podem ser indexados para responder perguntas sobre risco ambiental, eventos extremos e tendências regionais com base em evidências recuperadas.",
  },
  {
    id: "sample-satellites",
    name: "Satélites e conectividade orbital.txt",
    text: "A nova economia espacial usa constelações de pequenos satélites para comunicação, internet de baixa latência, navegação e sensoriamento remoto. Dados orbitais ajudam governos e empresas a monitorar infraestrutura crítica, prever falhas e apoiar respostas rápidas a desastres naturais.",
  },
  {
    id: "sample-agriculture",
    name: "Agricultura inteligente com dados espaciais.txt",
    text: "A agricultura inteligente utiliza imagens de satélite, índices de vegetação e modelos meteorológicos para estimar saúde das lavouras, necessidade de irrigação, estresse hídrico e produtividade. Assistentes generativos com RAG podem explicar recomendações agronômicas citando mapas, boletins e documentos técnicos.",
  },
  {
    id: "sample-disasters",
    name: "Monitoramento ambiental e desastres.txt",
    text: "Em enchentes, secas, queimadas e deslizamentos, dados espaciais permitem detectar áreas afetadas, comparar imagens antes e depois do evento e orientar equipes de defesa civil. Um assistente RAG reduz alucinações ao recuperar trechos relevantes antes de gerar uma resposta em linguagem natural.",
  },
  {
    id: "sample-exploration",
    name: "Exploração espacial e pesquisa.txt",
    text: "Missões de exploração espacial produzem documentos sobre trajetórias, instrumentação, geologia planetária, radiação e habitabilidade. Consultar esses documentos com busca vetorial permite que estudantes encontrem rapidamente conceitos e limitações sem ler relatórios extensos por completo.",
  },
];

export function getSampleChunks() {
  return sampleDocuments.flatMap((document) =>
    createChunks(document.id, document.name, document.text),
  );
}
