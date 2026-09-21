import { waitUntil } from "cloudflare:workers";
import { assertOrigin } from "@/lib/server";
import { z } from "zod";
import { loraService, loraFailure, boundedBytes } from "@/lib/lora/http";
import { deliverTrainingEmails } from "@/lib/lora/email";
import { LoraError } from "@/lib/lora/types";
export async function GET(request: Request) {
  try {
    const service = await loraService();
    const p = new URL(request.url).searchParams;
    const result = p.get("request")
      ? await service.detail(p.get("request")!)
      : p.get("upload")
        ? await service.uploadProgress(p.get("upload")!)
        : await service.state(p.get("admin") === "1");
    return Response.json(result, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    return loraFailure(e);
  }
}
export async function POST(request: Request) {
  try {
    assertOrigin(request);
    if (Number(request.headers.get("content-length")) > 32768)
      throw new LoraError(413, "Request is too large.");
    const service = await loraService();
    let payload: unknown;
    try {
      payload = JSON.parse(
        new TextDecoder().decode(await boundedBytes(request, 32768)),
      );
    } catch (e) {
      if (e instanceof LoraError) throw e;
      throw new LoraError(400, "Invalid JSON request.");
    }
    const parsed = z
      .object({ action: z.string(), data: z.record(z.unknown()).default({}) })
      .safeParse(payload);
    if (!parsed.success) throw new LoraError(400, "Invalid training request.");
    const { action, data } = parsed.data as {
      action: string;
      data: Record<string, any>;
    };
    if (
      [
        "update-draft",
        "discard-draft",
        "remove-file",
        "submit",
        "status",
        "complete-upload",
        "delete-lora",
      ].includes(action) &&
      !z.string().uuid().safeParse(data.id).success
    )
      throw new LoraError(400, "A valid record ID is required.");
    if (
      action === "status" &&
      (!Number.isSafeInteger(data.revision) ||
        typeof data.status !== "string" ||
        (data.reason !== undefined && typeof data.reason !== "string"))
    )
      throw new LoraError(400, "Invalid status update.");
    if (
      action === "start-upload" &&
      (!z.string().uuid().safeParse(data.requestId).success ||
        typeof data.name !== "string" ||
        typeof data.size !== "number")
    )
      throw new LoraError(400, "Invalid upload details.");
    let result;
    switch (action) {
      case "draft":
        result = await service.createDraft(data);
        break;
      case "update-draft":
        result = await service.updateDraft(data.id, data);
        break;
      case "discard-draft":
        result = await service.deleteDraft(data.id);
        break;
      case "remove-file":
        result = await service.removeFile(data.id);
        break;
      case "submit":
        result = await service.submit(data.id);
        break;
      case "status":
        result = await service.transition(
          data.id,
          data.revision,
          data.status,
          data.reason || "",
          data.delivery,
        );
        break;
      case "start-upload":
        result = await service.startWeights(
          data.requestId,
          data.name,
          data.size,
        );
        break;
      case "complete-upload":
        result = await service.completeWeights(data.id);
        break;
      case "delete-lora":
        result = await service.deleteLora(data.id);
        break;
      case "settings":
        result = await service.setSettings(data);
        break;
      case "send-emails":
        service.requireAdmin();
        result = await deliverTrainingEmails(service.env);
        break;
      default:
        throw new LoraError(400, "Unknown training action.");
    }
    if (action === "submit" || action === "status")
      waitUntil(deliverTrainingEmails(service.env).catch(() => {}));
    return Response.json(result, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    return loraFailure(e);
  }
}
