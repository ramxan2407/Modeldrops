"use client";
import { useState, type FormEvent } from "react";
import { ArrowRight, LoaderCircle, Mail, Eye, EyeOff } from "lucide-react";
type Mode = "signin" | "signup" | "reset" | "password";
export function LoginForm({
  ready,
  google,
  returnTo,
  initialError = "",
  recovery = false,
}: {
  ready: boolean;
  google: boolean;
  returnTo: string;
  initialError?: string;
  recovery?: boolean;
}) {
  const [mode, setMode] = useState<Mode>(recovery ? "password" : "signin");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(initialError),
    [message, setMessage] = useState(""),
    [visible, setVisible] = useState(false);
  function change(next: Mode) {
    setMode(next);
    setError("");
    setMessage("");
    setVisible(false);
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !ready) return;
    const form = event.currentTarget,
      fields = new FormData(form);
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/auth/" + mode, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: fields.get("email"),
          password: fields.get("password"),
          name: fields.get("name"),
          returnTo,
        }),
      });
      const result = (await response.json()) as {
        error?: string;
        returnTo?: string;
        message?: string;
      };
      if (!response.ok) throw new Error(result.error || "Please try again.");
      if (result.returnTo) {
        window.location.assign(result.returnTo);
        return;
      }
      setMessage(result.message || "Check your email to continue.");
      form.reset();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to connect. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-options">
      {!recovery && (
        <div className="auth-tabs" aria-label="Account access">
          <button
            type="button"
            className={mode === "signin" || mode === "reset" ? "active" : ""}
            onClick={() => change("signin")}
            disabled={busy}
          >
            Sign in
          </button>
          <button
            type="button"
            className={mode === "signup" ? "active" : ""}
            onClick={() => change("signup")}
            disabled={busy}
          >
            Create account
          </button>
        </div>
      )}
      {!ready && (
        <p className="auth-notice" role="status">
          Sign-in is being set up. Email and Google access will be available
          soon.
        </p>
      )}
      {["signin", "signup"].includes(mode) && (
        <>
          <form action="/api/auth/google" method="post">
            <input type="hidden" name="returnTo" value={returnTo} />
            <button
              className="google-login"
              disabled={!ready || !google || busy}
            >
              <span aria-hidden="true" className="google-letter">
                G
              </span>{" "}
              Continue with Google
            </button>
          </form>
          {ready && !google && (
            <small className="auth-muted">
              Google sign-in is not available yet.
            </small>
          )}
          <div className="auth-divider">
            <span>or continue with email</span>
          </div>
        </>
      )}
      <form onSubmit={submit} key={mode} className="email-login">
        {mode === "signup" && (
          <label>
            Full name
            <input
              name="name"
              autoComplete="name"
              required
              maxLength={60}
              disabled={!ready || busy}
              placeholder="Your name"
            />
          </label>
        )}
        {mode !== "password" && (
          <label>
            Email address
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              disabled={!ready || busy}
              placeholder="you@example.com"
            />
          </label>
        )}
        {mode !== "reset" && (
          <label>
            {mode === "password" ? "New password" : "Password"}
            <span className="password-field">
              <input
                name="password"
                type={visible ? "text" : "password"}
                autoComplete={
                  mode === "signin" ? "current-password" : "new-password"
                }
                required
                minLength={mode === "signin" ? 1 : 12}
                maxLength={128}
                disabled={!ready || busy}
                placeholder={
                  mode === "signin"
                    ? "Enter your password"
                    : "At least 12 characters"
                }
              />
              <button
                type="button"
                aria-label={visible ? "Hide password" : "Show password"}
                onClick={() => setVisible(!visible)}
              >
                {visible ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </span>
          </label>
        )}
        {mode === "signin" && (
          <button
            type="button"
            className="forgot-password"
            onClick={() => change("reset")}
          >
            Forgot password?
          </button>
        )}
        {mode === "reset" && (
          <p className="auth-muted">
            We’ll email you a link to choose a new password.
          </p>
        )}
        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="auth-success" role="status">
            {message}
          </p>
        )}
        <button
          type="submit"
          className="login-primary"
          disabled={!ready || busy}
        >
          {busy ? (
            <LoaderCircle className="spin" size={18} />
          ) : mode === "reset" ? (
            <Mail size={18} />
          ) : null}
          {mode === "signup"
            ? "Create account"
            : mode === "reset"
              ? "Send reset link"
              : mode === "password"
                ? "Save new password"
                : "Sign in"}
          <ArrowRight size={18} />
        </button>
        {mode === "reset" && (
          <button
            type="button"
            className="auth-back"
            onClick={() => change("signin")}
          >
            Back to sign in
          </button>
        )}
      </form>
    </div>
  );
}
