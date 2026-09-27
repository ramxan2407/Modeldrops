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
  currency: string;
  ready: boolean;
  owned: boolean;
  mode: string;
  license: string;
};
export function CharacterCheckout({
  character,
  onClose,
  onComplete,
}: {
  character: Character | null;
  onClose: () => void;
  onComplete: (id: string) => Promise<void>;
}) {
  const [quote, setQuote] = useState<Quote | null>(null),
    [error, setError] = useState(""),
    [accepted, setAccepted] = useState(false),
    [busy, setBusy] = useState(false);
  const key = useRef("");
  const saving = useRef(false);
  useEffect(() => {
    if (!character) return;
    const controller = new AbortController();
    setQuote(null);
    setError("");
    setAccepted(false);
    key.current = crypto.randomUUID();
    fetch("/api/characters/checkout?id=" + encodeURIComponent(character.id), {
      signal: controller.signal,
    })
      .then(async (r) => {
        const d = (await r.json()) as Quote & { error?: string };
        if (!r.ok) throw Error(d.error || "Could not load checkout.");
        return d;
      })
      .then(setQuote)
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [character?.id]);
  async function complete() {
    if (!quote || saving.current) return;
    saving.current = true;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/characters/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterId: quote.characterId,
          acceptedLicense: accepted,
          expectedAmountCents: quote.amountCents,
          idempotencyKey: key.current,
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
              <strong>${(quote.amountCents / 100).toFixed(2)} USD</strong> ·
              Character access
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
                !accepted ||
                !quote.ready ||
                quote.mode !== "test" ||
                quote.owned
              }
              onClick={complete}
            >
              {busy
                ? "Unlocking…"
                : quote.owned
                  ? "Already unlocked"
                  : quote.mode === "test"
                    ? "Confirm test access"
                    : "Payments coming soon"}
            </Button>
          </div>
        ) : (
          !error && <p role="status">Loading checkout…</p>
        )}
        {error && <p role="alert">{error}</p>}
      </DialogContent>
    </Dialog>
  );
}
