import type { Metadata } from "next";
import { readFrontUrlsFromEnv } from "@/lib/front-urls";
import { FrontUrlsProvider } from "@/lib/front-urls-provider";
import "@mairie360/lib-components/dist/styles.css";
import "./globals.css";

// Rendu à la demande obligatoire : une page prérendue au build ne porterait pas le
// nonce CSP propre à chaque requête, et ses scripts seraient bloqués.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Projets | Mairie360",
  description: "Module de gestion des projets municipaux.",
  icons: {
    icon: [
      { url: "/favicon.ico?v=8dd52d5111b8", sizes: "192x192", type: "image/x-icon" },
      { url: "/mairie360-favicon.png?v=8dd52d5111b8", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/mairie360-logo.png?v=8dd52d5111b8", sizes: "192x192", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" data-theme="light">
      <head>
        <meta name="apple-mobile-web-app-title" content="Mairie360" />
      </head>
      <body>
        <main><FrontUrlsProvider urls={readFrontUrlsFromEnv()}>{children}</FrontUrlsProvider></main>
      </body>
    </html>
  );
}
