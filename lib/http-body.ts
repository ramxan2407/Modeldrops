export class RequestError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Bound streamed bodies too: Content-Length is optional and not trusted. */
export async function requestText(request: Request, maximum = 98304) {
  if (Number(request.headers.get("content-length")) > maximum)
    throw new RequestError(413, "Request is too large.");
  const reader = request.body?.getReader();
  if (!reader) throw new RequestError(400, "Request body is required.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maximum) {
      await reader.cancel();
      throw new RequestError(413, "Request is too large.");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new RequestError(400, "Invalid request encoding.");
  }
}

export async function requestJson(
  request: Request,
  maximum = 98304,
): Promise<unknown> {
  const text = await requestText(request, maximum);
  try {
    return JSON.parse(text);
  } catch {
    throw new RequestError(400, "Invalid JSON request.");
  }
}
