"use client";
import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";

export type OperationsSnapshot = {
  checks: { name: string; lastRun: string | null; status: string }[];
  counts: Record<string, number>;
};
export function OperationsHealth({
  snapshot,
}: {
  snapshot: OperationsSnapshot;
}) {
  const names: Record<string, string> = {
    generation: "Generation recovery",
    email: "Email scheduler",
    storage: "Storage cleanup",
  };
  const statuses: Record<string, string> = {
    ok: "Healthy",
    running: "Running",
    failed: "Needs attention",
    stale: "No recent heartbeat",
    not_seen: "Not yet observed",
  };
  return (
    <section
      className="admin-card operations-health"
      aria-labelledby="operations-heading"
    >
      <h2 id="operations-heading">Background service health</h2>
      <p>
        The scheduler runs every minute. Refresh to check its latest heartbeat.
        Email delivery also requires a configured sender in Integrations.
      </p>
      <div className="operations-grid">
        {snapshot.checks.map((check) => (
          <article key={check.name}>
            <strong>{names[check.name] || check.name}</strong>
            <span className="admin-badge" data-health={check.status}>
              {statuses[check.status] || check.status}
            </span>
            <small>
              {check.lastRun
                ? `Last observed ${new Date(check.lastRun).toLocaleString()}`
                : "Waiting for the first scheduled run"}
            </small>
          </article>
        ))}
      </div>
      <dl className="operations-counts">
        {(
          [
            ["review_jobs", "Jobs needing manual review"],
            ["stalled_jobs", "Generations older than 30 minutes"],
            ["pending_emails", "Emails waiting for delivery"],
            ["failed_emails", "Failed email deliveries"],
            ["cleanup_pending", "Files queued for cleanup"],
          ] as const
        ).map(([key, label]) => (
          <div key={key}>
            <dt>{label}</dt>
            <dd>{(snapshot.counts[key] || 0).toLocaleString()}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

async function mutate(action: string, data: unknown) {
  const r = await fetch("/api/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, data }),
  });
  const result = (await r.json()) as { error?: string };
  if (!r.ok) throw new Error(result.error || "Could not save this change.");
}
export function TesterAccess({
  testers,
  onUpdated,
}: {
  testers: { email: string; enabled: number }[];
  onUpdated: () => Promise<unknown>;
}) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  return (
    <section className="admin-card">
      <h2>Approved demo testers</h2>
      <p>
        Only approved email addresses can enter the demo. Assign credits from
        the Credits controls after their first sign-in.
      </p>
      <form
        className="admin-edit"
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          const f = new FormData(e.currentTarget);
          setBusy(true);
          setMessage("");
          try {
            await mutate("tester", {
              id: f.get("email"),
              enabled: f.get("access") === "allow",
              reason: f.get("reason"),
            });
            await onUpdated();
            setMessage("Tester access updated.");
          } catch (e) {
            setMessage((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Tester email
          <Input name="email" type="email" required autoComplete="off" />
        </label>
        <label>
          Access
          <select name="access">
            <option value="allow">Approve access</option>
            <option value="revoke">Revoke access</option>
          </select>
        </label>
        <label>
          Reason
          <Input name="reason" minLength={5} maxLength={500} required />
        </label>
        <Button disabled={busy} type="submit">
          {busy ? "Saving…" : "Update tester access"}
        </Button>
        <p role="status">{message}</p>
      </form>
      <ul>
        {testers.map((t) => (
          <li key={t.email}>
            {t.email} · {t.enabled ? "Approved" : "Revoked"}
          </li>
        ))}
      </ul>
    </section>
  );
}
export type RecoveryJob = {
  id: string;
  updated_at: string;
  request_id: string | null;
  job_status: string;
};
export function JobRecovery({
  job,
  onUpdated,
}: {
  job: RecoveryJob;
  onUpdated: () => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  if (job.job_status !== "needs_review") return null;
  return (
    <>
      <Button onClick={() => setOpen(true)}>Review job</Button>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!busy) setOpen(value);
        }}
      >
        <DialogContent className="admin-edit">
          <DialogTitle>Recover generation</DialogTitle>
          <DialogDescription>
            Check the provider console first. Resume polls the existing request.
            Closing returns user credits while retaining the estimated provider
            spend.
          </DialogDescription>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (busy) return;
              const f = new FormData(e.currentTarget);
              setBusy(true);
              setError("");
              try {
                await mutate("reconcile", {
                  id: job.id,
                  key: crypto.randomUUID(),
                  expectedUpdatedAt: job.updated_at,
                  action: f.get("action"),
                  requestId: String(f.get("requestId") || "") || undefined,
                  reason: f.get("reason"),
                  confirmed: f.has("confirmed"),
                });
                setOpen(false);
                await onUpdated();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Action
              <select name="action">
                <option value="resume">Resume existing provider request</option>
                <option value="refund">
                  Close request and refund user credits
                </option>
              </select>
            </label>
            <label>
              Provider request ID
              <Input
                name="requestId"
                defaultValue={job.request_id || ""}
                readOnly={!!job.request_id}
              />
            </label>
            <label>
              Provider findings and evidence reference
              <textarea
                name="reason"
                required
                minLength={10}
                maxLength={1000}
              />
            </label>
            <label>
              <input type="checkbox" name="confirmed" required /> I verified
              this request in the provider console and recorded the outcome
              above.
            </label>
            {error && <p role="alert">{error}</p>}
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Apply recovery"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
