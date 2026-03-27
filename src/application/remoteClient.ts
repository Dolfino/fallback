import type { RemoteApiError, RemoteApiResponse } from "./remoteContracts";

export interface RemoteClientConfig {
  baseUrl?: string;
  defaultTimeoutMs?: number;
}

export interface RemoteClientRequest {
  path: string;
  method?: "GET" | "POST" | "PATCH";
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  timeoutMs?: number;
}

export interface RemoteClientFailure {
  ok: false;
  error: RemoteApiError["error"];
  status?: number;
}

export interface RemoteClientSuccess<TData> {
  ok: true;
  data: TData;
  meta: {
    requestId: string;
    issuedAt: string;
  };
  status: number;
}

export type RemoteClientResult<TData> =
  | RemoteClientSuccess<TData>
  | RemoteClientFailure;

function withQuery(path: string, query?: RemoteClientRequest["query"]) {
  if (!query) {
    return path;
  }

  const search = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }

    search.set(key, String(value));
  });

  const serialized = search.toString();
  return serialized ? `${path}?${serialized}` : path;
}

function createTransportError(params: {
  code: RemoteApiError["error"]["code"];
  message: string;
  operation: string;
  retryable: boolean;
  detail?: string;
}): RemoteClientFailure {
  return {
    ok: false,
    error: {
      code: params.code,
      message: params.message,
      operation: params.operation,
      retryable: params.retryable,
      context: params.detail
        ? {
            detail: params.detail,
          }
        : undefined,
    },
  };
}

export function createRemoteClient(config: RemoteClientConfig = {}) {
  const baseUrl = config.baseUrl ?? "";
  const defaultTimeoutMs = config.defaultTimeoutMs ?? 10000;

  return {
    async request<TData>(request: RemoteClientRequest): Promise<RemoteClientResult<TData>> {
      const controller = new AbortController();
      const timeoutId = globalThis.setTimeout(
        () => controller.abort(),
        request.timeoutMs ?? defaultTimeoutMs,
      );

      try {
        const response = await fetch(`${baseUrl}${withQuery(request.path, request.query)}`, {
          method: request.method ?? "GET",
          headers: {
            "Content-Type": "application/json",
          },
          body: request.body ? JSON.stringify(request.body) : undefined,
          signal: controller.signal,
        });

        let payload: RemoteApiResponse<TData> | null = null;

        try {
          payload = (await response.json()) as RemoteApiResponse<TData>;
        } catch {
          return createTransportError({
            code: "internal_error",
            message: "Resposta inválida da API.",
            operation: request.path,
            retryable: false,
            detail: "O servidor respondeu com payload não compatível com JSON.",
          });
        }

        if (!payload || typeof payload !== "object" || !("ok" in payload)) {
          return createTransportError({
            code: "internal_error",
            message: "Envelope remoto inválido.",
            operation: request.path,
            retryable: false,
          });
        }

        if (!payload.ok) {
          return {
            ok: false,
            error: payload.error,
            status: response.status,
          };
        }

        return {
          ok: true,
          data: payload.data,
          meta: payload.meta,
          status: response.status,
        };
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return createTransportError({
            code: "temporarily_unavailable",
            message: "A API demorou além do esperado.",
            operation: request.path,
            retryable: true,
            detail: "A operação excedeu o tempo limite configurado.",
          });
        }

        return createTransportError({
          code: "temporarily_unavailable",
          message: "Falha de rede ao chamar a API.",
          operation: request.path,
          retryable: true,
          detail: error instanceof Error ? error.message : "Erro de transporte desconhecido.",
        });
      } finally {
        globalThis.clearTimeout(timeoutId);
      }
    },
  };
}
