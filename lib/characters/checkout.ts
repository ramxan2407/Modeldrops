import { z } from "zod";
import { catalogFor } from "../admin/service";
import { characterAllowed } from "../admin/character-permissions";
import { ApiError } from "../server";
import { demoEnabled } from "../credits";
import {
  characterAccess,
  testCheckoutEnabled,
  type CheckoutEnvironment,
} from "./access";
export const characterLicense =
  "Access to this fictional adult character inside Model Drops. The approved character reference is attached automatically to supported image and video requests. Generation uses credits separately. No trained LoRA or exclusive ownership is included.";
type Order = {
  id: string;
  character_id: string;
  amount_cents: number;
  currency: string;
  credits_spent: number;
};
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
    const demo = demoEnabled(this.env);
    const balance = demo
      ? await this.db
          .prepare(
            "SELECT COALESCE(SUM(amount),0) balance FROM credit_transactions WHERE user_id=? AND wallet='demo'",
          )
          .bind(this.userId)
          .first<{ balance: number }>()
      : null;
    return {
      characterId: c.id,
      name: c.name,
      amountCents: Math.round(c.price * 100),
      currency: demo ? "demo_credits" : "usd",
      creditCost: c.demoCreditPrice,
      balance: balance?.balance ?? 0,
      ready: c.approvalStatus === "approved" && !!c.referenceImage,
      approvalStatus: c.approvalStatus,
      owned: await characterAccess(this.db, this.userId, id, this.env),
      mode: demo
        ? "demo_credits"
        : testCheckoutEnabled(this.env)
          ? "test"
          : "unavailable",
      license: characterLicense,
    };
  }
  async complete(raw: unknown) {
    const parsed = z
      .object({
        characterId: z.string().min(1).max(100),
        acceptedLicense: z.literal(true),
        expectedAmountCents: z.number().int().nonnegative().optional(),
        expectedCredits: z.number().int().nonnegative().optional(),
        idempotencyKey: z.string().uuid(),
      })
      .safeParse(raw);
    if (!parsed.success)
      throw new ApiError(
        400,
        "Accept the character terms and provide valid checkout details.",
      );
    const d = parsed.data,
      demo = demoEnabled(this.env);
    if (!demo && !testCheckoutEnabled(this.env))
      throw new ApiError(
        503,
        "Payments are not connected yet. No payment or credits were taken.",
      );
    if (
      demo
        ? d.expectedCredits === undefined
        : d.expectedAmountCents === undefined
    )
      throw new ApiError(400, "Review the current checkout price first.");
    const key = `character:${this.userId}:${d.idempotencyKey}`;
    const previous = () =>
      this.db
        .prepare(
          "SELECT id,character_id,amount_cents,currency,credits_spent FROM character_orders WHERE idempotency_key=?",
        )
        .bind(key)
        .first<Order>();
    const receipt = async (order: Order) => {
      if (
        order.character_id !== d.characterId ||
        (demo
          ? order.currency !== "demo_credits" ||
            order.credits_spent !== d.expectedCredits
          : order.currency !== "usd" ||
            order.amount_cents !== d.expectedAmountCents)
      )
        throw new ApiError(409, "This checkout key belongs to another order.");
      if (
        !(await characterAccess(this.db, this.userId, d.characterId, this.env))
      )
        throw new ApiError(
          403,
          "This access is no longer active. Contact support before checking out again.",
        );
      return {
        id: order.id,
        characterId: d.characterId,
        test: true,
        creditsSpent: order.credits_spent,
      };
    };
    const prior = await previous();
    if (prior) return receipt(prior);
    const inactive = await this.db
      .prepare(
        "SELECT id FROM character_orders WHERE user_id=? AND character_id=? AND mode='test'",
      )
      .bind(this.userId, d.characterId)
      .first();
    if (
      inactive &&
      !(await characterAccess(this.db, this.userId, d.characterId, this.env))
    )
      throw new ApiError(
        403,
        "This access is no longer active. Contact support before checking out again.",
      );
    const quote = await this.quote(d.characterId);
    if (!quote.ready)
      throw new ApiError(
        409,
        "This character needs an approved reference before access can open.",
      );
    if (quote.owned)
      throw new ApiError(409, "This character is already in your library.");
    if (
      demo
        ? quote.creditCost !== d.expectedCredits
        : quote.amountCents !== d.expectedAmountCents
    )
      throw new ApiError(409, "The price changed. Review checkout again.");
    if (demo && quote.balance < quote.creditCost)
      throw new ApiError(
        402,
        "Not enough demo credits. Ask an administrator for a top-up.",
      );
    const id = crypto.randomUUID();
    try {
      await this.db.batch([
        this.db
          .prepare(
            "INSERT INTO character_orders(id,user_id,character_id,amount_cents,currency,mode,status,license_snapshot,idempotency_key,credits_spent) VALUES(?,?,?,?,?,'test','test_completed',?,?,?)",
          )
          .bind(
            id,
            this.userId,
            d.characterId,
            demo ? 0 : quote.amountCents,
            demo ? "demo_credits" : "usd",
            characterLicense,
            key,
            demo ? quote.creditCost : 0,
          ),
        ...(demo
          ? [
              this.db
                .prepare(
                  "INSERT INTO credit_transactions(id,user_id,amount,type,description,balance_before,balance_after,idempotency_key,wallet) SELECT ?,?,?,'character_purchase',?,COALESCE(SUM(amount),0),COALESCE(SUM(amount),0)-?,?,'demo' FROM credit_transactions WHERE user_id=? AND wallet='demo'",
                )
                .bind(
                  crypto.randomUUID(),
                  this.userId,
                  -quote.creditCost,
                  `${quote.name} · demo character access`,
                  quote.creditCost,
                  `character-charge:${id}`,
                  this.userId,
                ),
            ]
          : []),
        this.db
          .prepare(
            "INSERT INTO character_entitlements(user_id,character_id,order_id,status) VALUES(?,?,?,'active')",
          )
          .bind(this.userId, d.characterId, id),
        this.db
          .prepare(
            "INSERT INTO notifications(id,user_id,message) VALUES(?,?,?)",
          )
          .bind(
            `order:${id}`,
            this.userId,
            demo
              ? `${quote.name} is ready in Studio. ${quote.creditCost} demo credits used.`
              : `${quote.name} test access is ready. No payment was collected.`,
          ),
      ]);
    } catch (error) {
      const replay = await previous();
      if (replay) return receipt(replay);
      if (await characterAccess(this.db, this.userId, d.characterId, this.env))
        throw new ApiError(409, "This character is already in your library.");
      if (
        error instanceof Error &&
        /balance_nonnegative|CHECK constraint|Stale credit balance/.test(
          error.message,
        )
      )
        throw new ApiError(
          402,
          "Your demo balance changed. Refresh and check your credits.",
        );
      throw error;
    }
    return {
      id,
      characterId: d.characterId,
      test: true,
      creditsSpent: demo ? quote.creditCost : 0,
    };
  }
}
