"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ShieldCheck,
  RefreshCw,
  Search,
  ArrowUpRight,
  Users,
  Coins,
  Layers,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
const sections = [
  "Overview",
  "Users",
  "Credits",
  "Payments",
  "Models",
  "Characters",
  "Moderation",
  "Activity",
  "Integrations",
];
const fmt = (n: number) => (n || 0).toLocaleString();
const date = (s: string) => new Date(s).toLocaleString();
async function call(url: string, data?: unknown) {
  const r = await fetch(
    url,
    data === undefined
      ? {}
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
  );
  const body: any = await r.json();
  if (!r.ok) throw new Error(body.error || "Unable to load administration.");
  return body;
}
export default function SuperAdmin({
  onTraining,
  onUpdated,
}: {
  onTraining: () => void;
  onUpdated: () => Promise<unknown>;
}) {
  const [section, setSection] = useState("overview"),
    [page, setPage] = useState(0),
    [search, setSearch] = useState(""),
    [query, setQuery] = useState("");
  const [data, setData] = useState<any>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState<{
    action: string;
    record: any;
    title: string;
  } | null>(null);
  const saving = useRef(false),
    request = useRef(0),
    creditKey = useRef("");
  const load = useCallback(async () => {
    const version = ++request.current;
    setLoading(true);
    setError("");
    try {
      const next = await call(
        "/api/admin?" +
          new URLSearchParams({ section, search: query, page: String(page) }),
      );
      if (version === request.current) setData({ ...next, _section: section });
    } catch (e) {
      if (version === request.current) setError((e as Error).message);
    } finally {
      if (version === request.current) setLoading(false);
    }
  }, [section, query, page]);
  useEffect(() => {
    setData(null);
    void load();
    return () => {
      request.current++;
    };
  }, [load]);
  function open(action: string, record: any, title: string) {
    creditKey.current = crypto.randomUUID();
    setEdit({ action, record, title });
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!edit || saving.current) return;
    const f = new FormData(event.currentTarget),
      value = (k: string) => String(f.get(k) || "");
    const d: any = { id: edit.record.id, reason: value("reason") };
    if (edit.action === "credits") {
      d.amount = Number(value("amount"));
      d.key = creditKey.current;
    }
    if (edit.action === "user") d.suspended = !edit.record.suspended;
    if (edit.action === "model" || edit.action === "package") {
      d.credits = Number(value("credits"));
      d.enabled = f.has("enabled");
    }
    if (edit.action === "package") {
      d.name = value("name");
      d.price = Number(value("price"));
    }
    if (edit.action === "character") {
      d.price = Number(value("price"));
      d.enabled = f.has("enabled");
      d.featured = f.has("featured");
    }
    if (edit.action === "listing" || edit.action === "report")
      d.status = value("status");
    saving.current = true;
    setBusy(true);
    try {
      await call("/api/admin", { action: edit.action, data: d });
      setEdit(null);
      toast.success("Change saved and recorded in the activity log.");
      await Promise.all([load(), onUpdated()]);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  const rows = data?.rows || [];
  const table = (headers: string[], body: React.ReactNode) => (
    <div className="admin-table">
      <table>
        <thead>
          <tr>
            {headers.map((h, index) => (
              <th key={index}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{body}</tbody>
      </table>
    </div>
  );
  const empty = (message: string) => (
    <div className="admin-empty">{message}</div>
  );
  return (
    <section className="super-admin">
      <header className="admin-heading">
        <div>
          <div className="admin-eyebrow">
            <ShieldCheck size={16} /> SUPER ADMIN
          </div>
          <h1>Platform control</h1>
          <p>Manage Model Drops accounts, catalog, credits, and operations.</p>
        </div>
        <Button variant="outline" disabled={loading} onClick={load}>
          <RefreshCw size={16} />
          Refresh
        </Button>
      </header>
      <div className="admin-notice">
        <AlertTriangle size={18} />
        <span>
          <strong>Preview environment.</strong> Credits and character access are
          demo data. Payments and live generation are not connected.
        </span>
        <button
          onClick={() => {
            setSection("integrations");
            setPage(0);
            setQuery("");
            setSearch("");
          }}
        >
          View integrations <ArrowUpRight size={14} />
        </button>
      </div>
      <Tabs
        value={section}
        onValueChange={(s) => {
          setSection(s);
          setPage(0);
          setQuery("");
          setSearch("");
        }}
      >
        <TabsList className="admin-tabs" aria-label="Administration sections">
          {sections.map((s) => (
            <TabsTrigger key={s} value={s.toLowerCase()}>
              {s}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {["users", "credits", "payments", "activity"].includes(section) && (
        <form
          className="admin-search"
          onSubmit={(e) => {
            e.preventDefault();
            setQuery(search);
            setPage(0);
          }}
        >
          <Search size={17} />
          <Input
            aria-label="Search administration records"
            placeholder={
              section === "activity"
                ? "Search action, account, or record ID"
                : "Search account email or ID"
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            maxLength={120}
          />
          <Button variant="outline">Search</Button>
        </form>
      )}
      <div aria-live="polite">
        {error ? (
          <div className="admin-error" role="alert">
            {error}
            <Button onClick={load}>Try again</Button>
          </div>
        ) : loading || data?._section !== section ? (
          <div className="admin-empty">Loading {section}…</div>
        ) : (
          data && (
            <>
              {section === "overview" && (
                <>
                  <div className="admin-metrics">
                    {[
                      [Users, "Users", data.metrics.users],
                      [Coins, "Demo credits in wallets", data.metrics.credits],
                      [Layers, "Generations", data.metrics.generations],
                      [
                        ShieldCheck,
                        "Training in progress",
                        data.metrics.training,
                      ],
                    ].map(([Icon, label, value]: any) => (
                      <div key={label}>
                        <Icon size={20} />
                        <span>{label}</span>
                        <strong>{fmt(value)}</strong>
                      </div>
                    ))}
                  </div>
                  <div className="admin-overview-grid">
                    <article>
                      <h2>Needs attention</h2>
                      <button onClick={() => setSection("moderation")}>
                        <span>Open reports</span>
                        <strong>{fmt(data.metrics.reports)}</strong>
                        <ArrowUpRight size={16} />
                      </button>
                      <button onClick={() => setSection("moderation")}>
                        <span>Creator submissions</span>
                        <strong>{fmt(data.metrics.submissions)}</strong>
                        <ArrowUpRight size={16} />
                      </button>
                      <button onClick={onTraining}>
                        <span>Training requests</span>
                        <strong>{fmt(data.metrics.training)}</strong>
                        <ArrowUpRight size={16} />
                      </button>
                    </article>
                    <article>
                      <h2>Account and generation health</h2>
                      <p>
                        <strong>{fmt(data.metrics.suspended)}</strong> suspended
                        accounts
                      </p>
                      <p>
                        <strong>{fmt(data.metrics.failed)}</strong> failed
                        generations
                      </p>
                      <p className="admin-muted">
                        Credit debits and refunds remain in an append-only
                        ledger. Review adjustments in Activity.
                      </p>
                    </article>
                  </div>
                  <Button onClick={onTraining}>
                    Open training administration <ArrowUpRight size={16} />
                  </Button>
                </>
              )}
              {section === "users" &&
                (rows.length
                  ? table(
                      [
                        "Account",
                        "Role / status",
                        "Demo credits",
                        "Joined",
                        "Actions",
                      ],
                      rows.map((u: any) => (
                        <tr key={u.id}>
                          <td>
                            <strong>{u.name}</strong>
                            <small>{u.email}</small>
                            <code>{u.id}</code>
                          </td>
                          <td>
                            <span className="admin-badge">
                              {data.roles[u.id] || "user"}
                            </span>
                            <small>
                              {u.suspended ? "Suspended" : "Active"}
                            </small>
                          </td>
                          <td>{fmt(u.balance)}</td>
                          <td>{date(u.created_at)}</td>
                          <td>
                            <div className="admin-actions">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  open("credits", u, "Adjust demo credits")
                                }
                              >
                                Adjust credits
                              </Button>
                              {!data.roles[u.id] && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    open(
                                      "user",
                                      u,
                                      u.suspended
                                        ? "Restore account"
                                        : "Suspend account",
                                    )
                                  }
                                >
                                  {u.suspended ? "Restore" : "Suspend"}
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )),
                    )
                  : empty(
                      "No matching accounts. Accounts appear after their first authenticated visit.",
                    ))}
              {section === "credits" && (
                <>
                  <p className="admin-muted">
                    Every grant, debit, refund, and adjustment. To adjust a
                    balance, select an account in Users.
                  </p>
                  {rows.length
                    ? table(
                        [
                          "Account",
                          "Change",
                          "Balance after",
                          "Reason",
                          "Date",
                        ],
                        rows.map((r: any) => (
                          <tr key={r.id}>
                            <td>
                              {r.email}
                              <small>{r.type}</small>
                            </td>
                            <td
                              className={r.amount > 0 ? "admin-positive" : ""}
                            >
                              {r.amount > 0 ? "+" : ""}
                              {fmt(r.amount)}
                            </td>
                            <td>{fmt(r.balance_after)}</td>
                            <td>{r.description}</td>
                            <td>{date(r.created_at)}</td>
                          </tr>
                        )),
                      )
                    : empty("No credit transactions match this filter.")}
                </>
              )}
              {section === "payments" && (
                <>
                  <h2>Credit packages</h2>
                  <p className="admin-muted">
                    Configure the displayed demo offers. Editing an offer does
                    not enable payment collection.
                  </p>
                  {table(
                    [
                      "Package",
                      "Display price (USD)",
                      "Credits",
                      "Availability",
                      "",
                    ],
                    data.packages.map((p: any) => (
                      <tr key={p.id}>
                        <td>{p.name}</td>
                        <td>${p.price}</td>
                        <td>{fmt(p.credits)}</td>
                        <td>{p.enabled ? "Enabled" : "Hidden"}</td>
                        <td>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              open("package", p, "Edit credit package")
                            }
                          >
                            Edit
                          </Button>
                        </td>
                      </tr>
                    )),
                  )}
                  <h2>Demo character access history</h2>
                  <p className="admin-muted">
                    These access grants are not payment receipts. Real charge
                    history and refunds require a connected payment provider.
                  </p>
                  {rows.length
                    ? table(
                        [
                          "Account",
                          "Character",
                          "Amount charged",
                          "Status",
                          "Date",
                        ],
                        rows.map((p: any) => (
                          <tr key={p.id}>
                            <td>{p.email}</td>
                            <td>{p.character_id}</td>
                            <td>${(p.price_cents / 100).toFixed(2)}</td>
                            <td>{p.status}</td>
                            <td>{date(p.created_at)}</td>
                          </tr>
                        )),
                      )
                    : empty(
                        "No character access grants yet. No live payments have been processed.",
                      )}
                </>
              )}
              {section === "models" && (
                <>
                  <p className="admin-muted">
                    Model availability and base credit costs apply to new
                    generation requests.
                  </p>
                  {table(
                    ["Model", "Provider", "Type", "Base credits", "Status", ""],
                    rows.map((m: any) => (
                      <tr key={m.id}>
                        <td>
                          <strong>{m.name}</strong>
                          <small>{m.id}</small>
                        </td>
                        <td>{m.provider}</td>
                        <td>{m.type}</td>
                        <td>{m.credits}</td>
                        <td>{m.enabled ? "Available" : "Disabled"}</td>
                        <td>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              open("model", m, "Edit generation model")
                            }
                          >
                            Edit
                          </Button>
                        </td>
                      </tr>
                    )),
                  )}
                </>
              )}
              {section === "characters" && (
                <>
                  <p className="admin-muted">
                    Control catalog visibility, featured placement, and
                    displayed sample prices. Disabled characters cannot be
                    claimed or used for new generations.
                  </p>
                  {table(
                    [
                      "Character",
                      "Category",
                      "Display price (USD)",
                      "Status",
                      "",
                    ],
                    rows.map((c: any) => (
                      <tr key={c.id}>
                        <td>
                          <div className="admin-character">
                            <img src={c.image} alt="" />
                            <div>
                              <strong>{c.name}</strong>
                              <small>{c.creator}</small>
                            </div>
                          </div>
                        </td>
                        <td>{c.category}</td>
                        <td>${c.price}</td>
                        <td>
                          {c.enabled ? "Visible" : "Disabled"}
                          {c.featured && <small>Featured</small>}
                        </td>
                        <td>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              open("character", c, "Edit character listing")
                            }
                          >
                            Edit
                          </Button>
                        </td>
                      </tr>
                    )),
                  )}
                </>
              )}
              {section === "moderation" && (
                <>
                  <h2>Creator submissions</h2>
                  {rows.length
                    ? rows.map((r: any) => (
                        <article className="admin-review" key={r.id}>
                          <div>
                            <strong>{r.name}</strong>
                            <small>{r.email}</small>
                            <p>{r.description}</p>
                          </div>
                          <Button
                            variant="outline"
                            onClick={() =>
                              open("listing", r, "Review creator submission")
                            }
                          >
                            Review
                          </Button>
                        </article>
                      ))
                    : empty("No pending creator submissions.")}
                  <h2>Open reports</h2>
                  {data.reports.length
                    ? data.reports.map((r: any) => (
                        <article className="admin-review" key={r.id}>
                          <div>
                            <strong>{r.character_id}</strong>
                            <small>{r.email}</small>
                            <p>{r.reason}</p>
                          </div>
                          <Button
                            variant="outline"
                            onClick={() => open("report", r, "Resolve report")}
                          >
                            Review
                          </Button>
                        </article>
                      ))
                    : empty("No open reports.")}
                </>
              )}
              {section === "activity" &&
                (rows.length
                  ? table(
                      ["Administrator", "Action", "Record", "Details", "Date"],
                      rows.map((r: any) => (
                        <tr key={r.id}>
                          <td>{r.email}</td>
                          <td>{r.action}</td>
                          <td>
                            <code>{r.entity_id}</code>
                          </td>
                          <td>
                            <details>
                              <summary>View change</summary>
                              <pre>
                                {JSON.stringify(
                                  JSON.parse(r.metadata),
                                  null,
                                  2,
                                )}
                              </pre>
                            </details>
                          </td>
                          <td>{date(r.created_at)}</td>
                        </tr>
                      )),
                    )
                  : empty("No administrative changes match this filter."))}
              {section === "integrations" && (
                <div className="admin-integrations">
                  {data.integrations.map((i: any) => (
                    <article key={i.name}>
                      <span className="admin-badge">{i.status}</span>
                      <h2>{i.name}</h2>
                      <p>{i.detail}</p>
                    </article>
                  ))}
                </div>
              )}
              {data.hasMore !== undefined && (
                <div className="admin-pagination">
                  <Button
                    variant="outline"
                    disabled={page === 0}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <span>Page {page + 1}</span>
                  <Button
                    variant="outline"
                    disabled={!data.hasMore}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )
        )}
      </div>
      <Dialog
        open={!!edit}
        onOpenChange={(open) => {
          if (!open && !busy) setEdit(null);
        }}
      >
        <DialogContent className="admin-edit">
          <DialogTitle>{edit?.title}</DialogTitle>
          <DialogDescription>
            Changes apply immediately and are recorded with your administrator
            account and reason.
          </DialogDescription>
          {edit && (
            <form onSubmit={save} key={edit.action + edit.record.id}>
              <div className="admin-edit-record">
                <strong>
                  {edit.record.name || edit.record.email || edit.record.id}
                </strong>
                {edit.record.email && <small>{edit.record.email}</small>}
              </div>
              {edit.action === "user" && (
                <p>
                  {edit.record.suspended
                    ? "Restore access to the workspace."
                    : "Suspend access to APIs, private files, and new requests. Existing records are retained."}
                </p>
              )}
              {edit.action === "credits" && (
                <>
                  <p>
                    Current demo balance:{" "}
                    <strong>{fmt(edit.record.balance)}</strong>
                  </p>
                  <label>
                    Credit adjustment
                    <Input
                      name="amount"
                      type="number"
                      step="1"
                      min="-1000000"
                      max="1000000"
                      placeholder="500 or -500"
                      required
                    />
                  </label>
                  <small>
                    Enter a positive amount to grant credits or a negative
                    amount to deduct.
                  </small>
                </>
              )}
              {edit.action === "package" && (
                <label>
                  Package name
                  <Input
                    name="name"
                    defaultValue={edit.record.name}
                    maxLength={200}
                    required
                  />
                </label>
              )}
              {["package", "character"].includes(edit.action) && (
                <label>
                  Displayed price (USD)
                  <Input
                    name="price"
                    type="number"
                    min={edit.action === "package" ? 1 : 0}
                    max={100000}
                    step="1"
                    defaultValue={edit.record.price}
                    required
                  />
                </label>
              )}
              {["model", "package"].includes(edit.action) && (
                <label>
                  {edit.action === "model"
                    ? "Base generation credits"
                    : "Package credits"}
                  <Input
                    name="credits"
                    type="number"
                    min="1"
                    max={edit.action === "model" ? 10000 : 1000000}
                    step="1"
                    defaultValue={edit.record.credits}
                    required
                  />
                </label>
              )}
              {["model", "package", "character"].includes(edit.action) && (
                <label className="admin-checkbox">
                  <input
                    name="enabled"
                    type="checkbox"
                    defaultChecked={!!edit.record.enabled}
                  />
                  Available to users
                </label>
              )}
              {edit.action === "character" && (
                <label className="admin-checkbox">
                  <input
                    name="featured"
                    type="checkbox"
                    defaultChecked={!!edit.record.featured}
                  />
                  Featured character
                </label>
              )}
              {["listing", "report"].includes(edit.action) && (
                <label>
                  Decision
                  <select name="status" required>
                    <option value="">Select decision</option>
                    {(edit.action === "listing"
                      ? ["approved", "rejected", "suspended"]
                      : ["resolved", "dismissed"]
                    ).map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label>
                Reason
                <textarea
                  name="reason"
                  minLength={5}
                  maxLength={500}
                  rows={3}
                  required
                  placeholder="Explain why this change is needed"
                />
              </label>
              <div className="admin-edit-actions">
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => setEdit(null)}
                >
                  Cancel
                </Button>
                <Button disabled={busy}>
                  {busy ? "Saving…" : "Confirm change"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
