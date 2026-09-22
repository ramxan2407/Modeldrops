"use client";
import { useEffect, useState } from "react";
import { Plus, X, Upload, LoaderCircle } from "lucide-react";
import {
  type ImageDefinition,
  type InputSchema,
  fieldLabel,
  mediaField,
  managedFields,
  schemaDefaults,
} from "@/lib/generation/image-schema";
import { uploadFile } from "@/lib/upload-client";
export type ImageQuote = {
  key: string;
  credits?: number;
  error?: string;
  hasPrompt?: boolean;
  promptRequired?: boolean;
};
export const imageQuoteKey = (
  modelId: string,
  prompt: string,
  inputs: Record<string, unknown>,
) => JSON.stringify([modelId, prompt, inputs]);
export function ImageModelPicker({
  models,
  value,
  onChange,
}: {
  models: {
    id: string;
    name: string;
    credits: number;
    category?: string;
    publisher?: string;
  }[];
  value: string;
  onChange: (s: string) => void;
}) {
  return (
    <div className="image-model-picker">
      <select
        aria-label="Image model"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {models.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name} · from {m.credits} credits
          </option>
        ))}
      </select>
      <small className="field-note">
        {models.length} image models · Final price follows your settings.
      </small>
    </div>
  );
}
export function ImageModelControls({
  modelId,
  prompt,
  values,
  onChange,
  onQuote,
}: {
  modelId: string;
  prompt: string;
  values: Record<string, unknown> | undefined;
  onChange: (v: Record<string, unknown>) => void;
  onQuote: (q: ImageQuote) => void;
}) {
  const [quoteRevision, setQuoteRevision] = useState(0);
  const [definition, setDefinition] = useState<ImageDefinition | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setDefinition(null);
    setError("");
    fetch(`/api/image-models?id=${encodeURIComponent(modelId)}`)
      .then(async (r) => {
        const d = (await r.json()) as {
          error?: string;
          definition: ImageDefinition;
          credits: number;
        };
        if (!r.ok) throw Error(d.error || "Could not load model controls.");
        return d;
      })
      .then((d) => {
        if (active) setDefinition(d.definition);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [modelId]);
  useEffect(() => {
    if (definition && values === undefined)
      onChange(schemaDefaults(definition.schema));
  }, [definition, values, onChange]);
  const inputKey = imageQuoteKey(modelId, prompt, values || {});
  useEffect(() => {
    if (!definition || values === undefined) return;
    const info = {
      hasPrompt: !!definition.schema.properties?.prompt,
      promptRequired: !!definition.schema.required?.includes("prompt"),
    };
    const abort = new AbortController();
    onQuote({ key: inputKey, ...info });
    const timer = setTimeout(() => {
      fetch("/api/image-models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelId, prompt, inputs: values }),
        signal: abort.signal,
      })
        .then(async (r) => {
          const d = (await r.json()) as {
            error?: string;
            definition: ImageDefinition;
            credits: number;
          };
          if (!r.ok) throw Error(d.error || "Could not price these settings.");
          return d;
        })
        .then((q) => {
          if (!abort.signal.aborted)
            onQuote({ key: inputKey, credits: q.credits, ...info });
        })
        .catch((e) => {
          if (!abort.signal.aborted)
            onQuote({ key: inputKey, error: e.message, ...info });
        });
    }, 650);
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [definition, inputKey, onQuote, quoteRevision]); // inputKey includes all price-relevant inputs.
  if (error)
    return (
      <p role="alert" className="settings-error">
        {error}
      </p>
    );
  if (!definition || values === undefined)
    return (
      <p className="field-note">
        <LoaderCircle className="spin" size={14} /> Loading model controls…
      </p>
    );
  const properties = definition.schema.properties || {};
  const order = [
    ...new Set([
      ...(definition.schema["x-order-properties"] || []),
      ...Object.keys(properties),
    ]),
  ].filter((k) => properties[k] && k !== "prompt" && !managedFields.has(k));
  return (
    <div className="image-schema-controls">
      <div className="standard-quality">
        <strong>
          {definition.endpoint.startsWith("openai/")
            ? Array.isArray(values.images) && values.images.length
              ? "Reference image editing"
              : "Text to image"
            : "Reference image editing"}
        </strong>
        <span>
          {definition.endpoint.startsWith("openai/")
            ? "Add optional references to edit, or leave them empty to create from text."
            : "Upload a reference and describe the changes you want."}{" "}
          One image per request.
        </span>
      </div>
      {order.map((k) => (
        <SchemaField
          key={k}
          name={k}
          schema={properties[k]}
          value={values[k]}
          required={definition.schema.required?.includes(k)}
          onChange={(v) => {
            const next = { ...values };
            if (v === undefined) delete next[k];
            else next[k] = v;
            onChange(next);
          }}
        />
      ))}
      <button
        className="schema-reset"
        type="button"
        onClick={() => setQuoteRevision((v) => v + 1)}
      >
        Refresh price
      </button>
    </div>
  );
}
function SchemaField({
  name,
  schema: s,
  value,
  required,
  onChange,
}: {
  name: string;
  schema: InputSchema;
  value: unknown;
  required?: boolean;
  onChange: (v: unknown) => void;
}) {
  const [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(0),
    [error, setError] = useState("");
  const label =
      name === "images"
        ? "Reference images (optional)"
        : name === "image"
          ? "Reference image"
          : fieldLabel(name),
    isMedia = mediaField(name, s),
    isArray = s.type === "array",
    array = Array.isArray(value) ? value : [];
  const upload = async (files: FileList | null) => {
    if (!files) return;
    setBusy(true);
    setError("");
    try {
      if (isArray && array.length + files.length > (s.maxItems ?? 50))
        throw Error(`Use up to ${s.maxItems ?? 50} reference images.`);
      const additions: string[] = [];
      for (const file of Array.from(files)) {
        if (file.size > 8 * 1024 * 1024)
          throw Error("Use images smaller than 8 MB.");
        const result = await uploadFile("/api/upload", file, setProgress, true);
        additions.push(`asset:${result.id}`);
      }
      onChange(
        isArray
          ? [...array, ...additions].slice(0, s.maxItems ?? 50)
          : additions[0],
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  let control;
  if (typeof value === "string" && value.startsWith("asset:"))
    control = <span className="field-note">Private reference uploaded</span>;
  else if (s.enum)
    control = (
      <select
        aria-label={label}
        value={value === undefined ? "" : JSON.stringify(value)}
        onChange={(e) =>
          onChange(
            e.target.value === "" ? undefined : JSON.parse(e.target.value),
          )
        }
      >
        <option value="">
          {required ? "Choose an option" : "Model default"}
        </option>
        {s.enum.map((v, i) => (
          <option key={i} value={JSON.stringify(v)}>
            {String(v)}
          </option>
        ))}
      </select>
    );
  else if (s.type === "boolean")
    control = (
      <input
        aria-label={label}
        type="checkbox"
        checked={value === true}
        onChange={(e) => onChange(e.target.checked)}
      />
    );
  else if (s.type === "object" || s.properties)
    control = (
      <div className="schema-nested">
        {Object.entries(s.properties || {}).map(([k, p]) => (
          <SchemaField
            key={k}
            name={k}
            schema={p}
            required={s.required?.includes(k)}
            value={(value as Record<string, unknown>)?.[k]}
            onChange={(v) =>
              onChange({
                ...((value as Record<string, unknown>) || {}),
                [k]: v,
              })
            }
          />
        ))}
      </div>
    );
  else if (isArray)
    control = (
      <div className="schema-array">
        {array.map((item, i) => (
          <div className="schema-array-row" key={i}>
            <SchemaField
              name={`${name} ${i + 1}`}
              schema={s.items || { type: "string" }}
              value={item}
              onChange={(v) => onChange(array.map((x, j) => (j === i ? v : x)))}
            />
            {isMedia &&
              typeof item === "string" &&
              item.startsWith("asset:") && (
                <img
                  src={`/api/upload?id=${item.slice(6)}`}
                  alt={`${label} ${i + 1}`}
                />
              )}
            <button
              type="button"
              aria-label={`Remove ${label} ${i + 1}`}
              onClick={() => onChange(array.filter((_, j) => j !== i))}
            >
              <X size={15} />
            </button>
          </div>
        ))}
        <button
          type="button"
          disabled={array.length >= Math.min(s.maxItems ?? 50, 50)}
          onClick={() =>
            onChange([
              ...array,
              s.items?.type === "object"
                ? schemaDefaults(s.items)
                : (s.items?.default ?? ""),
            ])
          }
        >
          <Plus size={14} /> Add {label.toLowerCase()}
        </button>
      </div>
    );
  else if (s.type === "number" || s.type === "integer")
    control = (
      <input
        aria-label={label}
        type="number"
        step={s.type === "integer" ? 1 : "any"}
        min={s.minimum}
        max={s.maximum}
        value={typeof value === "number" ? value : ""}
        placeholder={
          s.default !== undefined ? String(s.default) : "Model default"
        }
        onChange={(e) =>
          onChange(e.target.value === "" ? undefined : Number(e.target.value))
        }
      />
    );
  else if (name === "size" && !s.enum)
    control = (
      <div className="schema-size">
        <div className="dimension-inputs">
          {["Width", "Height"].map((axis, i) => (
            <label key={axis}>
              {axis}
              <input
                aria-label={`Image ${axis.toLowerCase()}`}
                type="number"
                min="1"
                step="1"
                placeholder="Auto"
                value={
                  typeof value === "string" ? value.split("*")[i] || "" : ""
                }
                onChange={(e) => {
                  if (!e.target.value) {
                    onChange(undefined);
                    return;
                  }
                  const size =
                    typeof value === "string"
                      ? value.split("*")
                      : ["1024", "1024"];
                  size[i] = e.target.value;
                  onChange(size.join("*"));
                }}
              />
            </label>
          ))}
        </div>
        <small>
          Optional output dimensions in pixels. Leave blank to use the model's
          default.
        </small>
      </div>
    );
  else
    control = (
      <textarea
        aria-label={label}
        rows={isMedia ? 2 : 3}
        maxLength={Math.min(s.maxLength ?? 16000, 16000)}
        placeholder={
          isMedia
            ? "Upload below or enter a public HTTPS image URL"
            : s.default !== undefined
              ? String(s.default)
              : required
                ? "Required"
                : "Optional"
        }
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value || undefined)}
      />
    );
  return (
    <div
      className={`schema-field ${s.type === "boolean" ? "schema-checkbox" : ""}`}
    >
      <label>
        {label}
        {required && <span className="required-mark"> *</span>}
      </label>
      {control}
      {isMedia && (
        <>
          <label className="schema-upload">
            <Upload size={15} />
            {busy ? `Uploading ${progress}%` : "Upload reference image"}
            <input
              aria-label={`Upload ${label}`}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple={isArray}
              disabled={busy}
              onChange={(e) => {
                void upload(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
          {!isArray &&
            typeof value === "string" &&
            value.startsWith("asset:") && (
              <img
                className="schema-reference-preview"
                src={`/api/upload?id=${value.slice(6)}`}
                alt={label}
              />
            )}
          <small>Private storage · PNG, JPG, WEBP · up to 8 MB each</small>
        </>
      )}
      {s.description && (
        <details className="schema-help">
          <summary>About {label.toLowerCase()}</summary>
          <p>{s.description}</p>
        </details>
      )}
      {error && (
        <p role="alert" className="settings-error">
          {error}
        </p>
      )}
      {value !== undefined &&
        (!required || isMedia) &&
        s.type !== "boolean" && (
          <button
            className="schema-reset"
            type="button"
            onClick={() => onChange(undefined)}
          >
            {isMedia ? "Remove reference" : "Use default"}
          </button>
        )}
    </div>
  );
}
