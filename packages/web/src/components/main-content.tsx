"use client";

import { useTerminal, TerminalSidebar } from "./terminal-sidebar";

export function MainContent({ children }: { children: React.ReactNode }) {
  const {
    sidebarCollapsed,
    layoutMode,
    activeTab,
    isOpen,
    close,
    width,
    setWidth,
    promptToSend,
    clearPrompt,
  } = useTerminal();

  const sidebarMargin = sidebarCollapsed ? "ml-14" : "ml-52";
  const isTabbedTerminalVisible = layoutMode === "tabbed" && isOpen && activeTab === "terminal";

  return (
    <div className={`${sidebarMargin} flex h-screen overflow-hidden transition-all duration-200`}>
      {/* Web content */}
      <div
        className="flex-1 flex flex-col min-w-0 overflow-auto bg-zinc-900"
        style={isTabbedTerminalVisible ? { display: "none" } : undefined}
      >
        {children}
      </div>

      {/* Terminal */}
      {layoutMode === "tabbed" ? (
        <div
          className="flex-1 flex flex-col min-w-0"
          style={!isTabbedTerminalVisible ? { display: "none" } : undefined}
        >
          <TerminalSidebar
            isOpen={isOpen}
            onClose={close}
            width={width}
            onWidthChange={setWidth}
            pendingPrompt={promptToSend}
            onPromptConsumed={clearPrompt}
            fillContainer
          />
        </div>
      ) : (
        <TerminalSidebar
          isOpen={isOpen}
          onClose={close}
          width={width}
          onWidthChange={setWidth}
          pendingPrompt={promptToSend}
          onPromptConsumed={clearPrompt}
        />
      )}
    </div>
  );
}
