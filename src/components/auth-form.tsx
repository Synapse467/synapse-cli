"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowUpRight,
  ShieldCheck,
  ArrowLeft,
  LoaderCircle,
} from "lucide-react";
import { Brand } from "./brand";
import { api, authSchema } from "@/lib/workspace";
export function AuthForm({ register = false }: { register?: boolean }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  return (
    <main className="auth-page">
      <section className="auth-story">
        <Brand light />
        <div>
          <span className="eyebrow mint">
            YOUR EXPERIENCE HAS MORE TO GIVE.
          </span>
          <h1>
            What you know
            <br />
            could change
            <br />
            <span className="serif">someone’s next move.</span>
          </h1>
          <p>
            Give your expertise a place to grow—and a way to reach the people
            who need it.
          </p>
          <div className="auth-proof">
            <ShieldCheck size={20} /> Your knowledge stays under your control.
          </div>
        </div>
        <span className="auth-caption">HUMAN EXPERTISE. CONNECTED.</span>
      </section>
      <section className="auth-form-side">
        <Link href="/" className="text-button">
          <ArrowLeft size={16} /> Back to Synapse
        </Link>
        <div className="auth-form-wrap">
          <span className="eyebrow">
            {register
              ? "START SOMETHING WORTH SHARING"
              : "YOUR KNOWLEDGE IS WAITING"}
          </span>
          <h2>
            {register ? "Make room for\nyour expertise." : "Welcome back."}
          </h2>
          <p>
            {register
              ? "Create your account to start building your first capsule."
              : "Sign in to your Synapse workspace."}
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setError("");
              const data = Object.fromEntries(new FormData(e.currentTarget));
              const parsed = authSchema.safeParse(data);
              if (!parsed.success) {
                setError(parsed.error.issues[0].message);
                return;
              }
              setPending(true);
              try {
                await api(`/auth/${register ? "register" : "login"}`, {
                  method: "POST",
                  body: JSON.stringify(parsed.data),
                });
                router.push("/studio");
              } catch (err) {
                setError((err as Error).message);
              } finally {
                setPending(false);
              }
            }}
          >
            {register && (
              <label>
                Full name
                <input
                  name="name"
                  autoComplete="name"
                  placeholder="Your full name"
                  required
                  minLength={2}
                />
              </label>
            )}
            <label>
              Email address
              <input
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                required
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                autoComplete={register ? "new-password" : "current-password"}
                minLength={12}
                placeholder={
                  register ? "At least 12 characters" : "Your password"
                }
                required
              />
            </label>
            {register && (
              <label className="checkbox-label">
                <input type="checkbox" required />
                <span>
                  I agree to the <Link href="/terms">Terms</Link> and have read
                  the <Link href="/privacy">Privacy notice</Link>.
                </span>
              </label>
            )}
            {error && (
              <div role="alert" className="error-box">
                {error}
              </div>
            )}
            <button disabled={pending} className="button button-dark">
              {pending ? (
                <LoaderCircle className="spin" size={18} />
              ) : register ? (
                "Create account"
              ) : (
                "Sign in"
              )}
              <ArrowUpRight size={18} />
            </button>
          </form>
          <p className="auth-switch">
            {register ? "Already have an account?" : "New to Synapse?"}{" "}
            <Link href={register ? "/login" : "/register"}>
              {register ? "Sign in" : "Create an account"}
            </Link>
          </p>
          <div className="demo-invitation">
            <span>Want to look around first?</span>
            <Link href="/demo" className="text-button">
              Explore the interactive demo <ArrowUpRight size={15} />
            </Link>
            <small>Synthetic sample data. No account required.</small>
          </div>
        </div>
      </section>
    </main>
  );
}
