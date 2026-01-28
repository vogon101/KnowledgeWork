import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Sidebar } from "@/components/sidebar";
import { CommandPalette } from "@/components/command-palette";
import { GlobalFileSearch } from "@/components/file-search-command";
import { AIContentNotifier } from "@/components/ai-content-notifier";
import { Toaster } from "@/components/ui/sonner";
import { FileWatcherProvider } from "@/components/file-watcher-provider";
import { TerminalProvider } from "@/components/terminal-sidebar";
import { QuickNotesProvider } from "@/components/quick-notes-provider";
import { QuickNotes } from "@/components/quick-notes";
import { AIPromptProvider } from "@/components/ai-prompt-dialog";
import { GlobalAddTask } from "@/components/global-add-task";
import { ToastProvider } from "@/components/toast";
import { TRPCProvider } from "@/components/trpc-provider";
import { TaskModalProvider } from "@/components/task-modal-context";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Knowledge Work",
  description: "Personal knowledge management dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground font-sans`}
      >
        <TRPCProvider>
          <ToastProvider>
            <FileWatcherProvider>
              <QuickNotesProvider>
                <TerminalProvider>
                  <AIPromptProvider>
                    <TaskModalProvider>
                      <CommandPalette />
                      <GlobalFileSearch />
                      <AIContentNotifier />
                      <Toaster position="bottom-right" />
                      <Sidebar />
                      <main className="ml-52 bg-zinc-900">
                        {children}
                      </main>
                      <GlobalAddTask />
                      <QuickNotes />
                    </TaskModalProvider>
                  </AIPromptProvider>
                </TerminalProvider>
              </QuickNotesProvider>
            </FileWatcherProvider>
          </ToastProvider>
        </TRPCProvider>
      </body>
    </html>
  );
}
