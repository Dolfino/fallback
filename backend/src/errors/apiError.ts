import type { RemoteApiError } from "../../../src/application/remoteContracts";

export class ApiError extends Error {
  statusCode: number;
  code: RemoteApiError["error"]["code"];
  operation: string;
  retryable: boolean;
  context?: RemoteApiError["error"]["context"];

  constructor(params: {
    statusCode: number;
    code: RemoteApiError["error"]["code"];
    message: string;
    operation: string;
    retryable?: boolean;
    context?: RemoteApiError["error"]["context"];
  }) {
    super(params.message);
    this.name = "ApiError";
    this.statusCode = params.statusCode;
    this.code = params.code;
    this.operation = params.operation;
    this.retryable = params.retryable ?? false;
    this.context = params.context;
  }
}

export function createErrorEnvelope(error: ApiError, requestId: string): RemoteApiError {
  return {
    ok: false,
    meta: {
      requestId,
      issuedAt: new Date().toISOString(),
    },
    error: {
      code: error.code,
      message: error.message,
      operation: error.operation,
      retryable: error.retryable,
      context: error.context,
    },
  };
}
