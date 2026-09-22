/**
 * The dashboard copies one credential containing ID:secret. Keep support for
 * older split environment variables, without ever logging their values.
 * @param {{ HF_CREDENTIALS?: string, HF_API_KEY_ID?: string, HF_API_KEY_SECRET?: string }} env
 */
export function credentialsFor(env) {
  const id = env.HF_API_KEY_ID?.trim();
  const secret = env.HF_API_KEY_SECRET?.trim();
  const combined =
    env.HF_CREDENTIALS?.trim() ||
    (id?.includes(":") ? id : id && secret ? `${id}:${secret}` : "");
  return /^[^\s:]+:[^\s:]+$/.test(combined) ? combined : undefined;
}
