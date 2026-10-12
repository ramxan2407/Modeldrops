import type { Character } from "../catalog";
import { generationModels } from "../generation/models";
import { portraitVersionId, draftVersionStatement } from "./versions";
import { characterReferenceVersion } from "./reference-version";

/** Evidence must be an actual completed reference-conditioned provider job. */
export async function qualityApprovalStatements(
  db: D1Database,
  c: Character,
  actor: string,
  generationIds: string[],
  notes: string,
) {
  const enabled = await db
    .prepare(
      "SELECT id FROM ai_models WHERE provider='WaveSpeed' AND enabled=1",
    )
    .all<{ id: string }>();
  const required = generationModels.filter((m) =>
    enabled.results.some((e) => e.id === m.id),
  );
  if (
    !required.some((m) => m.type === "image") ||
    !required.some((m) => m.type === "video")
  )
    throw new Error(
      "Enable image and video models before reviewing this character.",
    );
  const evidence: {
    id: string;
    model_id: string;
    character_reference: string;
    endpoint: string;
  }[] = [];
  for (const id of [...new Set(generationIds)]) {
    const g = await db
      .prepare(
        "SELECT g.id,g.model_id,p.character_reference,p.endpoint FROM generations g JOIN provider_requests p ON p.generation_id=g.id JOIN ai_models m ON m.id=g.model_id WHERE g.id=? AND g.character_id=? AND g.status='completed' AND p.state='completed' AND m.provider='WaveSpeed' AND EXISTS(SELECT 1 FROM generation_assets a WHERE a.generation_id=g.id)",
      )
      .bind(id, c.id)
      .first<{
        id: string;
        model_id: string;
        character_reference: string;
        endpoint: string;
      }>();
    if (
      !g ||
      g.character_reference !== characterReferenceVersion(c) ||
      !(g.endpoint.includes("/edit") || g.endpoint.endsWith("/image-to-video"))
    )
      throw new Error(
        "Each reviewed example must be a completed image edit or reference video using this exact portrait.",
      );
    evidence.push(g);
  }
  if (required.some((m) => !evidence.some((g) => g.model_id === m.id)))
    throw new Error(
      "Review a completed example from every enabled image and video model before approval.",
    );
  const versionId = portraitVersionId(c)!;
  return [
    draftVersionStatement(db, c),
    ...required.map((m) => {
      const g = evidence.find((g) => g.model_id === m.id)!;
      return db
        .prepare(
          "INSERT INTO character_quality_reviews(version_id,model_id,generation_id,reviewed_by,notes,created_at) VALUES(?,?,?,?,?,?) ON CONFLICT(version_id,model_id) DO UPDATE SET generation_id=excluded.generation_id,reviewed_by=excluded.reviewed_by,notes=excluded.notes,created_at=excluded.created_at",
        )
        .bind(versionId, m.id, g.id, actor, notes, new Date().toISOString());
    }),
    db
      .prepare(
        "UPDATE character_versions SET approved=1,reviewed_models=?,reviewed_by=? WHERE id=?",
      )
      .bind(JSON.stringify(required.map((m) => m.id)), actor, versionId),
  ];
}
