import { z } from "zod";
import { catalogFor } from "../admin/service";
import { characterAllowed } from "../admin/character-permissions";
import { ApiError } from "../server";
import {
  characterAccess,
  testCheckoutEnabled,
  type CheckoutEnvironment,
} from "./access";
export const characterLicense =
  "Access to this fictional adult character inside Model Drops. The character reference is attached automatically to supported image and video requests. Generation uses credits separately. No trained LoRA or exclusive ownership is included.";
export class CharacterCheckout {
  constructor(
    readonly db: D1Database,
    readonly userId: string,
    readonly env: CheckoutEnvironment,
  ) {}
  async quote(id: string) {
    const c = (await catalogFor(this.db)).find((c) => c.id === id && c.enabled);
    if (!c || !(await characterAllowed(this.db, this.userId, id)))
      throw new ApiError(404, "Character unavailable.");
    return {
      characterId: c.id,
      name: c.name,
      amountCents: Math.round(c.price * 100),
      currency: "usd",
      ready: !!c.referenceImage,
      owned: await characterAccess(this.db, this.userId, id, this.env),
      mode: testCheckoutEnabled(this.env) ? "test" : "unavailable",
      license: characterLicense,
    };
  }
  async complete(raw: unknown) {
    const parsed = z
      .object({
        characterId: z.string().min(1).max(100),
        acceptedLicense: z.literal(true),
        expectedAmountCents: z.number().int().nonnegative(),
        idempotencyKey: z.string().uuid(),
      })
      .safeParse(raw);
    if (!parsed.success)
      throw new ApiError(
        400,
        "Accept the character terms and provide valid checkout details.",
      );
    const d = parsed.data;
    if (!testCheckoutEnabled(this.env))
      throw new ApiError(
        503,
        "Payments are not connected yet. No payment or credits were taken.",
      );
    const key = `character:${this.userId}:${d.idempotencyKey}`;
    const previous = await this.db
      .prepare(
        "SELECT id,character_id,amount_cents FROM character_orders WHERE idempotency_key=?",
      )
      .bind(key)
      .first<any>();
    if (previous) {
      if (
        previous.character_id !== d.characterId ||
        Number(previous.amount_cents) !== d.expectedAmountCents
      )
        throw new ApiError(409, "This checkout key belongs to another order.");
      return { id: previous.id, characterId: d.characterId, test: true };
    }
    const quote = await this.quote(d.characterId);
    if (!quote.ready)
      throw new ApiError(
        409,
        "This character needs an approved reference before access can open.",
      );
    if (quote.owned)
      throw new ApiError(409, "This character is already in your library.");
    if (quote.amountCents !== d.expectedAmountCents)
      throw new ApiError(409, "The price changed. Review checkout again.");
    const id = crypto.randomUUID();
    try {
      await this.db.batch([
        this.db
          .prepare(
            "INSERT INTO character_orders(id,user_id,character_id,amount_cents,mode,status,license_snapshot,idempotency_key) VALUES(?,?,?,?,'test','test_completed',?,?)",
          )
          .bind(
            id,
            this.userId,
            d.characterId,
            quote.amountCents,
            characterLicense,
            key,
          ),
        this.db
          .prepare(
            "INSERT INTO character_entitlements(user_id,character_id,order_id,status) VALUES(?,?,?,'active') ON CONFLICT(user_id,character_id) DO UPDATE SET order_id=excluded.order_id,status='active' WHERE character_entitlements.status='revoked'",
          )
          .bind(this.userId, d.characterId, id),
        this.db
          .prepare(
            "INSERT INTO notifications(id,user_id,message) VALUES(?,?,?)",
          )
          .bind(
            `order:${id}`,
            this.userId,
            `${quote.name} test access is ready. No payment was collected.`,
          ),
      ]);
    } catch (error) {
      const replay = await this.db
        .prepare(
          "SELECT id,character_id,amount_cents FROM character_orders WHERE idempotency_key=?",
        )
        .bind(key)
        .first<any>();
      if (
        replay &&
        replay.character_id === d.characterId &&
        Number(replay.amount_cents) === d.expectedAmountCents
      )
        return { id: replay.id, characterId: d.characterId, test: true };
      if (await characterAccess(this.db, this.userId, d.characterId, this.env))
        throw new ApiError(409, "This character is already in your library.");
      throw error;
    }
    return { id, characterId: d.characterId, test: true };
  }
}
