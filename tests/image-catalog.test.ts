import test from "node:test";
import assert from "node:assert/strict";
import {
  imageCatalog,
  imageModels,
  imageDefinition,
  imageEndpoint,
} from "../lib/generation/images";
import {
  imageInput,
  schemaDefaults,
  type InputSchema,
  imageCredits,
} from "../lib/generation/image-schema";
import { quoteImage } from "../lib/generation/quote";
function sample(s: InputSchema, name: string): unknown {
  if (s.default !== undefined && s.default !== "") return s.default;
  if (s.enum) return s.enum[0];
  if (s.type === "object")
    return Object.fromEntries(
      (s.required || []).map((k) => [k, sample(s.properties![k], k)]),
    );
  if (s.type === "array")
    return Array.from({ length: Math.max(1, s.minItems || 0) }, () =>
      sample(s.items || { type: "string" }, name),
    );
  if (s.type === "boolean") return false;
  if (s.type === "integer" || s.type === "number") return s.minimum ?? 1;
  if (/image|mask|reference|path|sref/.test(name))
    return "https://example.com/reference.png";
  return "A product photograph";
}
test("Every imported image endpoint has usable schema controls and pricing metadata", () => {
  assert.equal(imageCatalog.length, 3);
  assert.equal(new Set(imageModels.map((m) => m.id)).size, imageCatalog.length);
  assert(!imageCatalog.some((m) => /video|\/t2v-|\/i2v-/.test(m.endpoint)));
  for (const def of imageCatalog) {
    const values = schemaDefaults(def.schema);
    for (const k of def.schema.required || [])
      if (k !== "prompt" && (values[k] === undefined || values[k] === ""))
        values[k] = sample(def.schema.properties![k], k);
    assert.doesNotThrow(
      () => imageInput(def, "A product photograph", values),
      def.endpoint,
    );
    assert(imageCredits(def.basePrice) >= 1);
  }
});
test("Input schemas reject unknown controls, invalid enums, required references, excess counts, and unsafe URLs", () => {
  const qwen = imageDefinition("wavespeed-qwen-image-edit")!;
  assert.throws(
    () =>
      imageInput(qwen, "prompt", {
        image: "https://example.com/x.png",
        num_images: 4,
      }),
    /unsupported field/,
  );
  assert.throws(
    () =>
      imageInput(qwen, "prompt", {
        image: "https://example.com/x.png",
        output_format: "exe",
      }),
    /supported value/,
  );
  assert.throws(
    () => imageInput(qwen, "prompt", { enable_sync_mode: true }),
    /managed/,
  );
  assert.throws(
    () =>
      imageInput(qwen, "prompt", {
        image: "https://example.com/x.png",
        size: "0*0",
      }),
    /positive whole/,
  );
  const edit = qwen;
  assert.throws(() => imageInput(edit, "Edit this image", {}), /required/);
  assert.throws(
    () => imageInput(edit, "Edit this image", { image: "http://127.0.0.1/x" }),
    /HTTPS/,
  );
  assert.equal(
    imageInput(edit, "Edit this image", {
      image: "asset:00000000-0000-4000-8000-000000000000",
    }).image,
    "asset:00000000-0000-4000-8000-000000000000",
  );
  const list = imageCatalog.find((m) => m.schema.properties?.images?.maxItems)!;
  assert.throws(
    () =>
      imageInput(list, "prompt", {
        images: Array(60).fill("https://example.com/x.png"),
      }),
    /items/,
  );
});
test("Live quotes use actual input pricing, preserve the retail rate, and fail closed", async () => {
  const endpoint = "wavespeed-ai/qwen-image/text-to-image";
  let sent: any;
  const fetcher: typeof fetch = async (url, init) => {
    assert(String(url).endsWith("/model/price"));
    sent = JSON.parse(init!.body as string);
    return Response.json({
      code: 200,
      data: {
        model_id: endpoint,
        price: 0.16,
        discounted_price: 0.08,
        currency: "USD",
      },
    });
  };
  const result = await quoteImage(
    { WAVESPEED_API_KEY: "test" },
    endpoint,
    { resolution: "4k" },
    fetcher,
  );
  assert.deepEqual(sent, { model_id: endpoint, inputs: { resolution: "4k" } });
  assert.deepEqual(result, {
    credits: 96,
    providerMicrousd: 80000,
    providerUsd: 0.16,
  });
  assert.equal(imageCredits(0.02), 12);
  assert.equal(imageCredits(0.003), 2);
  await assert.rejects(
    () =>
      quoteImage({}, endpoint, {}, async () =>
        Response.json({ code: 4005 }, { status: 400 }),
      ),
    /No credits/,
  );
  await assert.rejects(
    () =>
      quoteImage({}, endpoint, {}, async () =>
        Response.json({
          code: 200,
          data: {
            model_id: "wrong",
            price: 0.1,
            discounted_price: 0.1,
            currency: "USD",
          },
        }),
      ),
    /verified/,
  );
});
test("Only selected models are exposed; GPT references select the correct edit endpoint", () => {
  assert.equal(imageDefinition("wavespeed-qwen-image"), undefined);
  assert.equal(
    imageDefinition("wavespeed:wavespeed-ai/flux-schnell"),
    undefined,
  );
  for (const variant of ["flare", "sunburst"]) {
    const id = `wavespeed:openai/gpt-image-2.5-${variant}/text-to-image`;
    assert.equal(
      imageEndpoint(id, {}),
      `openai/gpt-image-2.5-${variant}/text-to-image`,
    );
    assert.equal(
      imageEndpoint(id, { images: ["https://example.com/x.png"] }),
      `openai/gpt-image-2.5-${variant}/edit`,
    );
    const def = imageDefinition(id)!;
    assert.equal(
      imageInput(def, "A landscape", { images: [] }).images,
      undefined,
    );
    assert.deepEqual(def.schema.properties?.resolution.enum, [
      "1k",
      "2k",
      "4k",
    ]);
    assert.equal(def.schema.properties?.quality.enum?.length, 5);
  }
});
