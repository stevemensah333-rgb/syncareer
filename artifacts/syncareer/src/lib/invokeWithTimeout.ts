/**
 * A hard time limit around a backend function call.
 *
 * `supabase.functions.invoke` has no client-side deadline: if the request
 * stalls, the promise simply never settles and the surface that awaited it is
 * left on its loading state forever. Every AI-backed call goes through here so
 * a stall degrades into a stated failure instead of a permanent spinner.
 */
export class FunctionTimeoutError extends Error {
  constructor(public readonly label: string, public readonly timeoutMs: number) {
    super(`${label} did not respond within ${Math.round(timeoutMs / 1000)}s.`);
    this.name = 'FunctionTimeoutError';
  }
}

export function invokeWithTimeout<T>(
  call: () => Promise<T>,
  { label, timeoutMs }: { label: string; timeoutMs: number },
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new FunctionTimeoutError(label, timeoutMs)), timeoutMs);
    call().then(
      (value) => { clearTimeout(timer); resolve(value); },
      (cause) => { clearTimeout(timer); reject(cause); },
    );
  });
}
