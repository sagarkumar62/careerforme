const SENSITIVE_KEYS = new Set([
  'password',
  'pass',
  'token',
  'accesstoken',
  'refreshtoken',
  'authorization',
  'jwt',
  'user_answers',
  'answers',
  'learner',
  'profile',
  'secret',
  'creditcard',
  'cvv',
]);

export function sanitizeLogContext(data: any): any {
  if (data === null || data === undefined) return data;
  if (typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(sanitizeLogContext);

  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    const lower = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lower)) {
      clean[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      clean[key] = sanitizeLogContext(value);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

export interface StructuredLogMeta {
  requestId?: string;
  userId?: string;
  operation: string;
  downstreamEndpoint?: string;
  durationMs?: number;
  statusCode?: number;
  success: boolean;
  errorCategory?: string;
  errorMessage?: string;
  details?: Record<string, any>;
}

export const logger = {
  info: (message: string, ...args: any[]) => {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, ...args);
  },
  warn: (message: string, ...args: any[]) => {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, ...args);
  },
  error: (message: string, ...args: any[]) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, ...args);
  },
  debug: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEBUG] ${new Date().toISOString()} - ${message}`, ...args);
    }
  },
  structured: (level: 'info' | 'warn' | 'error', meta: StructuredLogMeta) => {
    const sanitizedMeta = sanitizeLogContext(meta);
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      ...sanitizedMeta,
    };
    const logStr = JSON.stringify(logEntry);

    if (level === 'error') {
      console.error(`[STRUCTURED_LOG] ${logStr}`);
    } else if (level === 'warn') {
      console.warn(`[STRUCTURED_LOG] ${logStr}`);
    } else {
      console.log(`[STRUCTURED_LOG] ${logStr}`);
    }
    return logEntry;
  },
};
