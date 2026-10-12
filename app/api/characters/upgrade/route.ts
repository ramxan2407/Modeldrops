import { z } from "zod";
import { auth, bindings, assertOrigin, fail, ApiError } from "@/lib/server";
import { CharacterCheckout } from "@/lib/characters/checkout";
import { characterAccess } from "@/lib/characters/access";
import { requestJson } from "@/lib/http-body";

export async function POST(request: Request) {
  try {
    assertOrigin(request);
    const user = await auth(),
      env = bindings();
    const parsed = z
      .object({
        characterId: z.string(),
        fromVersion: z.string(),
        toVersion: z.string(),
        acceptedLicense: z.literal(true),
      })
      .safeParse(await requestJson(request, 4096));
    if (!parsed.success)
      throw new ApiError(
        400,
        "Review the portrait update and accept its terms first.",
      );
    const d = parsed.data;
    const quote = await new CharacterCheckout(env.DB, user.userId, env).quote(
      d.characterId,
    );
    if (
      !quote.ready ||
      quote.versionId !== d.toVersion ||
      !(await characterAccess(env.DB, user.userId, d.characterId, env))
    )
      throw new ApiError(
        409,
        "This update is not available. Refresh your library.",
      );
    const result = await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO audit_logs(id,actor_id,action,entity_id,metadata) SELECT ?,?,'character.upgrade',?,? WHERE EXISTS(SELECT 1 FROM character_entitlements WHERE user_id=? AND character_id=? AND status='active' AND version_id=?)",
      ).bind(
        crypto.randomUUID(),
        user.userId,
        d.characterId,
        JSON.stringify(d),
        user.userId,
        d.characterId,
        d.fromVersion,
      ),
      env.DB.prepare(
        "UPDATE character_entitlements SET version_id=? WHERE user_id=? AND character_id=? AND version_id=? AND status='active'",
      ).bind(d.toVersion, user.userId, d.characterId, d.fromVersion),
    ]);
    if (!result[1].meta.changes)
      throw new ApiError(
        409,
        "Your selected version changed. Refresh your library.",
      );
    return Response.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
