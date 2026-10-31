/**
 * Centralized API Client with Exponential Backoff, Jitter, and Graceful 429 Handling
 */

export interface RetryCallbackInfo {
  attempt: number;
  maxRetries: number;
  delayMs: number;
  status: number;
  message: string;
}

export interface ApiFetchOptions extends RequestInit {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  retryOnStatuses?: number[];
  onRetry?: (info: RetryCallbackInfo) => void;
}

export class ApiError extends Error {
  public statusCode: number;
  public errorCode: string;
  public isRateLimited: boolean;
  public retryAfterSeconds?: number;
  public technicalDetails?: string;

  constructor(
    message: string,
    statusCode: number,
    errorCode = 'API_ERROR',
    technicalDetails?: string,
    retryAfterSeconds?: number
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isRateLimited = statusCode === 429 || errorCode === 'USAGE_LIMIT_429';
    this.technicalDetails = technicalDetails;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/**
 * Calculates exponential backoff with full jitter to avoid thundering herd problem.
 */
export function calculateBackoffWithJitter(
  attempt: number,
  baseDelayMs = 1000,
  maxDelayMs = 8000,
  retryAfterHeader?: string | null
): number {
  if (retryAfterHeader) {
    const seconds = parseInt(retryAfterHeader, 10);
    if (!isNaN(seconds) && seconds > 0) {
      // Add a small jitter of 100-500ms to the server-suggested retry duration
      const headerJitter = Math.floor(Math.random() * 400) + 100;
      return Math.min(seconds * 1000 + headerJitter, maxDelayMs);
    }
  }

  // Exponential factor: 2^(attempt - 1) -> 1, 2, 4, 8...
  const expFactor = Math.pow(2, attempt - 1);
  const rawDelay = baseDelayMs * expFactor;

  // Jitter: random variation between 150ms and 500ms
  const jitter = Math.floor(Math.random() * 350) + 150;
  const calculatedDelay = rawDelay + jitter;

  return Math.min(calculatedDelay, maxDelayMs);
}

/**
 * Converts any error or response into a human-friendly error object.
 */
export function getFriendlyErrorInfo(status: number, rawData?: any): { friendlyMessage: string; errorCode: string; technical?: string } {
  const errStr = typeof rawData === 'string' ? rawData : (rawData?.error || rawData?.message || '');
  const code = rawData?.errorCode || '';

  // 1. HTTP 429 - Rate limit / Quota
  if (status === 429 || code === 'USAGE_LIMIT_429' || String(errStr).includes('429') || String(errStr).includes('RESOURCE_EXHAUSTED')) {
    return {
      friendlyMessage: 'The AI usage limit has been reached. Please wait a moment before trying again.',
      errorCode: 'USAGE_LIMIT_429',
      technical: rawData?.technicalDetails || 'HTTP 429: Rate limit or quota exhausted.',
    };
  }

  // 2. HTTP 503 - High Demand / Service Unavailable
  if (status === 503 || code === 'MODEL_BUSY_503' || String(errStr).includes('503') || String(errStr).includes('UNAVAILABLE')) {
    return {
      friendlyMessage: 'Our AI tutor is temporarily busy due to high demand. Please try again in a moment.',
      errorCode: 'MODEL_BUSY_503',
      technical: rawData?.technicalDetails || 'HTTP 503: Model experiencing high demand.',
    };
  }

  // 3. HTTP 401 / 403 - Auth
  if (status === 401 || status === 403 || code === 'AUTH_ERROR_401' || String(errStr).includes('401')) {
    return {
      friendlyMessage: 'API authentication needs attention. Please verify your API key in Settings > Secrets.',
      errorCode: 'AUTH_ERROR_401',
      technical: rawData?.technicalDetails || 'HTTP 401/403: API key invalid or unauthorized.',
    };
  }

  // 4. Network / Connectivity
  if (status === 502 || status === 504 || code === 'NETWORK_ERROR' || String(errStr).includes('fetch failed')) {
    return {
      friendlyMessage: 'Connection to the AI study service failed. Please check your network connection.',
      errorCode: 'NETWORK_ERROR',
      technical: 'Network connectivity failure or gateway timeout.',
    };
  }

  // Clean user-safe message if provided
  if (typeof errStr === 'string' && !errStr.startsWith('{') && errStr.length < 160) {
    return {
      friendlyMessage: errStr,
      errorCode: code || 'SERVICE_ERROR',
      technical: rawData?.technicalDetails,
    };
  }

  return {
    friendlyMessage: 'An unexpected issue occurred while contacting the AI service. Please try again.',
    errorCode: code || 'UNKNOWN_ERROR',
    technical: String(errStr).slice(0, 150),
  };
}

/**
 * Resilient fetch handler implementing exponential backoff with jitter for HTTP 429 and transient errors.
 */
export async function apiFetch(url: string, options: ApiFetchOptions = {}): Promise<Response> {
  const {
    maxRetries = 3,
    baseDelayMs = 1000,
    maxDelayMs = 8000,
    retryOnStatuses = [429, 502, 503, 504],
    onRetry,
    ...fetchInit
  } = options;

  let lastResponse: Response | null = null;
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    // Check if aborted by caller
    if (fetchInit.signal?.aborted) {
      throw new DOMException('Request was aborted by the user', 'AbortError');
    }

    try {
      const response = await fetch(url, fetchInit);
      lastResponse = response;

      // If response is OK, return immediately
      if (response.ok) {
        return response;
      }

      // Check if status code qualifies for retry
      const shouldRetry = retryOnStatuses.includes(response.status);

      if (shouldRetry && attempt <= maxRetries) {
        const retryAfterHeader = response.headers.get('Retry-After');
        const delayMs = calculateBackoffWithJitter(attempt, baseDelayMs, maxDelayMs, retryAfterHeader);
        const { friendlyMessage } = getFriendlyErrorInfo(response.status);

        console.warn(
          `[apiFetch] HTTP ${response.status} on ${url}. Retrying in ${delayMs}ms (Attempt ${attempt}/${maxRetries}) with jitter...`
        );

        if (onRetry) {
          onRetry({
            attempt,
            maxRetries,
            delayMs,
            status: response.status,
            message: friendlyMessage,
          });
        }

        await new Promise((resolve, reject) => {
          const timer = setTimeout(resolve, delayMs);
          if (fetchInit.signal) {
            fetchInit.signal.addEventListener(
              'abort',
              () => {
                clearTimeout(timer);
                reject(new DOMException('Request aborted during backoff delay', 'AbortError'));
              },
              { once: true }
            );
          }
        });

        continue;
      }

      // If status is not retryable or retries are exhausted, break and throw
      break;
    } catch (networkErr: any) {
      lastError = networkErr;

      // If user intentionally aborted, throw immediately
      if (networkErr.name === 'AbortError') {
        throw networkErr;
      }

      // If network failure (e.g. offline, connection drop), retry with backoff
      if (attempt <= maxRetries) {
        const delayMs = calculateBackoffWithJitter(attempt, baseDelayMs, maxDelayMs);
        console.warn(
          `[apiFetch] Network error (${networkErr.message}) on ${url}. Retrying in ${delayMs}ms (Attempt ${attempt}/${maxRetries})...`
        );

        if (onRetry) {
          onRetry({
            attempt,
            maxRetries,
            delayMs,
            status: 502,
            message: 'Connection dropped. Retrying automatically...',
          });
        }

        await new Promise(resolve => setTimeout(resolve, delayMs));
        continue;
      }

      break;
    }
  }

  // Handle exhausted response or network error
  if (lastResponse) {
    let errJson: any = null;
    try {
      errJson = await lastResponse.json();
    } catch {
      // response body was not JSON
    }

    const { friendlyMessage, errorCode, technical } = getFriendlyErrorInfo(lastResponse.status, errJson);
    const retryAfterSeconds = lastResponse.headers.get('Retry-After')
      ? parseInt(lastResponse.headers.get('Retry-After')!, 10)
      : undefined;

    throw new ApiError(friendlyMessage, lastResponse.status, errorCode, technical, retryAfterSeconds);
  }

  // Network error exhausted
  throw new ApiError(
    'Unable to connect to the server. Please check your internet connection.',
    502,
    'NETWORK_ERROR',
    lastError?.message || 'Network request failed'
  );
}

/**
 * Convenience helper to perform an API call and parse JSON with automatic retries and error typing.
 */
export async function apiJson<T>(url: string, options: ApiFetchOptions = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await apiFetch(url, {
    ...options,
    headers,
  });

  return (await response.json()) as T;
}
