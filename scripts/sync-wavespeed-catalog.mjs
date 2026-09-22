import fs from "node:fs/promises";
const key = process.env.WAVESPEED_API_KEY?.trim();
if (!key) throw Error("WAVESPEED_API_KEY is required");
const response = await fetch("https://api.wavespeed.ai/api/v3/models", {
  headers: { Authorization: `Bearer ${key}` },
  signal: AbortSignal.timeout(30000),
});
if (!response.ok) throw Error(`Catalog HTTP ${response.status}`);
const body = await response.json();
if (body.code !== 200 || !Array.isArray(body.data))
  throw Error("Invalid catalog");
const selectedEndpoints = new Set([
  "wavespeed-ai/qwen-image/edit",
  "openai/gpt-image-2.5-flare/text-to-image",
  "openai/gpt-image-2.5-flare/edit",
  "openai/gpt-image-2.5-sunburst/text-to-image",
  "openai/gpt-image-2.5-sunburst/edit",
]);
const images = body.data
  .filter((m) => selectedEndpoints.has(m.model_id))
  .map((m) => {
    const run = m.api_schema?.api_schemas?.find(
      (s) => s.type === "model_run" && s.method === "POST",
    );
    if (
      !run?.request_schema?.properties ||
      run.api_path !== `/api/v3/${m.model_id}` ||
      !/^[a-zA-Z0-9/_.-]+$/.test(m.model_id) ||
      !Number.isFinite(m.base_price) ||
      m.base_price < 0
    )
      throw Error(`Unsupported catalog entry: ${m.model_id}`);
    return {
      endpoint: m.model_id,
      category: m.type,
      basePrice: m.base_price,
      description: m.description,
      schema: run.request_schema,
    };
  });
if (
  images.length !== selectedEndpoints.size ||
  new Set(images.map((m) => m.endpoint)).size !== images.length
)
  throw Error("Incomplete or duplicated image catalog");
await fs.writeFile(
  "lib/generation/image-catalog.json",
  JSON.stringify(
    {
      syncedAt: new Date().toISOString(),
      source: "https://api.wavespeed.ai/api/v3/models",
      images,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `Saved ${images.length} image models with input schemas and base prices.`,
);
