export type CheckoutEnvironment = {
  CHARACTER_TEST_CHECKOUT?: string;
  VERCEL_ENV?: string;
};
export function testCheckoutEnabled(env: CheckoutEnvironment) {
  return (
    env.CHARACTER_TEST_CHECKOUT === "true" && env.VERCEL_ENV !== "production"
  );
}
export async function characterAccess(
  db: D1Database,
  userId: string,
  characterId: string,
  env: CheckoutEnvironment,
) {
  const row = await db
    .prepare(
      "SELECT o.mode,o.status FROM character_entitlements e JOIN character_orders o ON o.id=e.order_id WHERE e.user_id=? AND e.character_id=? AND e.status='active'",
    )
    .bind(userId, characterId)
    .first<{ mode: string; status: string }>();
  if (row)
    return row.mode === "payment"
      ? row.status === "paid"
      : row.status === "test_completed" && testCheckoutEnabled(env);
  const legacy = await db
    .prepare(
      "SELECT price_cents,license_version FROM character_purchases WHERE user_id=? AND character_id=? AND status='active'",
    )
    .bind(userId, characterId)
    .first<{ price_cents: number; license_version: string }>();
  return (
    !!legacy &&
    Number(legacy.price_cents) > 0 &&
    legacy.license_version !== "demo-1"
  );
}
