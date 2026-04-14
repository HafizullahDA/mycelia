type LogLevel = 'info' | 'warn' | 'error';

type RequestLogContext = {
  requestId: string;
  route: string;
  startedAt: number;
};

type LogPayload = Record<string, unknown>;

const safeError = (error: unknown): Record<string, unknown> => {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    };
  }

  return {
    message: 'Unknown error',
  };
};

const emitLog = (level: LogLevel, event: string, payload: LogPayload) => {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    app: 'myCELIA',
    ...payload,
  };

  const serialized = JSON.stringify(entry);

  if (level === 'error') {
    console.error(serialized);
    return;
  }

  if (level === 'warn') {
    console.warn(serialized);
    return;
  }

  console.info(serialized);
};

export const createRequestLogContext = (route: string, request?: Request): RequestLogContext => ({
  requestId: request?.headers.get('x-request-id')?.trim() || crypto.randomUUID(),
  route,
  startedAt: Date.now(),
});

export const logRequestInfo = (
  context: RequestLogContext,
  event: string,
  payload: LogPayload = {},
) => {
  emitLog('info', event, {
    requestId: context.requestId,
    route: context.route,
    ...payload,
  });
};

export const logRequestWarn = (
  context: RequestLogContext,
  event: string,
  payload: LogPayload = {},
) => {
  emitLog('warn', event, {
    requestId: context.requestId,
    route: context.route,
    ...payload,
  });
};

export const logRequestError = (
  context: RequestLogContext,
  event: string,
  error: unknown,
  payload: LogPayload = {},
) => {
  emitLog('error', event, {
    requestId: context.requestId,
    route: context.route,
    ...payload,
    error: safeError(error),
  });
};

export const getRequestDurationMs = (context: RequestLogContext): number =>
  Date.now() - context.startedAt;
