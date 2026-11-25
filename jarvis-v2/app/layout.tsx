import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "./v2.css";
import '@xterm/xterm/css/xterm.css';
import './agent-work.css';
import './hud-refinements.css';

const display = localFont({
  src: "../public/fonts/big-shoulders-latin.woff2",
  variable: "--font-display",
});

const mono = localFont({
  src: "../public/fonts/martian-mono-latin.woff2",
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Jarvis V2 — Central de comando",
  description: "Central de comando Jarvis V2 com Claude Code e Codex",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={`${display.variable} ${mono.variable}`}>{children}</body>
    </html>
  );
}
