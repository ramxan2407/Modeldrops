import {
  loraService,
  loraFailure,
  sameOrigin,
  boundedBytes,
} from "@/lib/lora/http";
import { LoraError, PART_SIZE } from "@/lib/lora/types";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const service = await loraService();
    const p = new URL(request.url).searchParams;
    const upload = p.get("upload");
    let result;
    if (upload) {
      service.requireAdmin();
      result = await service.uploadPart(
        upload,
        Number(p.get("part")),
        await boundedBytes(request, PART_SIZE),
      );
    } else {
      const kind = p.get("kind");
      if (kind !== "dataset" && kind !== "cover")
        throw new LoraError(400, "Invalid upload type.");
      if (kind === "cover") service.requireAdmin();
      const limit = (await service.settings()).maxImageMb;
      result = await service.uploadImage(
        p.get("request") || "",
        kind,
        p.get("name") || "",
        await boundedBytes(request, limit * 1048576),
      );
    }
    return Response.json(result, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return loraFailure(e);
  }
}
export async function GET(request: Request) {
  try {
    const service = await loraService(),
      p = new URL(request.url).searchParams;
    const file = await service.file(p.get("id") || "");
    const object = await service.env.BUCKET.get(file.storage_key);
    if (!object) throw new LoraError(404, "File is unavailable.");
    return new Response(object.body, {
      headers: {
        "Content-Type": file.mime,
        "Content-Length": String(object.size),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'",
        "Content-Disposition": `${file.kind === "weights" || p.get("download") === "1" ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(file.name)}`,
      },
    });
  } catch (e) {
    return loraFailure(e);
  }
}
