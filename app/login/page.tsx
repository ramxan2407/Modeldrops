import { ArrowRight, ShieldCheck, Library, Sparkles, Lock } from "lucide-react";
import { redirect } from "next/navigation";
import { getChatGPTUser, chatGPTSignInPath } from "@/app/chatgpt-auth";
import { ModelDropsBrand } from "@/components/model-drops-brand";
import { safeWorkspaceReturnTo } from "@/lib/navigation";
export const dynamic = "force-dynamic";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const query = await searchParams;
  return <LoginContent returnTo={safeWorkspaceReturnTo(query?.returnTo)} />;
}
async function LoginContent({ returnTo }: { returnTo: string }) {
  const user = await getChatGPTUser();
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
          <span className="eyebrow">WELCOME TO MODEL DROPS</span>
          <h2>
            Your world is
            <br />
            waiting for you.
          </h2>
          <p>
            Sign in to your personal dashboard to access your character models
            and pick up where you left off.
          </p>
          <a
            href={chatGPTSignInPath(returnTo)}
            target="_top"
            className="login-primary"
          >
            <Sparkles size={19} /> Continue with ChatGPT{" "}
            <ArrowRight size={18} />
          </a>
          <p className="login-account-note">
            New here? Your Model Drops workspace is created when you sign in for
            the first time.
          </p>
          <div className="login-features">
            <div>
              <Library size={18} />
              <span>Your purchased models, always together</span>
            </div>
            <div>
              <Sparkles size={18} />
              <span>Create directly with the models you own</span>
            </div>
            <div>
              <Lock size={18} />
              <span>A private dashboard, just for you</span>
            </div>
          </div>
          <div className="login-security">
            <ShieldCheck size={17} />
            <p>
              Secure sign-in with your ChatGPT account. Model Drops never sees
              your password.
            </p>
          </div>
          <p className="login-preview-note">
            Product preview · Purchases and AI generation are simulated.
          </p>
        </div>
        <div className="login-footer">
          <a href="/welcome">About Model Drops</a>
          <span>Made for your imagination.</span>
        </div>
      </section>
    </main>
  );
}
