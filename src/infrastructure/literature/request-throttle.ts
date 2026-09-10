export class RequestThrottle {
  private nextAllowedAt = 0;
  private queue: Promise<void> = Promise.resolve();
  constructor(
    private readonly minimumIntervalMs = 120,
    private readonly now = () => Date.now(),
  ) {}
  run<T>(signal: AbortSignal, operation: () => Promise<T>): Promise<T> {
    const result = this.queue.then(async () => {
      const delay = Math.max(0, this.nextAllowedAt - this.now());
      if (delay) await waitFor(delay, signal);
      if (signal.aborted) throw new DOMException("Aborted", "AbortError");
      this.nextAllowedAt = this.now() + this.minimumIntervalMs;
      return operation();
    });
    this.queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }
}

function waitFor(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(done, ms);
    function done() {
      signal.removeEventListener("abort", abort);
      resolve();
    }
    function abort() {
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      reject(new DOMException("Aborted", "AbortError"));
    }
    signal.addEventListener("abort", abort, { once: true });
  });
}
