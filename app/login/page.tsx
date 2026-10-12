import Link from "next/link";
import {
  ArrowUpRight,
  Film,
  Image as ImageIcon,
  Layers3,
  ShieldCheck,
} from "lucide-react";
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
        <Link className="login-story-link" href="/welcome">
          Discover Model Drops <ArrowUpRight size={16} />
        </Link>
        <div className="login-story-copy">
          <span className="eyebrow">YOUR OWN CREATIVE SPACE</span>
          <h1>
            One character. <br />
            <em>Every next idea.</em>
          </h1>
          <p>
            Build a creative world around your model, from a still image to a
            story in motion.
          </p>
          <div className="login-feature-list">
            <div>
              <ImageIcon size={19} strokeWidth={1.5} />
              <span>Reference-guided images</span>
              <span>01</span>
            </div>
            <div>
              <Film size={19} strokeWidth={1.5} />
              <span>Character-led video</span>
              <span>02</span>
            </div>
            <div>
              <Layers3 size={19} strokeWidth={1.5} />
              <span>Custom LoRA requests</span>
              <span>03</span>
            </div>
          </div>
          <span className="login-art-credit">
            Your characters. Your creations. Together.
          </span>
        </div>
      </section>
      <section className="login-form-panel">
        <Link
          href="/welcome"
          className="login-mobile-brand"
          aria-label="Model Drops home"
        >
          <ModelDropsBrand />
        </Link>
        <div className="login-card">
          <LoginForm
            ready={!!config}
            google={config?.google || false}
            invitedBeta={config?.invitedBeta || false}
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
          <Link href="/welcome">About Model Drops</Link>
          <span>Your creative workspace.</span>
        </div>
      </section>
    </main>
  );
}
