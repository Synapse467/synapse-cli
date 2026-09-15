"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useCallback } from "react";
import {
  ArrowUpRight,
  ShieldCheck,
  ArrowLeft,
  LoaderCircle,
  Wallet,
  KeyRound,
  ChevronDown,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Brand } from "./brand";
import { api, authSchema } from "@/lib/workspace";

// ─── Freighter wallet helper (lazy-loaded to avoid SSR issues) ──────────────
async function connectFreighter(): Promise<{ publicKey: string; signedMessage: string; nonce: string }> {
  // Dynamic import keeps this out of the SSR bundle
  const freighter = await import("@stellar/freighter-api");

  // Check extension is installed
  const connected = await freighter.isConnected();
  if (!connected.isConnected) {
    throw new Error(
      "Freighter wallet is not installed. Install it from freighter.app then reload this page."
    );
  }

  // Request access (shows Freighter permission popup)
  const access = await freighter.requestAccess();
  if (access.error) throw new Error(access.error);

  const publicKey = access.address;
  if (!publicKey) throw new Error("Freighter did not return a public key.");

  // Request a challenge nonce from the API
  const challengeRes = await api("/auth/wallet-challenge", {
    method: "POST",
    body: JSON.stringify({ publicKey }),
  });
  const { message, nonce } = challengeRes as { message: string; nonce: string };

  // Ask Freighter to sign the challenge message
  const signResult = await freighter.signMessage(message, { address: publicKey });
  if (signResult.error) throw new Error(signResult.error);

  const rawSig = signResult.signedMessage;
  if (!rawSig) throw new Error("Freighter did not return a signed message.");
  const signedMessage =
    typeof rawSig === "string"
      ? rawSig
      : Buffer.from(rawSig).toString("base64");

  return { publicKey, signedMessage, nonce };
}

export function AuthForm({ register = false }: { register?: boolean }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [walletStep, setWalletStep] = useState<"idle" | "connecting" | "naming" | "done">("idle");
  const [walletInfo, setWalletInfo] = useState<{ publicKey: string; signedMessage: string; nonce: string } | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [emailOpen, setEmailOpen] = useState(false);
  const [pending, setPending] = useState(false);

  // ── Step 1: connect wallet, get publicKey + signature ──────────────────────
  const handleWalletConnect = useCallback(async () => {
    setError("");
    setWalletStep("connecting");
    try {
      const info = await connectFreighter();
      setWalletInfo(info);
      // On registration ask for a display name; on login verify directly
      if (register) {
        setWalletStep("naming");
      } else {
        setWalletStep("done");
        await verifyAndLogin(info, undefined);
      }
    } catch (err) {
      setError((err as Error).message);
      setWalletStep("idle");
    }
  }, [register]);

  // ── Step 2: send signature to API ─────────────────────────────────────────
  const verifyAndLogin = async (
    info: { publicKey: string; signedMessage: string; nonce: string },
    name: string | undefined
  ) => {
    setPending(true);
    try {
      await api("/auth/wallet-verify", {
        method: "POST",
        body: JSON.stringify({
          publicKey: info.publicKey,
          nonce: info.nonce,
          signedMessage: info.signedMessage,
          displayName: name,
        }),
      });
      router.push("/studio");
    } catch (err) {
      setError((err as Error).message);
      setWalletStep("idle");
    } finally {
      setPending(false);
    }
  };

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletInfo) return;
    if (!displayName.trim() || displayName.trim().length < 2) {
      setError("Please enter your full name (at least 2 characters).");
      return;
    }
    await verifyAndLogin(walletInfo, displayName.trim());
  };

  return (
    <main className="auth-page">
      <section className="auth-story">
        <Brand light />
        <div>
          <span className="eyebrow mint">YOUR EXPERIENCE HAS MORE TO GIVE.</span>
          <h1>
            What you know
            <br />
            could change
            <br />
            <span className="serif">someone's next move.</span>
          </h1>
          <p>Give your expertise a place to grow—and a way to reach the people who need it.</p>
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
            {register ? "START SOMETHING WORTH SHARING" : "YOUR KNOWLEDGE IS WAITING"}
          </span>
          <h2>{register ? "Make room for\nyour expertise." : "Welcome back."}</h2>
          <p>
            {register
              ? "Connect your Freighter wallet to build your first capsule."
              : "Sign in with your Freighter wallet to access your workspace."}
          </p>

          {/* ── PRIMARY: Freighter wallet ───────────────────────────────── */}
          <div className="wallet-auth-block">
            <div className="wallet-badge">
              <span className="wallet-badge-pill">Recommended</span>
            </div>

            {walletStep === "idle" && (
              <button
                className="button button-wallet"
                onClick={handleWalletConnect}
                disabled={pending}
                id="btn-freighter-connect"
              >
                <Wallet size={20} />
                {register ? "Create account with Freighter" : "Sign in with Freighter"}
                <ArrowUpRight size={18} />
              </button>
            )}

            {walletStep === "connecting" && (
              <button className="button button-wallet" disabled>
                <LoaderCircle className="spin" size={18} />
                Connecting to Freighter…
              </button>
            )}

            {walletStep === "naming" && walletInfo && (
              <form onSubmit={handleNameSubmit} className="wallet-name-form">
                <div className="wallet-connected-badge">
                  <CheckCircle2 size={16} className="text-mint" />
                  <span>Wallet connected · {walletInfo.publicKey.slice(0, 8)}…{walletInfo.publicKey.slice(-4)}</span>
                </div>
                <label>
                  Your full name
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="How should we address you?"
                    autoFocus
                    required
                    minLength={2}
                    maxLength={120}
                  />
                  <small>Used in your expert profile and capsule attribution.</small>
                </label>
                <button
                  type="submit"
                  className="button button-dark"
                  disabled={pending}
                  id="btn-wallet-complete"
                >
                  {pending ? <LoaderCircle className="spin" size={18} /> : null}
                  Create my account
                  <ArrowUpRight size={18} />
                </button>
              </form>
            )}

            {walletStep === "done" && (
              <button className="button button-wallet" disabled>
                <LoaderCircle className="spin" size={18} />
                Signing you in…
              </button>
            )}

            {!walletInfo && walletStep === "idle" && (
              <p className="wallet-hint">
                Don't have Freighter?{" "}
                <a
                  href="https://freighter.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-link"
                >
                  Install the free browser extension →
                </a>
              </p>
            )}
          </div>

          {error && (
            <div role="alert" className="error-box" style={{ marginTop: "1rem" }}>
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {/* ── DIVIDER ──────────────────────────────────────────────────── */}
          <div className="auth-divider">
            <span>or</span>
          </div>

          {/* ── SECONDARY: email/password ─────────────────────────────────── */}
          <button
            type="button"
            className="auth-email-toggle"
            onClick={() => setEmailOpen((o) => !o)}
            id="btn-email-toggle"
            aria-expanded={emailOpen}
          >
            <KeyRound size={16} />
            {register ? "Create account with email instead" : "Sign in with email instead"}
            <ChevronDown
              size={16}
              style={{
                marginLeft: "auto",
                transform: emailOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s ease",
              }}
            />
          </button>

          {emailOpen && (
            <form
              className="email-auth-form"
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
                  <input name="name" autoComplete="name" placeholder="Your full name" required minLength={2} />
                </label>
              )}
              <label>
                Email address
                <input name="email" type="email" autoComplete="email" placeholder="you@company.com" required />
              </label>
              <label>
                Password
                <input
                  name="password"
                  type="password"
                  autoComplete={register ? "new-password" : "current-password"}
                  minLength={12}
                  placeholder={register ? "At least 12 characters" : "Your password"}
                  required
                />
              </label>
              {register && (
                <label className="checkbox-label">
                  <input type="checkbox" required />
                  <span>
                    I agree to the <Link href="/terms">Terms</Link> and have read the{" "}
                    <Link href="/privacy">Privacy notice</Link>.
                  </span>
                </label>
              )}
              <button disabled={pending} className="button button-dark" id="btn-email-submit">
                {pending ? <LoaderCircle className="spin" size={18} /> : register ? "Create account" : "Sign in"}
                <ArrowUpRight size={18} />
              </button>
            </form>
          )}

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
