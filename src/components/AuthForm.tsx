"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export default function AuthForm({
  mode,
  defaultRole = "renter",
  next,
}: {
  mode: "login" | "signup";
  defaultRole?: "owner" | "renter";
  next?: string;
}) {
  const router = useRouter();
  const [role, setRole] = useState(defaultRole);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email"));
    const password = String(f.get("password"));
    const res =
      mode === "signup"
        ? await authClient.signUp.email({
            email,
            password,
            name: String(f.get("name")),
            phone: String(f.get("phone") || "") || undefined,
            role,
          })
        : await authClient.signIn.email({ email, password });
    setLoading(false);
    if (res.error) {
      setError(res.error.message ?? "Something went wrong. Please try again.");
      return;
    }
    const target = next || (mode === "signup" ? (role === "owner" ? "/dashboard" : "/listings") : "/dashboard");
    router.push(target);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {mode === "signup" && (
        <>
          <fieldset>
            <legend className="label">I want to</legend>
            <div className="grid grid-cols-2 gap-2">
              {(["renter", "owner"] as const).map((r) => (
                <button
                  type="button"
                  key={r}
                  onClick={() => setRole(r)}
                  aria-pressed={role === r}
                  className={`rounded-md border px-3 py-2 text-sm font-medium ${
                    role === r ? "border-emerald-700 bg-emerald-50 text-emerald-800" : "border-slate-300 text-slate-700"
                  }`}
                >
                  {r === "renter" ? "Find a place to rent" : "List my property"}
                </button>
              ))}
            </div>
          </fieldset>
          <div>
            <label className="label" htmlFor="name">Full name</label>
            <input className="input" id="name" name="name" required autoComplete="name" />
          </div>
          <div>
            <label className="label" htmlFor="phone">Mobile number <span className="text-slate-400">(optional)</span></label>
            <input className="input" id="phone" name="phone" type="tel" placeholder="09XX XXX XXXX" autoComplete="tel" />
          </div>
        </>
      )}
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input className="input" id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input
          className="input" id="password" name="password" type="password" required minLength={8}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
        />
      </div>
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <button className="btn w-full" disabled={loading}>
        {loading ? "Please wait…" : mode === "signup" ? "Create account" : "Log in"}
      </button>
      <p className="text-center text-sm text-slate-600">
        {mode === "signup" ? (
          <>Already have an account? <Link className="text-emerald-700 underline" href="/login">Log in</Link></>
        ) : (
          <>New to Oopa? <Link className="text-emerald-700 underline" href="/signup">Create an account</Link></>
        )}
      </p>
    </form>
  );
}
