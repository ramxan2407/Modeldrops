import { ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { getAppUser } from "@/lib/app-auth";
import { supabaseConfig } from "@/lib/supabase/config";
import { LoginForm } from "@/components/login-form";
import { ModelDropsBrand } from "@/components/model-drops-brand";
import { safeWorkspaceReturnTo } from "@/lib/navigation";
export const dynamic = "force-dynamic";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string; error?: string }>;
}) {
  const query = await searchParams;
  return (
    <LoginContent
      returnTo={safeWorkspaceReturnTo(query?.returnTo)}
      error={query?.error}
    />
  );
}
async function LoginContent({
  returnTo,
  error,
}: {
  returnTo: string;
  error?: string;
}) {
  const user = await getAppUser();
  const config = supabaseConfig();
  if (user) redirect(returnTo);
  return (
    <main className="login-page">
      <section className="login-story">
        <img
          src="/assets/hero.png"
          alt="Nova, a cinematic character ready for your next story"
        />
        <a
          className="login-brand"
          href="/welcome"
          aria-label="Model Drops home"
        >
          <ModelDropsBrand />
        </a>
        <div className="login-story-copy">
          <span className="eyebrow">YOUR CHARACTERS. YOUR CREATIVE WORLD.</span>
          <h1>
            A familiar face.
            <br />
            <em>A fresh possibility.</em>
          </h1>
          <p>
            Your models, your creations, and your next big idea.
            <br />
            All together in your own creative space.
          </p>
          <span className="login-art-credit">
            Nova · The Model Drops collection
          </span>
        </div>
      </section>
      <section className="login-form-panel">
        <a
          href="/welcome"
          className="login-mobile-brand"
          aria-label="Model Drops home"
        >
          <ModelDropsBrand />
        </a>
        <div className="login-card">
          <LoginForm
            ready={!!config}
            google={config?.google || false}
            returnTo={returnTo}
            initialError={
              error === "oauth"
                ? "Sign-in could not be completed. Please start again in this browser."
                : error === "recovery"
                  ? "Your reset session has expired. Request a new password reset email."
                  : ""
            }
          />
          <div className="login-security">
            <ShieldCheck size={17} />
            <p>
              Your characters, projects, and training datasets stay in your
              private workspace.
            </p>
          </div>
          <p className="login-preview-note">
            Model Drops · Private creative workspace.
          </p>
        </div>
        <div className="login-footer">
          <a href="/welcome">About Model Drops</a>
          <span>Your creative workspace.</span>
        </div>
      </section>
    </main>
  );
}
