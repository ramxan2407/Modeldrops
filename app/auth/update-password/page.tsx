import { redirect } from "next/navigation";
import { getAppUser } from "@/lib/app-auth";
import { LoginForm } from "@/components/login-form";
import { ModelDropsBrand } from "@/components/model-drops-brand";
export const dynamic = "force-dynamic";
export default function UpdatePassword() {
  return <PasswordContent />;
}
async function PasswordContent() {
  if (!(await getAppUser())) redirect("/login?error=recovery");
  return (
    <main className="password-page">
      <div className="login-card">
        <ModelDropsBrand />
        <h1>Choose a new password.</h1>
        <p>Use at least 12 characters to protect your account.</p>
        <LoginForm ready google={false} returnTo="/dashboard" recovery />
      </div>
    </main>
  );
}
