import { imageEndpoint } from "@/lib/generation/images";
import { quoteImage } from "@/lib/generation/quote";
import { resolveImageReferences } from "@/lib/generation/references";
import { catalogFor } from "@/lib/admin/service";
import { waitUntil } from "cloudflare:workers";
import { z } from "zod";
import { characters, license, models as catalogModels } from "@/lib/catalog";
import {
  ApiError,
  auth,
  bindings,
  initialize,
  uid,
  isAdmin,
  requireAdmin,
  requireSuperAdmin,
  isSuperAdmin,
  assertOrigin,
  fail,
  ledgerStatement,
} from "@/lib/server";
import { generationSettings, calculateCredits } from "@/lib/pricing";
import { runGenerationJob } from "@/lib/generation/worker";
import {
  generationEnabled,
  generationConfigured,
  generationModel,
  generationInput,
  providerReserve,
  dailyLimit,
} from "@/lib/generation/models";
import { refundJob } from "@/lib/demo-worker";
export const dynamic = "force-dynamic";
const str = (max = 100) => z.string().trim().min(1).max(max);
const key = z.string().uuid();
export async function GET(request: Request) {
  try {
    const user = await auth();
    await initialize(user);
    const { DB } = bindings();
    const action = new URL(request.url).searchParams.get("action");
    if (action === "admin") {
      requireSuperAdmin(user.userId);
      const [users, gens, listed, rows] = await Promise.all([
        DB.prepare("SELECT COUNT(*) AS n FROM users").first<any>(),
        DB.prepare("SELECT COUNT(*) AS n FROM generations").first<any>(),
        DB.prepare("SELECT COUNT(*) AS n FROM creator_listings").first<any>(),
        DB.prepare(
          "SELECT id,name,description,status FROM creator_listings ORDER BY created_at DESC LIMIT 100",
        ).all(),
      ]);
      return Response.json({
        metrics: { Users: users.n, Generations: gens.n, Concepts: listed.n },
        listings: rows.results,
      });
    }
    if (action !== "state") throw new ApiError(404, "Unknown action");
    const [
      profile,
      balance,
      owned,
      favorites,
      projects,
      generations,
      transactions,
      notifications,
      models,
      packages,
      listings,
    ] = await Promise.all([
      DB.prepare("SELECT name,default_private FROM users WHERE id=?")
        .bind(user.userId)
        .first<any>(),
      DB.prepare(
        "SELECT COALESCE(SUM(amount),0) AS balance FROM credit_transactions WHERE user_id=?",
      )
        .bind(user.userId)
        .first<any>(),
      DB.prepare(
        "SELECT character_id,created_at,license_version,license_snapshot,price_cents FROM character_purchases WHERE user_id=? AND status='active' ORDER BY created_at DESC",
      )
        .bind(user.userId)
        .all<any>(),
      DB.prepare("SELECT character_id FROM favorites WHERE user_id=?")
        .bind(user.userId)
        .all<any>(),
      DB.prepare(
        'SELECT id,name,description,created_at AS "createdAt" FROM projects WHERE user_id=? ORDER BY created_at DESC',
      )
        .bind(user.userId)
        .all(),
      DB.prepare(
        'SELECT g.id,g.prompt,g.character_id AS "characterId",g.model_id AS "modelId",g.status,g.cost,g.type,g.settings,g.error,g.created_at AS "createdAt",g.project_id AS "projectId",g.asset_key IS NOT NULL AS "hasAsset",m.provider,m.name AS "modelName" FROM generations g JOIN ai_models m ON m.id=g.model_id WHERE g.user_id=? ORDER BY g.created_at DESC LIMIT 100',
      )
        .bind(user.userId)
        .all<any>(),
      DB.prepare(
        'SELECT id,amount,description,created_at AS "createdAt",balance_after AS "balanceAfter" FROM credit_transactions WHERE user_id=? ORDER BY created_at DESC LIMIT 100',
      )
        .bind(user.userId)
        .all(),
      DB.prepare(
        "SELECT id,message,read FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 50",
      )
        .bind(user.userId)
        .all(),
      DB.prepare("SELECT * FROM ai_models").all<any>(),
      DB.prepare(
        "SELECT id,name,price,credits FROM credit_packages WHERE enabled=1 ORDER BY price",
      ).all(),
      DB.prepare(
        "SELECT id,name,description,status FROM creator_listings WHERE user_id=? ORDER BY created_at DESC",
      )
        .bind(user.userId)
        .all(),
    ]);
    const assets = await DB.prepare(
      "SELECT id,generation_id,mime FROM generation_assets WHERE user_id=? AND generation_id IN (SELECT id FROM generations WHERE user_id=? AND status='completed' ORDER BY created_at DESC LIMIT 100) ORDER BY id",
    )
      .bind(user.userId, user.userId)
      .all<{ id: string; generation_id: string; mime: string }>();
    const liveEnabled = generationEnabled(bindings());
    const liveConfigured = generationConfigured(bindings());
    for (const g of generations.results
      .filter(
        (g) =>
          g.provider !== "Demo" && ["queued", "processing"].includes(g.status),
      )
      .slice(0, 3))
      waitUntil(runGenerationJob(g.id, new URL(request.url).origin));
    return Response.json(
      {
        liveGeneration: liveEnabled,
        account: {
          name: profile.name,
          email: user.email,
          purchases: owned.results.map((p) => ({
            characterId: p.character_id,
            purchaseDate: p.created_at,
            licenseVersion: p.license_version,
            licenseSnapshot: p.license_snapshot,
            priceCents: p.price_cents,
          })),
          defaultPrivate: !!profile.default_private,
          balance: balance.balance,
          owned: owned.results.map((x) => x.character_id),
          favorites: favorites.results.map((x) => x.character_id),
          projects: projects.results,
          generations: generations.results.map(({ hasAsset, ...g }) => ({
            ...g,
            image: hasAsset ? `/api/media?id=${g.id}` : "",
            live: g.provider !== "Demo",
            outputs: assets.results
              .filter((asset) => asset.generation_id === g.id)
              .map((asset) => ({
                id: asset.id,
                mime: asset.mime,
                url: `/api/media?id=${g.id}&asset=${encodeURIComponent(asset.id)}`,
              })),
          })),
          transactions: transactions.results,
          notifications: notifications.results,
          isAdmin: isAdmin(user.userId),
          isSuperAdmin: isSuperAdmin(user.userId),
          listings: listings.results,
          creatorStatus: listings.results.length ? "applied" : null,
        },
        models: models.results
          .filter((m) =>
            liveConfigured
              ? m.provider === "WaveSpeed" && !!generationModel(m.id)
              : m.provider === "Demo",
          )
          .map((m) => ({
            ...JSON.parse(m.config),
            name:
              catalogModels.find((catalogModel) => catalogModel.id === m.id)
                ?.name ?? m.name,
            ...(generationModel(m.id) || {}),
            credits: m.credits,
            enabled: !!m.enabled && (m.provider !== "WaveSpeed" || liveEnabled),
          })),
        packages: packages.results,
        characters: await catalogFor(DB),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return fail(e);
  }
}
export async function POST(request: Request) {
  try {
    assertOrigin(request);
    if (Number(request.headers.get("content-length")) > 32000)
      throw new ApiError(413, "Request too large");
    const body = await request.text();
    if (body.length > 32000) throw new ApiError(413, "Request too large");
    const { action, data } = z
      .object({ action: str(50), data: z.unknown() })
      .parse(JSON.parse(body));
    const user = await auth();
    await initialize(user);
    const { DB } = bindings();
    const id = user.userId;
    switch (action) {
      case "favorite": {
        const d = z.object({ characterId: str() }).parse(data);
        if (!characters.some((c) => c.id === d.characterId))
          throw new ApiError(404, "Character not found");
        const exists = await DB.prepare(
          "SELECT id FROM favorites WHERE user_id=? AND character_id=?",
        )
          .bind(id, d.characterId)
          .first();
        if (exists)
          await DB.prepare(
            "DELETE FROM favorites WHERE user_id=? AND character_id=?",
          )
            .bind(id, d.characterId)
            .run();
        else
          await DB.prepare(
            "INSERT OR IGNORE INTO favorites(id,user_id,character_id) VALUES(?,?,?)",
          )
            .bind(uid(), id, d.characterId)
            .run();
        break;
      }
      case "claim": {
        const d = z
          .object({ characterId: str(), acceptedLicense: z.literal(true) })
          .parse(data);
        if (
          !(await catalogFor(DB)).some(
            (c) => c.id === d.characterId && c.enabled,
          )
        )
          throw new ApiError(404, "Character unavailable");
        await DB.prepare(
          "INSERT OR IGNORE INTO character_purchases(id,user_id,character_id,license_snapshot,license_version,price_cents) VALUES(?,?,?,?, 'demo-1',0)",
        )
          .bind(uid(), id, d.characterId, license)
          .run();
        break;
      }
      case "project": {
        const d = z
          .object({ name: str(), description: z.string().max(500).default("") })
          .parse(data);
        const n = await DB.prepare(
          "SELECT COUNT(*) AS n FROM projects WHERE user_id=?",
        )
          .bind(id)
          .first<any>();
        if (n.n >= 100)
          throw new ApiError(429, "Preview project limit reached");
        await DB.prepare(
          "INSERT INTO projects(id,user_id,name,description) VALUES(?,?,?,?)",
        )
          .bind(uid(), id, d.name, d.description)
          .run();
        break;
      }
      case "generate": {
        const d = z
          .object({
            idempotencyKey: key,
            characterId: str().nullable(),
            modelId: str(200),
            prompt: z.string().trim().max(16000),
            expectedCredits: z.number().int().positive().optional(),
            settings: generationSettings,
            reference: key.nullable().optional(),
          })
          .parse(data);
        const idem = `generation:${id}:${d.idempotencyKey}`;
        const existing = await DB.prepare(
          "SELECT id,prompt,model_id,character_id,settings,reference_id FROM generations WHERE idempotency_key=?",
        )
          .bind(idem)
          .first<any>();
        if (existing) {
          if (
            existing.prompt !== d.prompt ||
            existing.model_id !== d.modelId ||
            existing.character_id !== d.characterId ||
            existing.settings !== JSON.stringify(d.settings) ||
            existing.reference_id !== (d.reference || null)
          )
            throw new ApiError(
              409,
              "This request key belongs to different generation settings.",
            );
          return Response.json({ id: existing.id });
        }
        const m = await DB.prepare(
          "SELECT * FROM ai_models WHERE id=? AND enabled=1",
        )
          .bind(d.modelId)
          .first<any>();
        if (!m) throw new ApiError(400, "Choose an available model");
        const live = m.provider === "WaveSpeed";
        if (
          (live && !generationEnabled(bindings())) ||
          (!live && m.provider !== "Demo") ||
          (!live && generationConfigured(bindings()))
        )
          throw new ApiError(503, "Choose an available generation model.");
        let providerInput: unknown;
        if (live) {
          try {
            providerInput = generationInput(
              m.id,
              d.prompt,
              d.settings,
              d.characterId,
              d.reference,
            );
          } catch (e) {
            throw new ApiError(400, (e as Error).message);
          }
        }
        if (
          d.characterId &&
          !(await catalogFor(DB)).some(
            (c) => c.id === d.characterId && c.enabled,
          )
        )
          throw new ApiError(
            400,
            "This character is currently unavailable. Choose another character.",
          );
        const cfg = generationModel(m.id) || JSON.parse(m.config);
        if (
          !cfg.ratios.includes(d.settings.ratio) ||
          !cfg.resolutions.includes(d.settings.resolution)
        )
          throw new ApiError(
            400,
            "These settings are not supported by the model.",
          );
        if (d.characterId) {
          if (!characters.some((c) => c.id === d.characterId))
            throw new ApiError(400, "Character unavailable");
          const owned = await DB.prepare(
            "SELECT id FROM character_purchases WHERE user_id=? AND character_id=? AND status='active'",
          )
            .bind(id, d.characterId)
            .first();
          if (!owned)
            throw new ApiError(
              403,
              "Add this character to your library before generating.",
            );
        }
        if (d.reference) {
          const ref = await DB.prepare(
            "SELECT id FROM generation_assets WHERE id=? AND user_id=? AND generation_id IS NULL",
          )
            .bind(d.reference, id)
            .first();
          if (!ref) throw new ApiError(403, "Reference image not accessible");
        }
        const active = await DB.prepare(
          "SELECT COUNT(*) AS n FROM generations WHERE user_id=? AND status IN ('queued','processing')",
        )
          .bind(id)
          .first<any>();
        if (active.n >= 3)
          throw new ApiError(429, "Three generations are already in progress.");
        if ((!live || m.type !== "image") && !d.prompt)
          throw new ApiError(400, "Write a prompt first.");
        let endpoint = live ? generationModel(m.id)!.endpoint : "";
        let reserve = live ? providerReserve(m.id, d.settings) : 0;
        let cost = calculateCredits(m.credits, m.type, d.settings);
        if (live && m.type === "image") {
          if (!d.expectedCredits)
            throw new ApiError(
              400,
              "Get a current image price before generating.",
            );
          providerInput = await resolveImageReferences(
            providerInput as Record<string, unknown>,
            id,
          );
          try {
            endpoint = imageEndpoint(
              m.id,
              providerInput as Record<string, unknown>,
            );
            const quote = await quoteImage(bindings(), endpoint, providerInput);
            if (quote.credits > d.expectedCredits)
              throw new ApiError(
                409,
                "The price changed. Review the updated quote before generating.",
              );
            cost = quote.credits;
            reserve = quote.providerMicrousd;
          } catch (e) {
            if (e instanceof ApiError) throw e;
            throw new ApiError(
              422,
              "Could not verify this image price. No credits were charged. Refresh the quote and try again.",
            );
          }
        }
        const balance = await DB.prepare(
          "SELECT COALESCE(SUM(amount),0) AS balance FROM credit_transactions WHERE user_id=?",
        )
          .bind(id)
          .first<any>();
        if (balance.balance < cost)
          throw new ApiError(402, "Not enough credits.");
        const gen = uid();
        try {
          await DB.batch([
            DB.prepare(
              "INSERT INTO generations(id,user_id,character_id,model_id,prompt,settings,type,cost,idempotency_key,reference_id,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
            ).bind(
              gen,
              id,
              d.characterId,
              d.modelId,
              d.prompt,
              JSON.stringify(d.settings),
              m.type,
              cost,
              idem,
              d.reference || null,
              new Date().toISOString(),
            ),
            ledgerStatement(
              id,
              -cost,
              "generation_charge",
              live
                ? "AI generation · credits reserved"
                : "Demo generation · credits reserved",
              `charge:${gen}`,
              gen,
            ),
            ...(live
              ? [
                  DB.prepare(
                    "INSERT INTO provider_requests(generation_id,endpoint,input_json,reserved_microusd,created_at,updated_at) SELECT ?,?,?,CASE WHEN COALESCE(SUM(reserved_microusd),0)+?<=? AND (SELECT COUNT(*) FROM generations WHERE user_id=? AND status IN ('queued','processing'))<=3 THEN CAST(? AS bigint) ELSE NULL END,?,? FROM provider_requests WHERE created_at>=? AND generation_id IN (SELECT g.id FROM generations g JOIN ai_models m ON m.id=g.model_id WHERE m.provider='WaveSpeed')",
                  ).bind(
                    gen,
                    endpoint,
                    JSON.stringify(providerInput),
                    reserve,
                    dailyLimit(bindings()),
                    id,
                    reserve,
                    new Date().toISOString(),
                    new Date().toISOString(),
                    new Date().toISOString().slice(0, 10) + "T00:00:00.000Z",
                  ),
                ]
              : []),
            DB.prepare(
              "INSERT INTO generation_jobs(id,generation_id) VALUES(?,?)",
            ).bind(uid(), gen),
          ]);
        } catch (e) {
          const concurrent = await DB.prepare(
            "SELECT id,prompt,model_id,character_id,settings,reference_id FROM generations WHERE idempotency_key=?",
          )
            .bind(idem)
            .first<any>();
          if (concurrent) {
            if (
              concurrent.prompt !== d.prompt ||
              concurrent.model_id !== d.modelId ||
              concurrent.character_id !== d.characterId ||
              concurrent.settings !== JSON.stringify(d.settings) ||
              concurrent.reference_id !== (d.reference || null)
            )
              throw new ApiError(
                409,
                "This request key belongs to different generation settings.",
              );
            return Response.json({ id: concurrent.id });
          }
          if (e instanceof Error && e.message.includes("reserved_microusd"))
            throw new ApiError(
              429,
              "The generation budget or concurrent job limit has been reached. Try later or contact support.",
            );
          if (e instanceof Error && e.message.includes("balance_nonnegative"))
            throw new ApiError(402, "Not enough credits.");
          throw e;
        }
        waitUntil(runGenerationJob(gen, new URL(request.url).origin));
        return Response.json(
          { id: gen, status: "queued", cost },
          { status: 202 },
        );
      }
      case "cancel": {
        const d = z.object({ id: key }).parse(data);
        const g = await DB.prepare(
          "SELECT status,model_id FROM generations WHERE id=? AND user_id=?",
        )
          .bind(d.id, id)
          .first<any>();
        if (!g) throw new ApiError(404, "Generation not found");
        if (
          !catalogModels.some(
            (model) => model.id === g.model_id && model.provider === "Demo",
          )
        )
          throw new ApiError(
            409,
            "Submitted generation jobs cannot be cancelled here. Failed jobs return credits automatically.",
          );
        await refundJob(
          d.id,
          "cancelled",
          "Demo generation cancelled · credits returned",
        );
        break;
      }
      case "move": {
        const d = z.object({ id: key, projectId: key.nullable() }).parse(data);
        if (
          d.projectId &&
          !(await DB.prepare("SELECT id FROM projects WHERE id=? AND user_id=?")
            .bind(d.projectId, id)
            .first())
        )
          throw new ApiError(404, "Project not found");
        const r = await DB.prepare(
          "UPDATE generations SET project_id=? WHERE id=? AND user_id=?",
        )
          .bind(d.projectId, d.id, id)
          .run();
        if (!r.meta.changes) throw new ApiError(404, "Generation not found");
        break;
      }
      case "settings": {
        const d = z
          .object({ name: str(60), defaultPrivate: z.boolean() })
          .parse(data);
        await DB.prepare("UPDATE users SET name=?,default_private=? WHERE id=?")
          .bind(d.name, d.defaultPrivate ? 1 : 0, id)
          .run();
        break;
      }
      case "notifications-read":
        await DB.prepare("UPDATE notifications SET read=1 WHERE user_id=?")
          .bind(id)
          .run();
        break;
      case "creator-submit": {
        const d = z
          .object({
            name: str(80),
            description: z.string().trim().min(20).max(3000),
            rights: z.literal(true),
          })
          .parse(data);
        const n = await DB.prepare(
          "SELECT COUNT(*) AS n FROM creator_listings WHERE user_id=?",
        )
          .bind(id)
          .first<any>();
        if (n.n >= 25)
          throw new ApiError(429, "Preview submission limit reached");
        await DB.prepare(
          "INSERT INTO creator_listings(id,user_id,name,description,rights_confirmed) VALUES(?,?,?,?,1)",
        )
          .bind(uid(), id, d.name, d.description)
          .run();
        break;
      }
      case "report": {
        const d = z
          .object({ characterId: str(), reason: str(1000) })
          .parse(data);
        if (!characters.some((c) => c.id === d.characterId))
          throw new ApiError(404, "Character not found");
        const existing = await DB.prepare(
          "SELECT id FROM reports WHERE user_id=? AND character_id=? AND status='open'",
        )
          .bind(id, d.characterId)
          .first();
        if (!existing)
          await DB.prepare(
            "INSERT INTO reports(id,user_id,character_id,reason) VALUES(?,?,?,?)",
          )
            .bind(uid(), id, d.characterId, d.reason)
            .run();
        break;
      }
      case "checkout":
        throw new ApiError(
          503,
          "Payments are not connected yet. No charge was made.",
        );
      case "admin-model":
      case "admin-review":
        requireSuperAdmin(id);
        throw new ApiError(
          410,
          "Use the super admin dashboard to make an audited change.",
        );
      default:
        throw new ApiError(400, "Unknown action");
    }
    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError)
      return Response.json(
        { error: "Please check the required fields and supported settings." },
        { status: 400 },
      );
    if (e instanceof SyntaxError)
      return Response.json({ error: "Invalid JSON request" }, { status: 400 });
    return fail(e);
  }
}
