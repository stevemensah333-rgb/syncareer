import { captureException } from '@/services/sentry';
import { trackEvent } from '@/services/analytics';

export interface ApiError {
  status: number;
  message: string;
  data?: any;
}

const isOnline = (): boolean => navigator.onLine;

/**
 * Make an API request with centralized error handling
 */
export async function apiRequest<T>(
  url: string,
  options: RequestInit & { maxRetries?: number; timeout?: number } = {}
): Promise<T> {
  const { maxRetries = 1, timeout = 30000, ...fetchOptions } = options;

  if (!isOnline()) {
    const error = new Error('No internet connection');
    captureException(error, { url, offline: true });
    throw error;
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const error: ApiError = {
          status: response.status,
          message: data.message || response.statusText,
          data,
        };

        // Track API errors
        trackEvent({
          event: 'api_error',
          properties: {
            endpoint: url,
            status_code: response.status,
            error_message: error.message,
          },
        });

        throw new Error(`API Error: ${error.message}`);
      }

      return await response.json() as T;
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries && isOnline()) {
        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        continue;
      }

      // Log error to Sentry
      captureException(lastError, {
        url,
        attempt,
        maxRetries,
      });

      throw lastError;
    }
  }

  if (lastError) throw lastError;
}

/**
 * Helper for GET requests
 */
export function apiGet<T>(url: string, options?: RequestInit): Promise<T> {
  return apiRequest<T>(url, {
    ...options,
    method: 'GET',
  });
}

/**
 * Helper for POST requests
 */
export function apiPost<T>(url: string, body?: any, options?: RequestInit): Promise<T> {
  return apiRequest<T>(url, {
    ...options,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * Helper for PUT requests
 */
export function apiPut<T>(url: string, body?: any, options?: RequestInit): Promise<T> {
  return apiRequest<T>(url, {
    ...options,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * Helper for DELETE requests
 */
export function apiDelete<T>(url: string, options?: RequestInit): Promise<T> {
  return apiRequest<T>(url, {
    ...options,
    method: 'DELETE',
  });
}
