import { waitUntil } from "cloudflare:workers";
import { assertOrigin } from "@/lib/server";
import { z } from "zod";
import { loraService, loraFailure, boundedBytes } from "@/lib/lora/http";
import { deliverTrainingEmails } from "@/lib/lora/email";
import { LoraError, statuses } from "@/lib/lora/types";
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
    const { action, data } = parsed.data;
    const recordId = () => z.string().uuid().parse(data.id);
    let result;
    switch (action) {
      case "draft":
        result = await service.createDraft(data);
        break;
      case "update-draft":
        result = await service.updateDraft(recordId(), data);
        break;
      case "discard-draft":
        result = await service.deleteDraft(recordId());
        break;
      case "remove-file":
        result = await service.removeFile(recordId());
        break;
      case "submit":
        result = await service.submit(recordId());
        break;
      case "status":
        result = await service.transition(
          recordId(),
          z.number().int().parse(data.revision),
          z.enum(statuses).parse(data.status),
          z.string().optional().parse(data.reason) || "",
          data.delivery,
        );
        break;
      case "start-upload":
        result = await service.startWeights(
          z.string().uuid().parse(data.requestId),
          z.string().parse(data.name),
          z.number().parse(data.size),
        );
        break;
      case "complete-upload":
        result = await service.completeWeights(recordId());
        break;
      case "delete-lora":
        result = await service.deleteLora(recordId());
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
