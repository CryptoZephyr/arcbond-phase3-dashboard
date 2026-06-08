// src/lib/fetch-retry.ts
// Wraps fetch with exponential backoff retry for post-chain-confirm database writes.
// Prevents permanent on-chain / SQLite desync when a write fails due to a transient network error.

export async function fetchWithRetry(
    url: string,
    options: RequestInit,
    maxAttempts = 3,
    baseDelayMs = 500
): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const response = await fetch(url, options);

            // Do not retry 4xx — those are client/validation errors, not transient
            if (response.ok || response.status < 500) {
                return response;
            }

            lastError = new Error(`HTTP ${response.status} on attempt ${attempt}`);
        } catch (err) {
            lastError = err instanceof Error ? err : new Error("Network error");
            console.warn(`[fetchWithRetry] Attempt ${attempt} failed:`, lastError.message);
        }

        if (attempt < maxAttempts) {
            await new Promise((r) => setTimeout(r, baseDelayMs * attempt));
        }
    }

    throw lastError ?? new Error("Request failed after all retry attempts");
}