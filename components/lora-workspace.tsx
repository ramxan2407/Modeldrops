"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  Download,
  FileImage,
  FlaskConical,
  ImagePlus,
  Layers,
  LoaderCircle,
  Lock,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  characterTypes,
  statuses,
  statusLabels,
  MIN_IMAGES,
  MAX_IMAGES,
  PART_SIZE,
  futureTrainingIntegrations,
  type TrainingRequest,
  type TrainingFile,
  type TrainingEvent,
  type TrainedLora,
  type LoraState,
  type TrainingStatus,
} from "@/lib/lora/types";
export type LoraView = "train-lora" | "my-loras" | "admin-training";
const bytes = (n: number) =>
  n >= 1073741824
    ? `${(n / 1073741824).toFixed(1)} GB`
    : `${(n / 1048576).toFixed(1)} MB`;
const date = (s: string | null) =>
  s
    ? new Date(s).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Not submitted";
const fileUrl = (id: string, download = false) =>
  `/api/lora/file?id=${encodeURIComponent(id)}${download ? "&download=1" : ""}`;
async function api<T = any>(action: string, data?: unknown): Promise<T> {
  const response = await fetch(
    data === undefined ? "/api/lora" + action : "/api/lora",
    {
      method: data === undefined ? "GET" : "POST",
      headers: data === undefined ? {} : { "Content-Type": "application/json" },
      ...(data === undefined ? {} : { body: JSON.stringify({ action, data }) }),
    },
  );
  const result = (await response.json()) as T & { error?: string };
  if (!response.ok)
    throw new Error(result.error || "Something went wrong. Please try again.");
  return result;
}
function upload(url: string, file: Blob, onProgress: (n: number) => void) {
  return new Promise<{ id: string }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.timeout = 120000;
    xhr.setRequestHeader("Content-Type", "application/octet-stream");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable)
        onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onerror = () =>
      reject(new Error("Upload connection lost. Try again to resume."));
    xhr.ontimeout = () =>
      reject(new Error("Upload timed out. Try again to resume."));
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) resolve(data);
        else reject(new Error(data.error || "Upload failed."));
      } catch {
        reject(new Error("Upload failed. Try again."));
      }
    };
    xhr.send(file);
  });
}
function Badge({ status }: { status: TrainingRequest["status"] }) {
  return (
    <span className={`lora-badge lora-status-${status}`}>
      <i />
      {statusLabels[status]}
    </span>
  );
}
function Field({
  label,
  optional,
  children,
}: {
  label: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="lora-field">
      <span>
        {label}
        {optional && <small>Optional</small>}
      </span>
      {children}
    </label>
  );
}
function Steps({ status = "draft" }: { status?: TrainingRequest["status"] }) {
  const steps: TrainingStatus[] = statuses.filter((s) => s !== "rejected");
  const current = steps.indexOf(status as TrainingStatus);
  return (
    <ol className="lora-steps">
      {steps.map((s, i) => (
        <li key={s} className={i <= current ? "is-active" : ""}>
          <span>
            {i < current || status === "completed" ? (
              <Check size={13} />
            ) : (
              i + 1
            )}
          </span>
          <div>
            {statusLabels[s]}
            <small>
              {
                [
                  "We review your dataset",
                  "Your request is accepted",
                  "Our team trains your character",
                  "We test consistency and quality",
                  "Your LoRA is ready to download",
                ][i]
              }
            </small>
          </div>
        </li>
      ))}
    </ol>
  );
}
type Detail = {
  request: TrainingRequest;
  files: TrainingFile[];
  events: TrainingEvent[];
  lora: TrainedLora | null;
};
export default function LoraWorkspace({
  view,
  isAdmin,
  onNavigate,
  onRefresh,
}: {
  view: LoraView;
  isAdmin: boolean;
  onNavigate: (view: LoraView) => void;
  onRefresh: () => void;
}) {
  const [state, setState] = useState<LoraState | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [detail, setDetail] = useState<Detail | null>(null),
    [resume, setResume] = useState<Detail | null>(null),
    [filter, setFilter] = useState("all"),
    [search, setSearch] = useState(""),
    [settings, setSettings] = useState(false),
    [maxMb, setMaxMb] = useState(10),
    [busy, setBusy] = useState(false);
  const admin = view === "admin-training";
  const refresh = useCallback(async () => {
    try {
      setError("");
      const result = await api<LoraState>(admin ? "?admin=1" : "");
      setState(result);
      setMaxMb(result.maxImageMb);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [admin]);
  useEffect(() => {
    setState(null);
    setLoading(true);
    void refresh();
  }, [refresh]);
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 30000);
    return () => clearInterval(timer);
  }, [refresh]);
  const show = async (id: string) => {
    try {
      setDetail(await api<Detail>("?request=" + encodeURIComponent(id)));
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  const changed = async () => {
    await refresh();
    onRefresh();
    if (detail) await show(detail.request.id);
  };
  const create = () => {
    setResume(null);
    onNavigate("train-lora");
  };
  if (admin && !isAdmin)
    return (
      <div className="lora-empty">
        <Lock />
        <h2>Administrator access required</h2>
        <p>This area is reserved for the training team.</p>
      </div>
    );
  if (loading && !state)
    return (
      <div className="lora-empty" role="status">
        <LoaderCircle className="lora-spin" />
        <p>Loading your training workspace…</p>
      </div>
    );
  if (!state)
    return (
      <div className="lora-empty" role="alert">
        <h2>We couldn’t load your workspace</h2>
        <p>{error}</p>
        <button onClick={refresh} className="lora-button">
          Try again
        </button>
      </div>
    );
  const visible = state.requests.filter(
    (r) =>
      (filter === "all" || r.status === filter) &&
      `${r.character_name} ${r.user_email} ${r.id}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <div className="lora-workspace">
      {error && (
        <div role="alert" className="lora-notice">
          {error}
          <button onClick={refresh}>Retry</button>
        </div>
      )}
      {view === "train-lora" ? (
        <TrainingForm
          key={resume?.request.id || "new"}
          resume={resume}
          maxImageMb={state.maxImageMb}
          onSubmitted={() => {
            setResume(null);
            onRefresh();
            onNavigate("my-loras");
            void refresh();
          }}
          onLibrary={() => onNavigate("my-loras")}
        />
      ) : (
        <>
          <div className="lora-heading">
            <div>
              <p className="lora-eyebrow">
                <FlaskConical size={14} />
                {admin ? "TRAINING OPERATIONS" : "YOUR CHARACTER, YOUR MODEL"}
              </p>
              <h1>
                {admin ? "Training requests" : "My LoRAs"}
                <span className="lora-heading-dot">.</span>
              </h1>
              <p>
                {admin
                  ? "Review datasets, manage manual training, and deliver finished models."
                  : "From the first reference to a character that’s unmistakably yours."}
              </p>
            </div>
            <button
              className={admin ? "lora-button" : "lime-button lora-primary"}
              onClick={admin ? () => setSettings(true) : create}
            >
              {admin ? <Settings2 size={16} /> : <Plus size={17} />}{" "}
              {admin ? "Training settings" : "Train a LoRA"}
            </button>
          </div>
          <div className="lora-stats">
            {[
              {
                label: admin ? "Total requests" : "Your requests",
                value: state.requests.filter((r) => r.status !== "draft")
                  .length,
                icon: Layers,
              },
              {
                label: "In progress",
                value: state.requests.filter((r) =>
                  ["approved", "training", "quality_check"].includes(r.status),
                ).length,
                icon: FlaskConical,
              },
              {
                label: admin ? "Completed" : "Ready to use",
                value: admin
                  ? state.requests.filter((r) => r.status === "completed")
                      .length
                  : state.loras.length,
                icon: CheckCircle2,
              },
            ].map((s) => (
              <div key={s.label}>
                <s.icon size={19} />
                <strong>{s.value}</strong>
                <span>{s.label}</span>
              </div>
            ))}
          </div>
          {!admin && (
            <section className="lora-library">
              <div className="lora-section-heading">
                <div>
                  <h2>Your LoRA library</h2>
                  <p>Private models, trained for you.</p>
                </div>
                <span>{state.loras.length} models</span>
              </div>
              {state.loras.length ? (
                <div className="lora-cards">
                  {state.loras.map((l) => (
                    <article className="lora-model-card" key={l.id}>
                      <button
                        className="lora-cover"
                        onClick={() => show(l.request_id)}
                      >
                        <img src={fileUrl(l.cover_id)} alt={l.name} />
                        <Badge status="completed" />
                      </button>
                      <div className="lora-model-body">
                        <small>CHARACTER LORA · v{l.version}</small>
                        <h3>{l.name}</h3>
                        <button
                          className="lora-trigger"
                          onClick={() =>
                            navigator.clipboard
                              .writeText(l.trigger_word)
                              .then(() => toast.success("Trigger word copied"))
                              .catch(() =>
                                toast.error(
                                  "Copy is unavailable in this browser.",
                                ),
                              )
                          }
                        >
                          <code>{l.trigger_word}</code>
                          <Copy size={13} />
                        </button>
                        <p>Created {date(l.created_at)}</p>
                        <div className="lora-card-actions">
                          <button
                            className="lora-button"
                            onClick={() => show(l.request_id)}
                          >
                            View details
                            <ArrowUpRight size={14} />
                          </button>
                          <a
                            className="lora-icon-button"
                            href={fileUrl(l.file_id, true)}
                            aria-label={`Download ${l.name}`}
                          >
                            <Download size={17} />
                          </a>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="lora-library-empty">
                  <div className="lora-mini-art">
                    <Layers size={34} />
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <h3>Your next character starts here.</h3>
                    <p>
                      Send us your references. Our team will train and deliver a
                      custom LoRA to this library.
                    </p>
                    <button onClick={create}>
                      Create your first LoRA <ArrowRight size={15} />
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}
          <section className="lora-panel">
            <div className="lora-section-heading">
              <div>
                <h2>{admin ? "Request queue" : "Training activity"}</h2>
                <p>
                  {admin
                    ? "Every request, from review to delivery."
                    : "Follow every step of your character’s training."}
                </p>
              </div>
              <button
                className="lora-icon-button"
                onClick={refresh}
                aria-label="Refresh requests"
              >
                <RefreshCw size={16} />
              </button>
            </div>
            <div className="lora-toolbar">
              <label className="lora-search">
                <Search size={16} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={
                    admin
                      ? "Search characters, users, or IDs"
                      : "Search your requests"
                  }
                  aria-label="Search requests"
                />
              </label>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger
                  className="lora-filter"
                  aria-label="Filter by status"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {!admin && <SelectItem value="draft">Drafts</SelectItem>}
                  {statuses.map((s) => (
                    <SelectItem key={s} value={s}>
                      {statusLabels[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {visible.length ? (
              <div className="lora-table-wrap">
                <Table className="lora-table">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Character / Request ID</TableHead>
                      {admin && <TableHead>User</TableHead>}
                      <TableHead>Submitted</TableHead>
                      <TableHead>Dataset</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>
                        <span className="sr-only">Actions</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visible.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <strong>{r.character_name}</strong>
                          <code title={r.id}>{r.id.slice(0, 8)}</code>
                        </TableCell>
                        {admin && (
                          <TableCell>
                            {r.user_name}
                            <small>{r.user_email}</small>
                          </TableCell>
                        )}
                        <TableCell>{date(r.submitted_at)}</TableCell>
                        <TableCell>
                          {r.status === "draft"
                            ? "Draft"
                            : `${r.image_count} images`}
                        </TableCell>
                        <TableCell>
                          <Badge status={r.status} />
                        </TableCell>
                        <TableCell>
                          <button
                            className="lora-table-action"
                            onClick={async () => {
                              if (r.status === "draft") {
                                try {
                                  setResume(
                                    await api<Detail>("?request=" + r.id),
                                  );
                                  onNavigate("train-lora");
                                } catch (e) {
                                  toast.error((e as Error).message);
                                }
                              } else await show(r.id);
                            }}
                          >
                            {r.status === "draft"
                              ? "Continue"
                              : admin
                                ? "Review"
                                : "Details"}
                            <ChevronRight size={14} />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="lora-empty lora-empty-small">
                <Clock size={24} />
                <h3>
                  {search || filter !== "all"
                    ? "No matching requests"
                    : "No training requests yet"}
                </h3>
                <p>
                  {admin
                    ? "New submissions will appear here."
                    : "Your submissions and status updates will appear here."}
                </p>
              </div>
            )}
          </section>
          {admin && (
            <div className="lora-admin-footer">
              <ShieldCheck size={17} />
              <p>
                Training is human operated. Datasets and model files are
                private.
              </p>
              <span>
                Email:{" "}
                {state.email?.configured
                  ? `${state.email.pending} queued${state.email.failed ? ` · ${state.email.failed} need attention` : ""}`
                  : "setup required"}
              </span>
            </div>
          )}
        </>
      )}
      <Dialog
        open={!!detail}
        onOpenChange={(open) => {
          if (!open) setDetail(null);
        }}
      >
        <DialogContent className="lora-dialog">
          {detail && (
            <RequestDetail
              detail={detail}
              admin={admin}
              onChange={changed}
              onClose={() => setDetail(null)}
            />
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={settings} onOpenChange={setSettings}>
        <DialogContent className="lora-dialog lora-settings">
          <DialogTitle>Training settings</DialogTitle>
          <DialogDescription>
            Manage upload limits and notification delivery.
          </DialogDescription>
          <Field label="Maximum image size (MB)">
            <input
              type="number"
              min={1}
              max={25}
              value={maxMb}
              onChange={(e) => setMaxMb(Number(e.target.value))}
            />
          </Field>
          <p className="lora-muted">
            Applies to new dataset and cover uploads. Allowed range: 1–25 MB per
            image.
          </p>
          <button
            disabled={busy}
            className="lime-button lora-primary"
            onClick={async () => {
              setBusy(true);
              try {
                await api("settings", { maxImageMb: maxMb });
                await refresh();
                toast.success("Training settings saved");
              } catch (e) {
                toast.error((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Save settings
          </button>
          <div className="lora-rule" />
          <h3>Email delivery</h3>
          <p className="lora-muted">
            {state.email?.configured
              ? `${state.email.pending} queued · ${state.email.failed} require provider-log review. Automatic retries require the scheduled email endpoint.`
              : "Add RESEND_API_KEY and LORA_EMAIL_FROM to enable email notifications. Requests and in-app notifications work independently; queued emails are retained."}
          </p>
          <button
            className="lora-button"
            disabled={busy || !state.email?.configured}
            onClick={async () => {
              setBusy(true);
              try {
                const result = await api("send-emails", {});
                toast.success(`${result.sent} emails sent`);
                await refresh();
              } catch (e) {
                toast.error((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Process queued emails
          </button>
          <div className="lora-rule" />
          <h3>Future integrations</h3>
          <div className="lora-tags">
            {futureTrainingIntegrations.map((name) => (
              <span key={name}>{name}</span>
            ))}
          </div>
          <p className="lora-muted">
            Architecture placeholders. All training currently happens on your
            team’s infrastructure.
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
type ImageItem = {
  key: string;
  file?: File;
  id?: string;
  name: string;
  size: number;
  url: string;
  progress: number;
  error?: string;
};
function TrainingForm({
  resume,
  maxImageMb,
  onSubmitted,
  onLibrary,
}: {
  resume: Detail | null;
  maxImageMb: number;
  onSubmitted: () => void;
  onLibrary: () => void;
}) {
  const r = resume?.request;
  const [form, setForm] = useState({
    characterName: r?.character_name || "",
    characterDescription: r?.character_description || "",
    characterType: r?.character_type || "Human",
    triggerWord: r?.trigger_word || "",
    notes: r?.notes || "",
    instructions: r?.instructions || "",
    referencePrompt: r?.reference_prompt || "",
  });
  const [images, setImages] = useState<ImageItem[]>(
      resume?.files
        .filter((f) => f.kind === "dataset")
        .map((f) => ({
          key: f.id,
          id: f.id,
          name: f.name,
          size: f.size,
          url: fileUrl(f.id),
          progress: 100,
        })) || [],
    ),
    [draftId, setDraftId] = useState(r?.id || ""),
    [busy, setBusy] = useState(false),
    [drag, setDrag] = useState(false),
    [error, setError] = useState(""),
    [discard, setDiscard] = useState(false);
  const input = useRef<HTMLInputElement>(null),
    urls = useRef<string[]>([]);
  useEffect(() => () => urls.current.forEach(URL.revokeObjectURL), []);
  const change = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));
  const add = (files: FileList | File[]) => {
    const accepted: ImageItem[] = [];
    let rejected = "";
    for (const file of Array.from(files)) {
      if (
        !/\.(jpe?g|png|webp)$/i.test(file.name) ||
        !["image/jpeg", "image/png", "image/webp"].includes(file.type)
      ) {
        rejected = "Only JPG, PNG, and WEBP images are supported.";
        continue;
      }
      if (!file.size || file.size > maxImageMb * 1048576) {
        rejected = `Images must be smaller than ${maxImageMb} MB.`;
        continue;
      }
      if (images.length + accepted.length >= MAX_IMAGES) {
        rejected = `You can upload up to ${MAX_IMAGES} images.`;
        break;
      }
      if (
        images.some((x) => x.name === file.name && x.size === file.size) ||
        accepted.some((x) => x.name === file.name && x.size === file.size)
      )
        continue;
      const url = URL.createObjectURL(file);
      urls.current.push(url);
      accepted.push({
        key: crypto.randomUUID(),
        file,
        name: file.name,
        size: file.size,
        url,
        progress: 0,
      });
    }
    setImages((x) => [...x, ...accepted]);
    if (rejected) toast.error(rejected);
  };
  const patch = (key: string, value: Partial<ImageItem>) =>
    setImages((items) =>
      items.map((item) => (item.key === key ? { ...item, ...value } : item)),
    );
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (images.length < MIN_IMAGES) {
      setError(`Add at least ${MIN_IMAGES} images to submit your request.`);
      return;
    }
    setBusy(true);
    setError("");
    try {
      let requestId = draftId;
      if (!requestId) {
        requestId = (await api("draft", form)).id;
        setDraftId(requestId);
      } else await api("update-draft", { ...form, id: requestId });
      for (const item of images) {
        if (item.id) continue;
        try {
          patch(item.key, { error: undefined });
          const result = await upload(
            `/api/lora/file?request=${requestId}&kind=dataset&name=${encodeURIComponent(item.name)}`,
            item.file!,
            (n) => patch(item.key, { progress: n }),
          );
          patch(item.key, { id: result.id, progress: 100 });
        } catch (e) {
          patch(item.key, { error: (e as Error).message });
          throw e;
        }
      }
      await api("submit", { id: requestId });
      toast.success("Training request submitted");
      onSubmitted();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <div className="lora-heading">
        <div>
          <p className="lora-eyebrow">
            <Sparkles size={14} />
            CUSTOM CHARACTER TRAINING
          </p>
          <h1>
            Make it uniquely yours<span className="lora-heading-dot">.</span>
          </h1>
          <p>
            A consistent character. Endless possibilities. Let’s train your
            LoRA.
          </p>
        </div>
        <button className="lora-button" onClick={onLibrary} disabled={busy}>
          My LoRAs <ArrowUpRight size={15} />
        </button>
      </div>
      <div className="lora-training-layout">
        <form className="lora-form" onSubmit={submit}>
          <fieldset disabled={busy} className="lora-panel">
            <div className="lora-section-heading">
              <div className="lora-section-title">
                <span className="lora-number">01</span>
                <div>
                  <h2>Meet your character</h2>
                  <p>Give your model a name and a little context.</p>
                </div>
              </div>
              <span className="lora-mini-label">CHARACTER INFO</span>
            </div>
            <Field label="Character name">
              <input
                required
                maxLength={120}
                placeholder="e.g. Nova, the space explorer"
                value={form.characterName}
                onChange={(e) => change("characterName", e.target.value)}
              />
            </Field>
            <Field label="Character description" optional>
              <textarea
                maxLength={4000}
                rows={2}
                placeholder="What makes your character unique?"
                value={form.characterDescription}
                onChange={(e) => change("characterDescription", e.target.value)}
              />
            </Field>
            <div className="lora-field">
              <span id="lora-character-type">Character type</span>
              <RadioGroup
                className="lora-type-options"
                aria-labelledby="lora-character-type"
                value={form.characterType}
                onValueChange={(value) => change("characterType", value)}
              >
                {characterTypes.map((type) => (
                  <label
                    key={type}
                    className={form.characterType === type ? "selected" : ""}
                    htmlFor={"lora-type-" + type}
                  >
                    <RadioGroupItem
                      id={"lora-type-" + type}
                      value={type}
                      className="sr-only"
                    />
                    {type}
                  </label>
                ))}
              </RadioGroup>
            </div>
          </fieldset>
          <fieldset disabled={busy} className="lora-panel">
            <div className="lora-section-heading">
              <div className="lora-section-title">
                <span className="lora-number">02</span>
                <div>
                  <h2>Build your dataset</h2>
                  <p>Great references make a great character.</p>
                </div>
              </div>
              <span
                className={`lora-count ${images.length >= 15 ? "ready" : ""}`}
              >
                {images.length} / 15 minimum
              </span>
            </div>
            <div
              className={`lora-dropzone ${drag ? "dragging" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                if (!busy) setDrag(true);
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDrag(false);
                if (!busy) add(e.dataTransfer.files);
              }}
            >
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                ref={input}
                onChange={(e) => {
                  if (e.target.files) add(e.target.files);
                  e.target.value = "";
                }}
                className="sr-only"
                aria-label="Upload dataset images"
                disabled={busy}
              />
              <div className="lora-upload-icon">
                <UploadCloud size={26} />
              </div>
              <h3>Drop your reference images here</h3>
              <p>
                or{" "}
                <button type="button" onClick={() => input.current?.click()}>
                  browse files
                </button>
              </p>
              <small>JPG, PNG, WEBP · Up to {maxImageMb} MB each</small>
            </div>
            <div className="lora-dataset-hints">
              <span>
                <CheckCircle2 size={14} />
                15 images minimum
              </span>
              <span>
                <ImagePlus size={14} />
                20–50 recommended
              </span>
              <span>
                <Lock size={13} />
                Private & secure
              </span>
            </div>
            {images.length > 0 && (
              <>
                <div className="lora-upload-summary">
                  <span>
                    {images.length} images ·{" "}
                    {bytes(images.reduce((s, i) => s + i.size, 0))}
                  </span>
                  <span>{images.filter((x) => x.id).length} uploaded</span>
                </div>
                <div className="lora-image-grid">
                  {images.map((item) => (
                    <div
                      key={item.key}
                      className={`lora-image-tile ${item.error ? "has-error" : ""}`}
                    >
                      <img src={item.url} alt={item.name} />
                      <button
                        type="button"
                        aria-label={`Remove ${item.name}`}
                        disabled={busy}
                        onClick={async () => {
                          try {
                            if (item.id)
                              await api("remove-file", { id: item.id });
                            setImages((items) =>
                              items.filter((i) => i.key !== item.key),
                            );
                            if (item.file) URL.revokeObjectURL(item.url);
                          } catch (e) {
                            toast.error((e as Error).message);
                          }
                        }}
                      >
                        <X size={13} />
                      </button>
                      {item.id ? (
                        <span className="lora-image-check">
                          <Check size={12} />
                        </span>
                      ) : (
                        <span className="lora-image-label">
                          {item.error
                            ? "Retry needed"
                            : busy
                              ? `${item.progress}%`
                              : "Ready"}
                        </span>
                      )}
                      {busy && !item.id && (
                        <Progress
                          max={100}
                          value={item.progress}
                          aria-label={`Uploading ${item.name}`}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
            <div className="lora-tip">
              <Sparkles size={16} />
              <p>
                <strong>A little variety goes a long way.</strong> Use sharp
                images with different angles, expressions, and backgrounds. Keep
                the same character across every image.
              </p>
            </div>
          </fieldset>
          <fieldset disabled={busy} className="lora-panel">
            <div className="lora-section-heading">
              <div className="lora-section-title">
                <span className="lora-number">03</span>
                <div>
                  <h2>The finer details</h2>
                  <p>Help our team understand your creative direction.</p>
                </div>
              </div>
            </div>
            <div className="lora-field-row">
              <Field label="Preferred trigger word" optional>
                <input
                  maxLength={100}
                  placeholder="e.g. nova_person"
                  value={form.triggerWord}
                  onChange={(e) => change("triggerWord", e.target.value)}
                />
              </Field>
              <div className="lora-field-explainer">
                A unique word you’ll use in prompts to activate your character.
              </div>
            </div>
            <Field label="Training notes" optional>
              <textarea
                maxLength={4000}
                rows={3}
                placeholder="Key features, visual style, or intended use…"
                value={form.notes}
                onChange={(e) => change("notes", e.target.value)}
              />
            </Field>
            <Field label="Special instructions" optional>
              <textarea
                maxLength={4000}
                rows={2}
                placeholder="Anything our training team should pay extra attention to?"
                value={form.instructions}
                onChange={(e) => change("instructions", e.target.value)}
              />
            </Field>
            <Field label="Reference prompt" optional>
              <textarea
                maxLength={4000}
                rows={2}
                placeholder="A portrait of nova_person, soft studio lighting…"
                value={form.referencePrompt}
                onChange={(e) => change("referencePrompt", e.target.value)}
              />
            </Field>
          </fieldset>
          {error && (
            <div className="lora-error" role="alert">
              {error}
            </div>
          )}
          <div className="lora-submit-bar">
            <p>
              <Lock size={14} /> Your dataset is only accessible to you and our
              training team.
            </p>
            <button
              type="submit"
              className="lime-button lora-primary"
              disabled={busy}
            >
              {busy ? (
                <>
                  <LoaderCircle size={16} className="lora-spin" />
                  Uploading & submitting…
                </>
              ) : (
                <>
                  Submit Training Request
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
          {draftId && (
            <button
              type="button"
              className="lora-text-button"
              disabled={busy}
              onClick={() => setDiscard(true)}
            >
              Discard saved draft
            </button>
          )}
        </form>
        <aside className="lora-training-aside">
          <div className="lora-journey-card">
            <div className="lora-orbit-art">
              <div />
              <div />
              <div />
              <FlaskConical size={33} />
              <span className="lora-orbit-spark">
                <Sparkles size={18} />
              </span>
            </div>
            <p className="lora-eyebrow">CRAFTED BY OUR TEAM</p>
            <h2>
              Your vision.
              <br />
              Expertly trained.
            </h2>
            <p>
              We handle training on our own infrastructure and deliver the
              finished LoRA directly to your account.
            </p>
            <div className="lora-rule" />
            <h3>From references to ready</h3>
            <Steps />
            <div className="lora-aside-note">
              <BellIcon />
              <span>
                Stay in the loop with in-app and email status updates.
              </span>
            </div>
          </div>
          <div className="lora-private-card">
            <ShieldCheck size={22} />
            <div>
              <h3>Private by design</h3>
              <p>
                Your references and trained models belong in your workspace.
                Never in a public gallery.
              </p>
            </div>
          </div>
        </aside>
      </div>
      <AlertDialog open={discard} onOpenChange={setDiscard}>
        <AlertDialogContent className="lora-dialog lora-settings">
          <AlertDialogTitle>Discard this draft?</AlertDialogTitle>
          <AlertDialogDescription>
            Uploaded reference images and saved character details will be
            permanently removed.
          </AlertDialogDescription>
          <div className="lora-actions">
            <button className="lora-button" onClick={() => setDiscard(false)}>
              Keep draft
            </button>
            <button
              className="lora-danger"
              onClick={async () => {
                setBusy(true);
                try {
                  await api("discard-draft", { id: draftId });
                  setDiscard(false);
                  onSubmitted();
                } catch (e) {
                  toast.error((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
              disabled={busy}
            >
              Discard draft
            </button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
function BellIcon() {
  return <Clock size={17} />;
}
function RequestDetail({
  detail,
  admin,
  onChange,
  onClose,
}: {
  detail: Detail;
  admin: boolean;
  onChange: () => Promise<void>;
  onClose: () => void;
}) {
  const { request: r, lora, files, events } = detail;
  const [busy, setBusy] = useState(false),
    [reason, setReason] = useState(""),
    [reject, setReject] = useState(false),
    [deleteConfirm, setDeleteConfirm] = useState(false),
    [progress, setProgress] = useState<number | null>(null),
    [preview, setPreview] = useState<TrainingFile | null>(null),
    [delivery, setDelivery] = useState({
      fileId: files.find((f) => f.kind === "weights" && f.ready)?.id || "",
      coverId: files.find((f) => f.kind === "cover" && f.ready)?.id || "",
      triggerWord: r.trigger_word,
      version: "1.0",
      recommendedPrompt: r.reference_prompt,
      description: "",
    });
  const weightSession = useRef<{ file: File; id: string } | null>(null);
  const mutate = async (action: string, data: unknown) => {
    setBusy(true);
    try {
      await api(action, data);
      await onChange();
      toast.success("Request updated");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const status = (next: TrainingStatus) =>
    mutate("status", {
      id: r.id,
      revision: r.revision,
      status: next,
      reason,
      delivery,
    });
  const uploadWeights = async (file: File) => {
    setBusy(true);
    setProgress(0);
    try {
      if (!weightSession.current || weightSession.current.file !== file)
        weightSession.current = {
          file,
          id: (
            await api("start-upload", {
              requestId: r.id,
              name: file.name,
              size: file.size,
            })
          ).id,
        };
      const uploadId = weightSession.current.id;
      const saved = await api<{ parts: number[] }>("?upload=" + uploadId);
      const total = Math.ceil(file.size / PART_SIZE);
      for (let i = 0; i < total; i++) {
        if (saved.parts.includes(i + 1)) {
          setProgress(Math.round(((i + 1) / total) * 100));
          continue;
        }
        let success = false;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            await upload(
              `/api/lora/file?upload=${uploadId}&part=${i + 1}`,
              file.slice(i * PART_SIZE, (i + 1) * PART_SIZE),
              (p) => setProgress(Math.round(((i + p / 100) / total) * 100)),
            );
            success = true;
            break;
          } catch (e) {
            if (attempt === 2) throw e;
          }
        }
        if (!success) throw new Error("Upload failed.");
      }
      await api("complete-upload", { id: uploadId });
      setDelivery((d) => ({ ...d, fileId: uploadId }));
      weightSession.current = null;
      await onChange();
      toast.success("LoRA file uploaded");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };
  return (
    <>
      <div className="lora-detail-heading">
        <div>
          <p className="lora-eyebrow">
            {admin ? "REQUEST REVIEW" : "TRAINING DETAILS"}
          </p>
          <DialogTitle>{r.character_name}</DialogTitle>
        </div>
        <Badge status={r.status} />
      </div>
      <DialogDescription>
        {r.character_type} · {r.image_count} references · Submitted{" "}
        {date(r.submitted_at)}
      </DialogDescription>
      <div className="lora-request-id">
        <code>{r.id}</code>
        <button
          aria-label="Copy request ID"
          onClick={() =>
            navigator.clipboard
              .writeText(r.id)
              .then(() => toast.success("Request ID copied"))
              .catch(() => toast.error("Copy unavailable"))
          }
        >
          <Copy size={13} />
        </button>
      </div>
      {admin && (
        <div className="lora-notice">
          <span>
            {r.user_name}
            <br />
            {r.user_email}
          </span>
          <span>{bytes(r.dataset_size)} dataset</span>
        </div>
      )}
      {lora ? (
        <div className="lora-delivered">
          <img src={fileUrl(lora.cover_id)} alt={lora.name} />
          <div>
            <span className="lora-eyebrow">
              READY TO CREATE · v{lora.version}
            </span>
            <h3>Your character is ready.</h3>
            <p>Created {date(lora.created_at)}</p>
            <div className="lora-actions">
              <a
                className="lime-button lora-primary"
                href={fileUrl(lora.file_id, true)}
              >
                <Download size={16} />
                Download LoRA
              </a>
              {!admin && (
                <button
                  className="lora-icon-button"
                  aria-label="Delete LoRA"
                  onClick={() => setDeleteConfirm(true)}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      ) : r.status === "completed" ? (
        <div className="lora-notice">
          This LoRA has been deleted from the user’s library.
        </div>
      ) : r.status === "rejected" ? (
        <div className="lora-error">
          <strong>Request rejected</strong>
          <p>{r.rejection_reason}</p>
        </div>
      ) : (
        <div className="lora-detail-progress">
          <Steps status={r.status} />
        </div>
      )}
      {lora && (
        <>
          <div className="lora-section-heading">
            <h3>Trigger word</h3>
            <button
              className="lora-text-button"
              onClick={() =>
                navigator.clipboard
                  .writeText(lora.trigger_word)
                  .then(() => toast.success("Trigger word copied"))
                  .catch(() => toast.error("Copy unavailable"))
              }
            >
              <Copy size={13} />
              Copy
            </button>
          </div>
          <pre className="lora-copy-block">{lora.trigger_word}</pre>
          <h3>Recommended prompt</h3>
          <pre className="lora-copy-block">{lora.recommended_prompt}</pre>
          {lora.description && (
            <p className="lora-preserve">{lora.description}</p>
          )}
        </>
      )}
      <div className="lora-rule" />
      {[
        ["Description", r.character_description],
        ["Preferred trigger word", r.trigger_word],
        ["Training notes", r.notes],
        ["Special instructions", r.instructions],
        ["Reference prompt", r.reference_prompt],
      ]
        .filter(([, value]) => value)
        .map(([label, value]) => (
          <div className="lora-detail-text" key={label}>
            <h3>{label}</h3>
            <p>{value}</p>
          </div>
        ))}
      <div className="lora-section-heading">
        <h3>Reference dataset</h3>
        {admin && (
          <a className="lora-button" href={`/api/lora/zip?request=${r.id}`}>
            <Download size={14} />
            Download ZIP
          </a>
        )}
      </div>
      <div className="lora-image-grid lora-detail-images">
        {files
          .filter((f) => f.kind === "dataset")
          .map((f) => (
            <button
              className="lora-image-tile"
              key={f.id}
              onClick={() => setPreview(f)}
            >
              <img loading="lazy" src={fileUrl(f.id)} alt={f.name} />
            </button>
          ))}
      </div>
      {admin && r.status === "quality_check" && (
        <section className="lora-delivery-form">
          <div className="lora-section-heading">
            <div>
              <h3>Deliver the finished LoRA</h3>
              <p>Upload the model you trained externally.</p>
            </div>
            <UploadCloud size={20} />
          </div>
          <fieldset disabled={busy}>
            <Field label="LoRA file (.safetensors)">
              <input
                type="file"
                accept=".safetensors"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadWeights(f);
                  e.target.value = "";
                }}
              />
            </Field>
            <p className="lora-muted">
              Up to 2 GB. Uploaded securely in 8 MB chunks.
            </p>
            {progress !== null && (
              <div role="status">
                <Progress value={progress} max={100} />
                <span>Uploading model · {progress}%</span>
              </div>
            )}
            {weightSession.current && progress === null && (
              <button
                type="button"
                className="lora-button"
                onClick={() => uploadWeights(weightSession.current!.file)}
              >
                Resume model upload
              </button>
            )}
            <Field label="Cover image">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (!f) return;
                  setBusy(true);
                  setProgress(0);
                  try {
                    const result = await upload(
                      `/api/lora/file?request=${r.id}&kind=cover&name=${encodeURIComponent(f.name)}`,
                      f,
                      setProgress,
                    );
                    setDelivery((d) => ({ ...d, coverId: result.id }));
                    await onChange();
                    toast.success("Cover image uploaded");
                  } catch (e) {
                    toast.error((e as Error).message);
                  } finally {
                    setBusy(false);
                    setProgress(null);
                  }
                }}
              />
            </Field>
            {files
              .filter((f) => f.kind !== "dataset")
              .map((f) => (
                <div className="lora-upload-row" key={f.id}>
                  <label>
                    <input
                      type="radio"
                      name={f.kind}
                      checked={
                        (f.kind === "weights"
                          ? delivery.fileId
                          : delivery.coverId) === f.id
                      }
                      disabled={!f.ready}
                      onChange={() =>
                        setDelivery((d) => ({
                          ...d,
                          [f.kind === "weights" ? "fileId" : "coverId"]: f.id,
                        }))
                      }
                    />
                    <span>
                      {f.name}
                      <small>
                        {bytes(f.size)} · {f.ready ? "Ready" : "Incomplete"}
                      </small>
                    </span>
                  </label>
                  <button
                    type="button"
                    className="lora-icon-button"
                    aria-label={`Remove ${f.name}`}
                    onClick={async () => {
                      await mutate("remove-file", { id: f.id });
                      setDelivery((d) => ({
                        ...d,
                        ...(d.fileId === f.id ? { fileId: "" } : {}),
                        ...(d.coverId === f.id ? { coverId: "" } : {}),
                      }));
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            <div className="lora-field-row">
              <Field label="Trigger word">
                <input
                  required
                  maxLength={120}
                  value={delivery.triggerWord}
                  onChange={(e) =>
                    setDelivery((d) => ({ ...d, triggerWord: e.target.value }))
                  }
                />
              </Field>
              <Field label="Version">
                <input
                  required
                  maxLength={40}
                  value={delivery.version}
                  onChange={(e) =>
                    setDelivery((d) => ({ ...d, version: e.target.value }))
                  }
                />
              </Field>
            </div>
            <Field label="Recommended prompt">
              <textarea
                required
                maxLength={4000}
                rows={3}
                value={delivery.recommendedPrompt}
                onChange={(e) =>
                  setDelivery((d) => ({
                    ...d,
                    recommendedPrompt: e.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Delivery notes" optional>
              <textarea
                maxLength={4000}
                rows={2}
                value={delivery.description}
                onChange={(e) =>
                  setDelivery((d) => ({ ...d, description: e.target.value }))
                }
              />
            </Field>
            <button
              type="button"
              className="lime-button lora-primary"
              disabled={
                busy ||
                !delivery.fileId ||
                !delivery.coverId ||
                !delivery.triggerWord.trim() ||
                !delivery.version.trim() ||
                !delivery.recommendedPrompt.trim()
              }
              onClick={() => status("completed")}
            >
              <CheckCircle2 size={16} />
              Mark Completed & Deliver
            </button>
          </fieldset>
        </section>
      )}
      {admin && !["completed", "rejected"].includes(r.status) && (
        <div className="lora-review-actions">
          {r.status === "pending" && (
            <button
              disabled={busy}
              className="lime-button lora-primary"
              onClick={() => status("approved")}
            >
              Approve request
              <Check size={16} />
            </button>
          )}
          {r.status === "approved" && (
            <button
              disabled={busy}
              className="lime-button lora-primary"
              onClick={() => status("training")}
            >
              Mark Training Started
              <FlaskConical size={16} />
            </button>
          )}
          {r.status === "training" && (
            <button
              disabled={busy}
              className="lime-button lora-primary"
              onClick={() => status("quality_check")}
            >
              Mark Quality Check
              <ShieldCheck size={16} />
            </button>
          )}
          {r.status === "quality_check" && (
            <button
              disabled={busy}
              className="lora-button"
              onClick={() => status("training")}
            >
              Return to training
            </button>
          )}
          <button
            disabled={busy}
            className="lora-danger"
            onClick={() => setReject(!reject)}
          >
            Reject request
          </button>
          {reject && (
            <div className="lora-reject">
              <Field label="Reason for rejection">
                <textarea
                  maxLength={2000}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain what needs to change. This is visible to the user."
                />
              </Field>
              <button
                className="lora-danger"
                disabled={busy || !reason.trim()}
                onClick={() => status("rejected")}
              >
                Confirm rejection
              </button>
            </div>
          )}
        </div>
      )}
      <div className="lora-rule" />
      <h3>Activity</h3>
      <ul className="lora-timeline">
        {events.map((event) => (
          <li key={event.id}>
            <i />
            <div>
              <strong>{statusLabels[event.status]}</strong>
              <p>{event.message}</p>
              <small>{new Date(event.created_at).toLocaleString()}</small>
            </div>
          </li>
        ))}
      </ul>
      <Dialog
        open={!!preview}
        onOpenChange={(open) => {
          if (!open) setPreview(null);
        }}
      >
        <DialogContent className="lora-dialog lora-preview">
          <DialogTitle>{preview?.name}</DialogTitle>
          <DialogDescription>Private reference image</DialogDescription>
          {preview && <img src={fileUrl(preview.id)} alt={preview.name} />}
        </DialogContent>
      </Dialog>
      <AlertDialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <AlertDialogContent className="lora-dialog lora-settings">
          <AlertDialogTitle>Delete this LoRA?</AlertDialogTitle>
          <AlertDialogDescription>
            The model file and cover will be permanently removed. The training
            request history will remain. Download a copy first if you want to
            keep it.
          </AlertDialogDescription>
          <div className="lora-actions">
            <button
              className="lora-button"
              onClick={() => setDeleteConfirm(false)}
            >
              Keep LoRA
            </button>
            <button
              disabled={busy}
              className="lora-danger"
              onClick={async () => {
                setBusy(true);
                try {
                  await api("delete-lora", { id: lora!.id });
                  await onChange();
                  setDeleteConfirm(false);
                  onClose();
                  toast.success("LoRA deleted");
                } catch (e) {
                  toast.error((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Delete permanently
            </button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
