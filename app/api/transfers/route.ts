import {
  auth,
  initialize,
  bindings,
  assertOrigin,
  ApiError,
  fail,
  uid,
} from "@/lib/server";
import { type SignedBucket, transferTarget } from "@/lib/upload-transfer";
import { requestJson } from "@/lib/http-body";
import { z } from "zod";
export async function POST(request: Request) {
  try {
    assertOrigin(request);
    const user = await auth();
    await initialize(user);
    const { DB, BUCKET } = bindings();
    const bucket = BUCKET as SignedBucket;
    if (!bucket.signedUpload) return Response.json({ direct: false });
    const { target, size } = z
      .object({ target: z.string(), size: z.number() })
      .parse(await requestJson(request, 4096));
    if (
      typeof target !== "string" ||
      !target.startsWith("/") ||
      target.startsWith("//") ||
      target.length > 1500 ||
      !["/api/upload", "/api/lora/file"].includes(
        new URL(target, request.url).pathname,
      ) ||
      !Number.isSafeInteger(size) ||
      size < 1 ||
      size > 25 * 1048576
    )
      throw new ApiError(400, "Invalid upload.");
    const id = uid(),
      key = `transfers/${user.userId}/${id}`;
    const result = await DB.prepare(
      "INSERT INTO upload_transfers(id,user_id,storage_key,target,size,expires_at) SELECT ?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM upload_transfers WHERE user_id=? AND claimed=0 AND expires_at>?)<20",
    )
      .bind(
        id,
        user.userId,
        key,
        transferTarget(target),
        size,
        Date.now() + 300000,
        user.userId,
        Date.now(),
      )
      .run();
    if (!result.meta.changes)
      throw new ApiError(
        429,
        "Too many active uploads. Wait five minutes and try again.",
      );
    return Response.json(
      { direct: true, id, url: await bucket.signedUpload(key, size) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return fail(error);
  }
}
