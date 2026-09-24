import { auth, initialize, bindings, assertOrigin, fail } from "@/lib/server";
import {
  AdminService,
  AdminError,
  type AdminSection,
} from "@/lib/admin/service";
import { LoraError } from "@/lib/lora/types";
import { boundedBytes } from "@/lib/lora/http";
import { supabaseConfig } from "@/lib/supabase/config";
import { generationEnabled } from "@/lib/generation/models";
export const dynamic = "force-dynamic";
function failure(e: unknown) {
  if (e instanceof AdminError || e instanceof LoraError)
    return Response.json({ error: e.message }, { status: e.status });
  if (e instanceof SyntaxError)
    return Response.json({ error: "Invalid JSON request." }, { status: 400 });
  return fail(e);
}
export async function GET(request: Request) {
  try {
    const user = await auth(),
      env = bindings();
    const service = new AdminService(env.DB, env, user.userId);
    service.guard();
    await initialize(user);
    const p = new URL(request.url).searchParams;
    const section = (p.get("section") || "overview") as AdminSection;
    const data = await service.state(
      section,
      p.get("search") || "",
      Number(p.get("page") || 0),
    );
    return Response.json(
      {
        ...data,
        ...(section === "integrations"
          ? {
              generationJobs: (
                await env.DB.prepare(
                  "SELECT g.id,g.user_id,g.model_id,g.status,g.error,p.request_id,p.state,p.updated_at FROM provider_requests p JOIN generations g ON g.id=p.generation_id ORDER BY p.updated_at DESC LIMIT 20",
                ).all()
              ).results,
              integrations: [
                {
                  name: "Email sign-in",
                  status: supabaseConfig() ? "Configured" : "Setup required",
                  detail:
                    "Requires Supabase credentials, confirmed users, and redirect settings. Configuration presence is not an end-to-end login test.",
                },
                {
                  name: "Google sign-in",
                  status: supabaseConfig()?.google
                    ? "Enabled in app"
                    : "Setup required",
                  detail:
                    "Also requires the Google OAuth provider and its redirect URL to be configured in Supabase.",
                },
                {
                  name: "Payments",
                  status: "Not connected",
                  detail:
                    "Checkout and refunds are unavailable. Listed purchases are demo access grants; no money is charged.",
                },
                {
                  name: "Image and video generation",
                  status: generationEnabled(env)
                    ? "Live generation enabled"
                    : "Setup required",
                  detail: generationEnabled(env)
                    ? "Qwen Image Edit, GPT Image 2.5 Flare/Sunburst, and Kling 3.0 videos. Model-specific controls, references, and live image pricing; server-side credentials. Check the provider console for usage and request outcomes."
                    : "Configure generation credentials and enable live generation to replace sample outputs.",
                },
                {
                  name: "Private storage",
                  status: env.BUCKET ? "Configured" : "Setup required",
                  detail:
                    "Datasets and delivered LoRAs use private storage with account-level access checks.",
                },
                {
                  name: "Training emails",
                  status:
                    env.RESEND_API_KEY && env.LORA_EMAIL_FROM
                      ? "Configured"
                      : "Setup required",
                  detail:
                    "Resend requires a verified sender. An authenticated scheduled job must process the email outbox.",
                },
                {
                  name: "Super administrator",
                  status: "Restricted",
                  detail:
                    "Access is granted only to verified Supabase user IDs in SUPER_ADMIN_USER_IDS. Training admins cannot adjust credits or manage users.",
                },
              ],
            }
          : {}),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    assertOrigin(request);
    const user = await auth(),
      env = bindings();
    const service = new AdminService(env.DB, env, user.userId);
    service.guard();
    const body = JSON.parse(
      new TextDecoder().decode(await boundedBytes(request, 32768)),
    );
    if (
      !body ||
      typeof body.action !== "string" ||
      !body.data ||
      typeof body.data !== "object"
    )
      throw new AdminError(400, "An action and change details are required.");
    return Response.json(await service.mutate(body.action, body.data), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    return failure(e);
  }
}
