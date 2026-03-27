import { useEffect, useState, type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import type { AppView } from "../../types/ui";
import type { SystemFeedback } from "../../types/domain";
import type { PlannerAppOperationError, PlannerAppOperationKind } from "../../application/plannerAppContracts";
import type { PlannerGlobalSearchResult } from "../../domain/plannerSearch";

interface AppShellProps {
  activeView: AppView;
  currentDateLabel: string;
  feedback: SystemFeedback | null;
  searchQuery: string;
  searchResults: PlannerGlobalSearchResult[];
  operationState?: {
    pending?: {
      kind: PlannerAppOperationKind;
    } | null;
    error?: PlannerAppOperationError | null;
  };
  shortcutHint?: string;
  onNavigate: (view: AppView) => void;
  onPrimaryAction: (view: "new-work" | "requests") => void;
  onSearchQueryChange: (value: string) => void;
  onSearchResultOpen: (result: PlannerGlobalSearchResult) => void;
  onShiftDate: (direction: -1 | 1) => void;
  onRetryOperation?: () => void;
  onDismissOperationError?: () => void;
  children: ReactNode;
}

export function AppShell({
  activeView,
  currentDateLabel,
  feedback,
  searchQuery,
  searchResults,
  operationState,
  shortcutHint,
  onNavigate,
  onPrimaryAction,
  onSearchQueryChange,
  onSearchResultOpen,
  onShiftDate,
  onRetryOperation,
  onDismissOperationError,
  children,
}: AppShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="relative flex min-h-screen bg-canvas text-ink">
      {isSidebarOpen ? (
        <button
          aria-label="Fechar menu lateral"
          className="fixed inset-0 z-30 bg-shell/30 backdrop-blur-[2px]"
          onClick={() => setIsSidebarOpen(false)}
          type="button"
        />
      ) : null}

      <Sidebar
        activeView={activeView}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onNavigate={onNavigate}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          currentDateLabel={currentDateLabel}
          feedback={feedback}
          searchQuery={searchQuery}
          searchResults={searchResults}
          sidebarOpen={isSidebarOpen}
          operationState={operationState}
          onDismissOperationError={onDismissOperationError}
          onPrimaryAction={onPrimaryAction}
          onSearchQueryChange={onSearchQueryChange}
          onSearchResultOpen={onSearchResultOpen}
          onRetryOperation={onRetryOperation}
          onToggleSidebar={() => setIsSidebarOpen((current) => !current)}
          onShiftDate={onShiftDate}
          shortcutHint={shortcutHint}
        />
        <main className="flex-1 overflow-hidden px-6 pb-6 pt-5">{children}</main>
      </div>
    </div>
  );
}
