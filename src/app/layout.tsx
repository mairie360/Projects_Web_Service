import type { Metadata } from "next";
import "@mairie360/lib-components/dist/styles.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Projets | Mairie360",
  description: "Module de gestion des projets municipaux.",
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
        <main>{children}</main>
      </body>
    </html>
  );
}
