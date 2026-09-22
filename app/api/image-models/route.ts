import { z } from "zod";
import { auth, assertOrigin, bindings, ApiError, fail } from "@/lib/server";
import {
  imageDefinition,
  imageEndpoint,
  catalogSyncedAt,
} from "@/lib/generation/images";
import { imageInput } from "@/lib/generation/image-schema";
import { generationEnabled } from "@/lib/generation/models";
import { resolveImageReferences } from "@/lib/generation/references";
import { quoteImage } from "@/lib/generation/quote";
export async function GET(request: Request) {
  try {
    await auth();
    const definition = imageDefinition(
      new URL(request.url).searchParams.get("id") || "",
    );
    if (!definition) throw new ApiError(404, "Image model not found.");
    return Response.json(
      { definition, syncedAt: catalogSyncedAt },
      { headers: { "Cache-Control": "private, max-age=300" } },
    );
  } catch (e) {
    return fail(e);
  }
}
export async function POST(request: Request) {
  try {
    assertOrigin(request);
    const user = await auth();
    if (!generationEnabled(bindings()))
      throw new ApiError(503, "Image generation is unavailable.");
    const d = z
      .object({
        modelId: z.string().max(200),
        prompt: z.string().max(16000),
        inputs: z.record(z.unknown()),
      })
      .parse(await request.json());
    const model = imageDefinition(d.modelId);
    if (!model) throw new ApiError(404, "Image model not found.");
    const enabled = await bindings()
      .DB.prepare("SELECT enabled FROM ai_models WHERE id=?")
      .bind(d.modelId)
      .first<{ enabled: number }>();
    if (!enabled?.enabled) throw new ApiError(400, "This model is disabled.");
    let input: Record<string, unknown>;
    try {
      input = imageInput(model, d.prompt, d.inputs);
    } catch (e) {
      throw new ApiError(400, (e as Error).message);
    }
    input = await resolveImageReferences(input, user.userId);
    try {
      return Response.json(
        await quoteImage(bindings(), imageEndpoint(d.modelId, input), input),
        { headers: { "Cache-Control": "private, no-store" } },
      );
    } catch (e) {
      throw new ApiError(422, (e as Error).message);
    }
  } catch (e) {
    return fail(e);
  }
}
