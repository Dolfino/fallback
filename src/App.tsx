import { AppShell } from "./components/layout/AppShell";
import { usePlannerState } from "./hooks/usePlannerState";
import { capitalize, formatDateLong } from "./utils/format";
import { BlockingsPage } from "./pages/BlockingsPage";
import { CapacityPage } from "./pages/CapacityPage";
import { DailyClosingPage } from "./pages/DailyClosingPage";
import { AgendasPage } from "./pages/AgendasPage";
import { NewWorkPage } from "./pages/NewWorkPage";
import { RequestsPage } from "./pages/RequestsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { TodayPage } from "./pages/TodayPage";
import { WeekPage } from "./pages/WeekPage";
import { WorkDetailPage } from "./pages/WorkDetailPage";
import { WorksPage } from "./pages/WorksPage";

function renderPage(controller: ReturnType<typeof usePlannerState>) {
  switch (controller.activeView) {
    case "today":
      return <TodayPage controller={controller} />;
    case "week":
      return <WeekPage controller={controller} />;
    case "agendas":
      return <AgendasPage controller={controller} />;
    case "works":
      return <WorksPage controller={controller} />;
    case "requests":
      return <RequestsPage controller={controller} />;
    case "blockings":
      return <BlockingsPage controller={controller} />;
    case "capacity":
      return <CapacityPage controller={controller} />;
    case "closing":
      return <DailyClosingPage controller={controller} />;
    case "new-work":
      return <NewWorkPage controller={controller} />;
    case "work-detail":
      return <WorkDetailPage controller={controller} />;
    case "settings":
      return <SettingsPage />;
    default:
      return null;
  }
}

export default function App() {
  const controller = usePlannerState();
  const currentDateLabel = capitalize(formatDateLong(controller.selectedDate));
  const shortcutHint =
    controller.activeView === "today" || controller.activeView === "week" || controller.activeView === "agendas"
      ? "C concluir · P parcial · B bloquear · J/K navegar · O próximo foco · D painel"
      : controller.activeView === "closing"
        ? "J/K navegar · O próximo foco · D painel"
        : undefined;

  return (
    <AppShell
      activeView={controller.activeView}
      currentDateLabel={currentDateLabel}
      feedback={controller.systemFeedback}
      operationState={{
        pending: controller.pendingOperation,
        error: controller.operationError,
      }}
      onDismissOperationError={controller.dismissOperationError}
      onNavigate={controller.navigate}
      onPrimaryAction={(view) => controller.navigate(view)}
      onRetryOperation={controller.retryLastOperation}
      onShiftDate={controller.shiftDate}
      shortcutHint={shortcutHint}
    >
      {renderPage(controller)}
    </AppShell>
  );
}
