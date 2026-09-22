"use client";
import { SlidersHorizontal, Plus, X, AudioLines, Sparkles } from "lucide-react";
import { type HiggsfieldOptions } from "@/lib/higgsfield/options";

type Props = {
  type: string;
  ratios: string[];
  ratio: string;
  resolution: string;
  outputs: string;
  seed: string;
  duration: string;
  options: HiggsfieldOptions;
  setRatio: (value: string) => void;
  setResolution: (value: string) => void;
  setOutputs: (value: string) => void;
  setSeed: (value: string) => void;
  setDuration: (value: string) => void;
  onOptions: (value: HiggsfieldOptions) => void;
};
export function GenerationControls(p: Props) {
  const image = p.type === "image";
  const update = (patch: Partial<HiggsfieldOptions>) =>
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
          {p.ratios.map((ratio) => {
            const [w, h] = ratio.split(":").map(Number);
            return (
              <button
                key={ratio}
                type="button"
                aria-pressed={p.ratio === ratio}
                onClick={() => p.setRatio(ratio)}
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
      {image ? (
        <>
          <fieldset>
            <legend>
              Resolution <span>Output quality</span>
            </legend>
            <div className="quality-options">
              {["720", "1080"].map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={p.resolution === value}
                  onClick={() => p.setResolution(value)}
                >
                  <strong>{value}p</strong>
                  <span>
                    {value === "720" ? "Quick exploration" : "More detail"}
                  </span>
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>Images per generation</legend>
            <div className="quality-options compact">
              {["1", "4"].map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={p.outputs === value}
                  onClick={() => p.setOutputs(value)}
                >
                  {value} {value === "1" ? "image" : "images"}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="setting-toggle">
            <span>
              <Sparkles size={17} />
              <span>
                <strong>Prompt enhancement</strong>
                <small>Let Soul refine your prompt for richer detail.</small>
              </span>
            </span>
            <input
              type="checkbox"
              checked={p.options.enhancePrompt}
              onChange={(e) => update({ enhancePrompt: e.target.checked })}
            />
          </label>
        </>
      ) : (
        <>
          <div className="standard-quality">
            <strong>Standard video quality</strong>
            <span>
              Resolution is managed by Kling. One video per generation.
            </span>
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
                <small>Include model-generated audio with your video.</small>
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
          <label className="setting-toggle">
            <span>
              <span>
                <strong>Multiple shots</strong>
                <small>Create a sequence with up to six shot prompts.</small>
              </span>
            </span>
            <input
              type="checkbox"
              checked={p.options.multiShots}
              onChange={(e) => update({ multiShots: e.target.checked })}
            />
          </label>
          {p.options.multiShots && (
            <div className="shot-editor">
              <p>
                Let Kling plan your shots, or add a shot list. Shot lengths must
                total {p.duration} seconds.
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
      )}
      <details className="model-advanced">
        <summary>
          <SlidersHorizontal size={15} /> Advanced controls
        </summary>
        {image ? (
          <>
            <label>
              Seed <span>Optional · 1 to 1,000,000</span>
              <input
                type="number"
                min="1"
                max="1000000"
                step="1"
                placeholder="Random"
                value={p.seed}
                onChange={(e) => p.setSeed(e.target.value)}
              />
            </label>
            <label>
              Style preset ID <span>Optional · Higgsfield style UUID</span>
              <input
                type="text"
                placeholder="Paste a style UUID"
                value={p.options.styleId}
                onChange={(e) => update({ styleId: e.target.value.trim() })}
              />
            </label>
            <p>
              Use an existing Soul style identifier. Leave blank for the model’s
              default style.
            </p>
          </>
        ) : (
          <label>
            Element references{" "}
            <span>Optional · one existing element ID per line</span>
            <textarea
              placeholder="Paste existing Kling element references"
              value={p.options.elements.join("\n")}
              onChange={(e) => update({ elements: e.target.value.split("\n") })}
            />
            <small>
              Use references already supported by your provider account. This
              field does not upload or create elements.
            </small>
          </label>
        )}
      </details>
    </div>
  );
}
