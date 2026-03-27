import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import type { AppView } from "../../types/ui";
import type { SystemFeedback } from "../../types/domain";
import type { PlannerAppOperationError, PlannerAppOperationKind } from "../../application/plannerAppContracts";

interface AppShellProps {
  activeView: AppView;
  currentDateLabel: string;
  feedback: SystemFeedback | null;
  operationState?: {
    pending?: {
      kind: PlannerAppOperationKind;
    } | null;
    error?: PlannerAppOperationError | null;
  };
  shortcutHint?: string;
  onNavigate: (view: AppView) => void;
  onPrimaryAction: (view: "new-work" | "requests") => void;
  onShiftDate: (direction: -1 | 1) => void;
  onRetryOperation?: () => void;
  onDismissOperationError?: () => void;
  children: ReactNode;
}

export function AppShell({
  activeView,
  currentDateLabel,
  feedback,
  operationState,
  shortcutHint,
  onNavigate,
  onPrimaryAction,
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
          operationState={operationState}
          onDismissOperationError={onDismissOperationError}
          onPrimaryAction={onPrimaryAction}
          onRetryOperation={onRetryOperation}
          onShiftDate={onShiftDate}
          shortcutHint={shortcutHint}
        />
        <main className="flex-1 overflow-hidden px-6 pb-6 pt-5">{children}</main>
      </div>
    </div>
  );
}
