import { env } from "cloudflare:workers";
import { isSameOriginRequest } from "./request-origin";

export function sameOrigin(request: Request) {
  // Next's internal request URL can use localhost behind a proxy. APP_ORIGIN
  // describes the browser-facing origin and does not require database setup.
  const { APP_ORIGIN } = env as unknown as { APP_ORIGIN?: string };
  return isSameOriginRequest(request, APP_ORIGIN);
}
