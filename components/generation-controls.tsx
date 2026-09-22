"use client";
import { SlidersHorizontal, Plus, X, AudioLines } from "lucide-react";
import { type GenerationOptions } from "@/lib/generation/options";
type Props = {
  type: string;
  ratios: string[];
  ratio: string;
  resolution: string;
  outputs: string;
  seed: string;
  duration: string;
  negative: string;
  setNegative: (value: string) => void;
  options: GenerationOptions;
  setRatio: (value: string) => void;
  setResolution: (value: string) => void;
  setOutputs: (value: string) => void;
  setSeed: (value: string) => void;
  setDuration: (value: string) => void;
  onOptions: (value: GenerationOptions) => void;
};
export function GenerationControls(p: Props) {
  const update = (patch: Partial<GenerationOptions>) =>
    p.onOptions({ ...p.options, ...patch });
  const shotTotal = p.options.shots.reduce(
    (sum, shot) => sum + shot.duration,
    0,
  );
  return (
    <div className="generation-settings">
      <fieldset>
        <legend>
          Frame <span>Aspect ratio</span>
        </legend>
        <div className="ratio-options">
          {p.ratios
            .filter((ratio) => ratio !== "custom")
            .map((ratio) => {
              const [w, h] = ratio.split(":").map(Number);
              return (
                <button
                  key={ratio}
                  type="button"
                  aria-pressed={p.ratio === ratio}
                  onClick={() => {
                    p.setRatio(ratio);
                  }}
                >
                  <span
                    className="ratio-shape"
                    style={{
                      width: 26 * Math.min(1, w / h),
                      height: 26 * Math.min(1, h / w),
                    }}
                  />
                  {ratio}
                </button>
              );
            })}
        </div>
      </fieldset>

      <>
        <div className="standard-quality">
          <strong>Standard video quality</strong>
          <span>Resolution is managed by Kling. One video per generation.</span>
        </div>
        <label className="range-setting">
          <span>
            Duration <output>{p.duration} seconds</output>
          </span>
          <input
            aria-label="Video duration"
            type="range"
            min="3"
            max="15"
            step="1"
            value={p.duration}
            onChange={(e) => p.setDuration(e.target.value)}
          />
          <small>
            <span>3 seconds</span>
            <span>15 seconds</span>
          </small>
        </label>
        <label className="setting-toggle">
          <span>
            <AudioLines size={17} />
            <span>
              <strong>Generate sound</strong>
              <small>Include generated audio · 1.5× credits.</small>
            </span>
          </span>
          <input
            type="checkbox"
            checked={p.options.sound}
            onChange={(e) => update({ sound: e.target.checked })}
          />
        </label>
        <label className="range-setting">
          <span>
            Prompt guidance <output>{p.options.cfgScale.toFixed(2)}</output>
          </span>
          <input
            aria-label="Prompt guidance"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={p.options.cfgScale}
            onChange={(e) => update({ cfgScale: Number(e.target.value) })}
          />
          <small>
            <span>More creative</span>
            <span>Closer to prompt</span>
          </small>
        </label>
        <label className="format-setting">
          Shot planning
          <select
            value={p.options.shotType}
            onChange={(e) =>
              update({
                shotType: e.target.value as GenerationOptions["shotType"],
              })
            }
          >
            <option value="customize">Custom shots</option>
            <option value="intelligence">Automatic storyboard</option>
          </select>
        </label>
        {p.options.shotType === "customize" && (
          <div className="shot-editor">
            <p>
              Use the main prompt, or add a shot list to replace it. Shot
              lengths must total {p.duration} seconds.
            </p>
            {p.options.shots.map((shot, index) => (
              <div className="shot-row" key={index}>
                <div>
                  <strong>Shot {index + 1}</strong>
                  <button
                    type="button"
                    aria-label={`Remove shot ${index + 1}`}
                    onClick={() =>
                      update({
                        shots: p.options.shots.filter((_, i) => i !== index),
                      })
                    }
                  >
                    <X size={15} />
                  </button>
                </div>
                <textarea
                  aria-label={`Shot ${index + 1} prompt`}
                  placeholder="Describe this shot…"
                  maxLength={512}
                  value={shot.prompt}
                  onChange={(e) =>
                    update({
                      shots: p.options.shots.map((item, i) =>
                        i === index
                          ? { ...item, prompt: e.target.value }
                          : item,
                      ),
                    })
                  }
                />
                <label>
                  Seconds
                  <input
                    type="number"
                    min="1"
                    max="15"
                    value={shot.duration}
                    onChange={(e) =>
                      update({
                        shots: p.options.shots.map((item, i) =>
                          i === index
                            ? { ...item, duration: Number(e.target.value) }
                            : item,
                        ),
                      })
                    }
                  />
                </label>
              </div>
            ))}
            <div className="shot-footer">
              <button
                type="button"
                disabled={p.options.shots.length >= 6}
                onClick={() =>
                  update({
                    shots: [
                      ...p.options.shots,
                      {
                        prompt: "",
                        duration: Math.max(1, Number(p.duration) - shotTotal),
                      },
                    ],
                  })
                }
              >
                <Plus size={14} /> Add shot
              </button>
              {p.options.shots.length > 0 && (
                <span>
                  {shotTotal} / {p.duration} seconds
                </span>
              )}
            </div>
          </div>
        )}
      </>
      <details className="model-advanced">
        <summary>
          <SlidersHorizontal size={15} /> Advanced controls
        </summary>

        <label>
          Negative prompt<span>Optional · describe what to avoid</span>
          <textarea
            maxLength={1000}
            placeholder="Blur, unwanted motion, distorted objects…"
            value={p.negative}
            onChange={(e) => p.setNegative(e.target.value)}
          />
        </label>
      </details>
    </div>
  );
}
