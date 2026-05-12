// Lightweight error handling utilities. No external error reporter is wired
// here — log to the console; future reporting can hook into logErrorToSentry.


export type AppErrorType = 'VALIDATION' | 'NETWORK' | 'AUTH' | 'SERVER' | 'UNKNOWN';

export interface AppError {
  type: AppErrorType;
  message: string;
  code?: string;
  statusCode?: number;
  details?: Record<string, unknown>;
  timestamp: Date;
}

/**
 * Normalizes any error into a consistent AppError format
 */
export function normalizeError(error: unknown, context?: string): AppError {
  const timestamp = new Date();

  if (error instanceof Error) {
    return {
      type: classifyError(error),
      message: error.message,
      details: { stack: error.stack },
      timestamp,
    };
  }

  if (typeof error === 'object' && error !== null) {
    const errorObj = error as Record<string, unknown>;
    
    return {
      type: (errorObj.type as AppErrorType) || 'UNKNOWN',
      message: (errorObj.message as string) || 'An unknown error occurred',
      code: errorObj.code as string | undefined,
      statusCode: errorObj.statusCode as number | undefined,
      details: {
        original: error,
        context,
      },
      timestamp,
    };
  }

  return {
    type: 'UNKNOWN',
    message: String(error) || 'An unknown error occurred',
    details: { context },
    timestamp,
  };
}

/**
 * Classifies error type based on error message or characteristics
 */
function classifyError(error: Error): AppErrorType {
  const message = error.message.toLowerCase();

  if (message.includes('validation') || message.includes('invalid')) {
    return 'VALIDATION';
  }
  if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
    return 'NETWORK';
  }
  if (message.includes('unauthorized') || message.includes('auth')) {
    return 'AUTH';
  }
  if (message.includes('server') || message.includes('500')) {
    return 'SERVER';
  }

  return 'UNKNOWN';
}

/**
 * Logs an error with optional context. Currently console-only.
 */
export function logErrorToSentry(error: AppError | Error, context?: Record<string, unknown>) {
  if (error instanceof Error) {
    console.error('[error]', error, context);
  } else {
    console.error('[error]', (error as AppError).message, error, context);
  }
}

/**
 * User-friendly error message for display
 */
export function getUserFriendlyMessage(error: AppError): string {
  switch (error.type) {
    case 'VALIDATION':
      return 'Please check your input and try again.';
    case 'NETWORK':
      return 'A network error occurred. Please check your connection and try again.';
    case 'AUTH':
      return 'You are not authorized to perform this action. Please sign in.';
    case 'SERVER':
      return 'A server error occurred. Our team has been notified. Please try again later.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
}

/**
 * Retryable error check
 */
export function isRetryableError(error: AppError): boolean {
  return error.type === 'NETWORK' || error.type === 'SERVER';
}
