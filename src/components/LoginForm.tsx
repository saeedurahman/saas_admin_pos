"use client";
import { useState } from "react";
import { login } from "@/lib/api";
import { hasErrors, isEmail, isTotp, type Errors } from "@/lib/validation";
import { Button, Notice, TextField } from "./ui";

type Field = "email" | "password" | "code";

export function LoginForm({ expired = false, onSuccess }: { expired?: boolean; onSuccess?: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [errors, setErrors] = useState<Errors<Field>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setError(null);
    const e: Errors<Field> = {};
    if (!isEmail(email)) e.email = "Enter your email address.";
    if (!password) e.password = "Enter your password.";
    if (!isTotp(code)) e.code = "Enter the 6-digit code from your authenticator app.";
    setErrors(e);
    if (hasErrors(e)) return;

    setBusy(true);
    try {
      await login(email.trim(), password, code.trim());
      (onSuccess ?? (() => window.location.assign("/")))();
    } catch (err) {
      setError((err as Error).message);
      setCode("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {expired && !error && <Notice kind="error">You were signed out. Please sign in again.</Notice>}
      {error && <Notice kind="error">{error}</Notice>}
      <TextField id="login-email" label="Email" type="email" value={email} onChange={setEmail} error={errors.email} autoComplete="username" inputMode="email" />
      <TextField id="login-password" label="Password" type="password" value={password} onChange={setPassword} error={errors.password} autoComplete="current-password" />
      <TextField
        id="login-code"
        label="6-digit code"
        value={code}
        onChange={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))}
        error={errors.code}
        hint="Open your authenticator app and type the current code."
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
      />
      <Button type="submit" loading={busy} className="w-full">
        Sign in
      </Button>
    </form>
  );
}
