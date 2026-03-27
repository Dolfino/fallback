import type { ReactNode } from "react";
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
  return (
    <div className="flex min-h-screen bg-canvas text-ink">
      <Sidebar activeView={activeView} onNavigate={onNavigate} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          currentDateLabel={currentDateLabel}
          feedback={feedback}
          searchQuery={searchQuery}
          searchResults={searchResults}
          operationState={operationState}
          onDismissOperationError={onDismissOperationError}
          onPrimaryAction={onPrimaryAction}
          onSearchQueryChange={onSearchQueryChange}
          onSearchResultOpen={onSearchResultOpen}
          onRetryOperation={onRetryOperation}
          onShiftDate={onShiftDate}
          shortcutHint={shortcutHint}
        />
        <main className="flex-1 overflow-hidden px-6 pb-6 pt-5">{children}</main>
      </div>
    </div>
  );
}
