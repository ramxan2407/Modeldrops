/** Compare against server configuration, never client-supplied forwarding headers. */
export function isSameOriginRequest(
  request: Request,
  configuredOrigin?: string,
) {
  try {
    const expected = new URL(configuredOrigin ?? request.url);
    if (
      !["http:", "https:"].includes(expected.protocol) ||
      expected.username ||
      expected.password ||
      (configuredOrigin !== undefined &&
        (expected.pathname !== "/" || expected.search || expected.hash))
    )
      return false;
    return request.headers.get("origin") === expected.origin;
  } catch {
    return false;
  }
}
