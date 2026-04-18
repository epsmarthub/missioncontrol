import type { Metadata } from "next";
import { Press_Start_2P, VT323 } from "next/font/google";
import "./globals.css";
import { MissionControlProvider } from "@/components/mission-control-provider";
import { createDemoSnapshot } from "@/lib/demo-data";
import { hasDatabase } from "@/lib/env";
import { getMissionControlSnapshotFromDb } from "@/lib/server/missioncontrol-db";

const retroHeading = Press_Start_2P({
  variable: "--font-retro-heading",
  subsets: ["latin"],
  weight: "400",
});

const retroMono = VT323({
  variable: "--font-retro-mono",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "MissionControl",
  description: "MissionControl retro SNES para tareas, agentes y supervision",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialSnapshot = hasDatabase
    ? await getMissionControlSnapshotFromDb()
    : createDemoSnapshot();

  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${retroHeading.variable} ${retroMono.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="min-h-full">
        <MissionControlProvider initialSnapshot={initialSnapshot}>
          {children}
        </MissionControlProvider>
      </body>
    </html>
  );
}
