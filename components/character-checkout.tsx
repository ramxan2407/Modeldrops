"use client";
import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Character } from "@/lib/catalog";
type Quote = {
  characterId: string;
  name: string;
  amountCents: number;
  creditCost: number;
  balance: number;
  currency: string;
  ready: boolean;
  owned: boolean;
  mode: string;
  license: string;
};
type CheckoutProps = {
  character: Character | null;
  onClose: () => void;
  onComplete: (id: string) => Promise<void>;
};
export function CharacterCheckout(props: CheckoutProps) {
  const [revision, setRevision] = useState(0);
  return props.character ? (
    <CheckoutSession
      {...props}
      character={props.character}
      key={`${props.character.id}:${revision}`}
      onRetry={() => setRevision((r) => r + 1)}
    />
  ) : null;
}
function CheckoutSession({
  character,
  onClose,
  onComplete,
  onRetry,
}: Omit<CheckoutProps, "character"> & {
  character: Character;
  onRetry: () => void;
}) {
  const [quote, setQuote] = useState<Quote | null>(null),
    [error, setError] = useState(""),
    [accepted, setAccepted] = useState(false),
    [busy, setBusy] = useState(false);
  const [key] = useState(() => crypto.randomUUID());
  const saving = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/characters/checkout?id=" + encodeURIComponent(character.id), {
      signal: controller.signal,
    })
      .then(async (r) => {
        const d = (await r.json()) as Quote & { error?: string };
        if (!r.ok) throw Error(d.error || "Could not load checkout.");
        return d;
      })
      .then((data) => {
        if (!controller.signal.aborted) setQuote(data);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [character.id]);
  async function complete() {
    if (!quote || saving.current) return;
    saving.current = true;
    setBusy(true);
    setError("");
    try {
      if (quote.owned) {
        await onComplete(quote.characterId);
        onClose();
        return;
      }
      const r = await fetch("/api/characters/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterId: quote.characterId,
          acceptedLicense: accepted,
          expectedAmountCents: quote.amountCents,
          idempotencyKey: key,
          expectedCredits:
            quote.mode === "demo_credits" ? quote.creditCost : undefined,
        }),
      });
      const d = (await r.json()) as { characterId: string; error?: string };
      if (!r.ok) throw Error(d.error || "Checkout could not complete.");
      await onComplete(d.characterId);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      saving.current = false;
    }
  }
  return (
    <Dialog
      open={!!character}
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent className="admin-edit">
        <DialogTitle>Unlock {character?.name}</DialogTitle>
        <DialogDescription>
          One character in your library. Create images and videos with its
          native reference in Studio. Generation credits are charged separately.
        </DialogDescription>
        {quote ? (
          <div className="character-checkout-review">
            <p>
              <strong>
                {quote.mode === "demo_credits"
                  ? `${quote.creditCost.toLocaleString()} demo credits`
                  : `$${(quote.amountCents / 100).toFixed(2)} USD`}
              </strong>{" "}
              · Character access
            </p>
            <p>{quote.license}</p>
            {!quote.ready && (
              <p role="status">
                The approved reference is being prepared. This model cannot be
                unlocked yet.
              </p>
            )}
            {quote.mode === "unavailable" && (
              <p role="status">
                Payments are not connected yet. No payment or credits will be
                taken.
              </p>
            )}
            {quote.mode === "demo_credits" && (
              <p role="status">
                Demo purchase · No money is charged. Balance:{" "}
                {quote.balance.toLocaleString()} credits.{" "}
                {quote.balance < quote.creditCost && !quote.owned
                  ? "Ask an administrator for more demo credits."
                  : "Your character will open in Studio after purchase."}
              </p>
            )}
            {quote.mode === "test" && (
              <p role="status">
                Test checkout · No money is charged. Test access only works in
                this test environment. Live generation, if configured, still
                uses credits.
              </p>
            )}
            <label className="admin-checkbox">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                disabled={busy || quote.mode === "unavailable" || !quote.ready}
              />
              I accept the character access terms.
            </label>
            <Button
              disabled={
                busy ||
                (!quote.owned &&
                  (!accepted ||
                    !quote.ready ||
                    !["test", "demo_credits"].includes(quote.mode) ||
                    (quote.mode === "demo_credits" &&
                      quote.balance < quote.creditCost)))
              }
              onClick={complete}
            >
              {busy
                ? "Unlocking…"
                : quote.owned
                  ? "Open Creator Studio"
                  : quote.mode === "demo_credits"
                    ? `Buy for ${quote.creditCost.toLocaleString()} credits`
                    : quote.mode === "test"
                      ? "Confirm test access"
                      : "Payments coming soon"}
            </Button>
          </div>
        ) : (
          !error && <p role="status">Loading checkout…</p>
        )}
        {error && (
          <>
            <p role="alert">{error}</p>
            <Button variant="outline" disabled={busy} onClick={onRetry}>
              Refresh access and price
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
