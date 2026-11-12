// Use the provider that permits scheduled app integrations. Queue backoff handles failures.
const ENDPOINT = 'https://overpass.private.coffee/api/interpreter';
const MAX_BYTES = 8 * 1024 * 1024;
class UpstreamError extends Error {
  constructor(code, status = null) {
    super(code); this.name = 'UpstreamError'; this.status = status;
  }
}
export async function readBoundedJson(response, limit = MAX_BYTES) {
  if (Number(response.headers.get('content-length') || 0) > limit) {
    await response.body?.cancel(); throw new UpstreamError('response_too_large');
  }
  if (!response.body) throw new UpstreamError('empty_response');
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let bytes = 0, body = '';
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > limit) throw new UpstreamError('response_too_large');
      body += decoder.decode(chunk.value, { stream: true });
    }
    body += decoder.decode();
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  } finally { reader.releaseLock(); }
  try { return JSON.parse(body); }
  catch { throw new UpstreamError('invalid_json'); }
}
export async function fetchOsmPayload(query, transport = fetch) {
  try {
    const response = await transport(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        Accept: 'application/json',
        'User-Agent': 'ELAS-na-Cidade/1.1 (+https://elas-na-cidade.netlify.app/)',
      },
      body: new URLSearchParams({ data: query }).toString(),
      signal: AbortSignal.timeout(35000),
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw new UpstreamError('http_error', response.status);
    }
    const payload = await readBoundedJson(response);
    if (!payload || !Array.isArray(payload.elements) || payload.remark)
      throw new UpstreamError('incomplete_response');
    return { payload, endpoint: ENDPOINT };
  } catch (error) {
    console.warn(JSON.stringify({
      event: 'overpass_request_failed',
      endpoint: ENDPOINT,
      code: error instanceof UpstreamError ? error.message : 'network_or_timeout',
      status: error instanceof UpstreamError ? error.status : null,
      failureName: error instanceof Error ? error.name : 'unknown',
    }));
    throw error;
  }
}
