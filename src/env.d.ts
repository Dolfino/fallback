/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PLANNER_ADAPTER?: "local" | "remote";
  readonly VITE_PLANNER_API_BASE_URL?: string;
  readonly VITE_PLANNER_API_TIMEOUT_MS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
