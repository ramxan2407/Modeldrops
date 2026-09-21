import { loraService, loraFailure } from "@/lib/lora/http";
import { LoraError } from "@/lib/lora/types";
import { zipStream } from "@/lib/lora/zip";
export async function GET(request: Request) {
  try {
    const service = await loraService();
    service.requireAdmin();
    const r = await service.request(
      new URL(request.url).searchParams.get("request") || "",
    );
    const files = await service.db
      .prepare(
        "SELECT storage_key,name,mime FROM training_files WHERE request_id=? AND kind='dataset' AND ready=1 ORDER BY created_at,id",
      )
      .bind(r.id)
      .all<{ storage_key: string; name: string; mime: string }>();
    if (!files.results.length)
      throw new LoraError(404, "No dataset images available.");
    return new Response(
      zipStream(
        files.results.map((f, i) => ({
          name: `images/${String(i + 1).padStart(3, "0")}-${f.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`,
          open: async () => {
            const object = await service.env.BUCKET.get(f.storage_key);
            if (!object) throw new Error("Dataset image missing.");
            return object.body;
          },
        })),
      ),
      {
        headers: {
          "Content-Type": "application/zip",
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
          "Content-Disposition": `attachment; filename="dataset-${r.id}.zip"`,
        },
      },
    );
  } catch (e) {
    return loraFailure(e);
  }
}
