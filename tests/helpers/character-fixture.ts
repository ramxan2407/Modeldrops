import { generationModels } from "../../lib/generation/models";
import { characters, type Character } from "../../lib/catalog";
import {
  draftVersionStatement,
  portraitVersionId,
} from "../../lib/characters/versions";
import { characterReferenceVersion } from "../../lib/characters/reference-version";
import { qualityApprovalStatements } from "../../lib/characters/quality";

/** Synthetic completed outputs for isolated DB tests; never calls a provider. */
export async function seedReviewedCharacter(
  db: D1Database,
  character: Partial<Character> & { id: string },
  owner = "admin",
) {
  const c = { ...characters.find((c) => c.id === character.id)!, ...character };
  await draftVersionStatement(db, c).run();
  const ids: string[] = [];
  for (const model of generationModels) {
    await db
      .prepare(
        "INSERT OR IGNORE INTO ai_models(id,name,provider,type,credits,enabled,config) VALUES(?,?,?,?,?,1,?)",
      )
      .bind(
        model.id,
        model.name,
        model.provider,
        model.type,
        model.credits,
        JSON.stringify(model),
      )
      .run();
    const id = crypto.randomUUID();
    ids.push(id);
    await db
      .prepare(
        "INSERT INTO generations(id,user_id,character_id,character_version_id,purpose,model_id,prompt,settings,type,cost,idempotency_key,status,asset_key,updated_at) VALUES(?,?,?,?,'character_qa',?,'Synthetic QA fixture','{}',?,0,?,'completed',?,?)",
      )
      .bind(
        id,
        owner,
        c.id,
        portraitVersionId(c),
        model.id,
        model.type,
        id,
        `fixture/${id}`,
        new Date().toISOString(),
      )
      .run();
    await db
      .prepare(
        "INSERT INTO provider_requests(generation_id,endpoint,input_json,character_reference,request_id,state,reserved_microusd,created_at,updated_at) VALUES(?,?,'{}',?,?,'completed',0,?,?)",
      )
      .bind(
        id,
        model.type === "video"
          ? "kwaivgi/kling-v3.0-std/image-to-video"
          : model.endpoint.replace("/text-to-image", "/edit"),
        characterReferenceVersion(c),
        id.replaceAll("-", ""),
        new Date().toISOString(),
        new Date().toISOString(),
      )
      .run();
    await db
      .prepare(
        "INSERT INTO generation_assets(id,user_id,generation_id,storage_key,mime,size) VALUES(?,?,?,?,?,1)",
      )
      .bind(
        id,
        owner,
        id,
        `fixture/${id}`,
        model.type === "video" ? "video/mp4" : "image/png",
      )
      .run();
  }
  await db.batch(
    await qualityApprovalStatements(
      db,
      c,
      owner,
      ids,
      "Synthetic reviewed fixture for automated testing",
    ),
  );
  return { versionId: portraitVersionId(c)!, ids };
}
export async function inviteFixture(db: D1Database, email: string) {
  await db
    .prepare(
      "INSERT OR IGNORE INTO demo_testers(email,enabled,approved_by,reason,updated_at) VALUES(?,1,'admin','Invited automated test fixture',?)",
    )
    .bind(email, new Date().toISOString())
    .run();
}
