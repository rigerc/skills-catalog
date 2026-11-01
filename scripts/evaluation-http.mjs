/** Shared HTTP controls for prose and typed evaluators. */
export class RequestError extends Error {
  constructor(message, stop = false, code = 'provider_error') {
    super(message);
    this.stop = stop;
    this.code = code;
  }
}

export async function requestJson(provider, body, options, {
  apiKey, fetchImpl = fetch, beforeRequest = async () => {},
  sleep = ms => new Promise(done => setTimeout(done, ms)),
} = {}) {
  for (let attempt = 0; attempt <= options.retries; attempt++) {
    await beforeRequest();
    let response;
    try {
      response = await fetchImpl(provider.endpoint, {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(options.timeoutSeconds * 1000),
        headers: {...(apiKey ? {Authorization: 'Bearer ' + apiKey} : {}), 'Content-Type': 'application/json'}, body,
      });
    } catch {
      // The provider may already have billed a timed-out request.
      throw new RequestError(provider.name + ' network error or timeout; rerun to retry', false, 'network_error');
    }
    if (response.ok) {
      let result;
      try {result = await response.json();}
      catch {throw new RequestError(provider.name + ' returned unreadable JSON', false, 'invalid_response');}
      if (!result || typeof result !== 'object' || Array.isArray(result)) {
        throw new RequestError(provider.name + ' returned invalid JSON', false, 'invalid_response');
      }
      if (result.error) throw new RequestError(provider.name + ' returned an API error', true);
      return {body: result, requestId: response.headers.get('x-request-id') ?? response.headers.get('x-typesafe-request-id') ?? null};
    }
    // Inspect context-limit codes without exposing provider response bodies in logs.
    let errorBody = '';
    if (provider.contextErrors) {
      try {errorBody = await response.text();} catch { /* status still identifies the error */ }
    } else await response.body?.cancel();
    if (provider.contextErrors && (response.status === 413 ||
        [400, 422].includes(response.status) &&
        /max_tokens_exceeded|context_length_exceeded|context.{0,40}(exceed|limit)|state.{0,20}exceeds?\s+[\d,.]+ tokens/i
          .test(errorBody))) {
      throw new RequestError(provider.name + ' document exceeds the model context limit', false, 'resource_limit');
    }
    const retryable = response.status === 429 || response.status >= 500;
    const retryAfter = response.headers.get('retry-after');
    const delay = retryAfter === null ? 1000 * 2 ** attempt
      : /^\d+(?:\.\d+)?$/.test(retryAfter) ? Number(retryAfter) * 1000
        : Math.max(0, Date.parse(retryAfter) - Date.now());
    if (!retryable || attempt === options.retries || !Number.isFinite(delay) || delay > 60000) {
      throw new RequestError(provider.name + ' HTTP ' + response.status,
        response.status === 429 || [400, 401, 402, 403, 404, 415, 422].includes(response.status) ||
        !Number.isFinite(delay) || delay > 60000, 'http_' + response.status);
    }
    await sleep(delay);
  }
  throw new RequestError('Provider retries exhausted');
}
