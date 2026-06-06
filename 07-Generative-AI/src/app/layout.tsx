import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GS Generative AI - 1S 2026",
  description: "Assistente RAG para dados e documentos da nova economia espacial.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
