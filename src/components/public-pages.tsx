"use client";
import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  Search,
  Layers,
  ShieldCheck,
  ArrowLeft,
  LoaderCircle,
  LockKeyhole,
  Globe,
  AlertCircle,
} from "lucide-react";
import { Brand } from "./brand";
import {
  api,
  type Capsule,
  type License,
  type Workspace,
} from "@/lib/workspace";
import { Ask, Status } from "./studio";
export function PublicFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="public-simple">
      <header className="simple-nav">
        <Brand />
        <div>
          <Link href="/capsules" className="text-button">
            Explore capsules
          </Link>
          <Link href="/studio" className="button button-dark small">
            Your workspace <ArrowUpRight size={16} />
          </Link>
        </div>
      </header>
      {children}
      <footer className="public-footer section-wrap">
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Synapse</span>
          <div>
            <Link href="/">Home</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </div>
          <span>HUMAN EXPERTISE. CONNECTED.</span>
        </div>
      </footer>
    </div>
  );
}
export function Discovery() {
  const [search, setSearch] = useState("");
  const [domain, setDomain] = useState("all");
  const query = useQuery({
    queryKey: ["public-capsules"],
    queryFn: () => api<Capsule[]>("/capsules?visibility=PUBLIC"),
    retry: false,
  });
  const capsules = query.data || [];
  return (
    <PublicFrame>
      <main className="public-page-content">
        <div className="discovery-heading">
          <span className="eyebrow">KNOWLEDGE WITH A HUMAN BEHIND IT</span>
          <h1>
            Find the experience
            <br />
            <span className="serif">you’re missing.</span>
          </h1>
          <p>
            Explore expert-reviewed knowledge. Ask better questions. Follow
            every answer back to its source.
          </p>
        </div>
        <div className="discovery-controls">
          <label className="search-field">
            <Search size={18} />
            <input
              aria-label="Search public capsules"
              placeholder="Search a topic, skill, or capsule…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <select
            aria-label="Filter by domain"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
          >
            <option value="all">All domains</option>
            {Array.from(new Set(capsules.map((c) => c.domain))).map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </div>
        {query.isPending ? (
          <div className="loading-state">
            <LoaderCircle className="spin" size={22} />
            Finding published expertise…
          </div>
        ) : query.error ? (
          <div className="surface connection-state">
            <AlertCircle size={30} />
            <h2>The library isn’t connected yet.</h2>
            <p>{query.error.message}</p>
            <div>
              <button
                onClick={() => query.refetch()}
                className="button button-outline"
              >
                Try again
              </button>
              <Link href="/demo/explore" className="button button-dark">
                Explore a sample capsule <ArrowUpRight size={16} />
              </Link>
            </div>
          </div>
        ) : (
          <div className="capsule-grid">
            {capsules
              .filter(
                (c) =>
                  c.visibility === "PUBLIC" &&
                  c.status === "PUBLISHED" &&
                  (domain === "all" || c.domain === domain) &&
                  `${c.title} ${c.domain} ${c.scope}`
                    .toLowerCase()
                    .includes(search.toLowerCase()),
              )
              .map((c) => (
                <Link
                  href={`/capsules/${c.id}`}
                  className="capsule-card"
                  key={c.id}
                >
                  <div className="capsule-art">
                    <div className="capsule-art-grid" />
                    <Layers size={57} strokeWidth={1} />
                    <Status value="PUBLISHED" />
                    <span className="capsule-art-label">EXPERTISE CAPSULE</span>
                  </div>
                  <div className="capsule-card-content">
                    <span className="eyebrow">{c.domain}</span>
                    <h3>{c.title}</h3>
                    <p>{c.scope}</p>
                    <div className="capsule-card-footer">
                      <span>
                        <Globe size={12} />
                        Public capsule
                      </span>
                      <span>
                        View details <ArrowUpRight size={15} />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
          </div>
        )}
        {query.isSuccess && !capsules.length && (
          <div className="empty-state">
            <Layers size={35} />
            <h3>The next useful perspective could be yours.</h3>
            <p>Published public capsules will appear here.</p>
            <Link href="/register" className="button button-dark">
              Create your first capsule <ArrowUpRight size={17} />
            </Link>
          </div>
        )}
      </main>
    </PublicFrame>
  );
}
export function PublicCapsule({ id }: { id: string }) {
  const query = useQuery({
    queryKey: ["public-capsule", id],
    queryFn: () =>
      api<{ capsule: Capsule; contributor: string; templates: License[] }>(
        `/capsules/${id}/public`,
      ),
    retry: false,
  });
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  return (
    <PublicFrame>
      <main className="public-page-content">
        <Link href="/capsules" className="text-button">
          <ArrowLeft size={15} />
          Back to capsules
        </Link>
        {query.isPending ? (
          <div className="loading-state">
            <LoaderCircle className="spin" />
            Opening capsule…
          </div>
        ) : query.error ? (
          <div className="connection-state">
            <h1>We couldn’t open this capsule.</h1>
            <p>{query.error.message}</p>
            <Link href="/capsules" className="button button-dark">
              Explore available capsules
            </Link>
          </div>
        ) : query.data ? (
          <>
            <div className="page-heading" style={{ marginTop: 40 }}>
              <div>
                <span className="eyebrow">{query.data.capsule.domain}</span>
                <h1>{query.data.capsule.title}</h1>
                <p>
                  Contributed by {query.data.contributor} · v
                  {query.data.capsule.version}
                </p>
              </div>
              <Status value="PUBLISHED" />
            </div>
            <div className="detail-grid">
              <section className="surface">
                <span className="eyebrow">WHAT THIS CAPSULE COVERS</span>
                <h2 className="surface-large-title">
                  Practical knowledge.
                  <br />A clear point of view.
                </h2>
                <p className="surface-description">
                  {query.data.capsule.scope}
                </p>
                <div className="info-card">
                  <ShieldCheck size={22} />
                  <p>
                    Answers draw from approved knowledge in an immutable
                    published version. Unsupported questions receive an explicit
                    abstention.
                  </p>
                </div>
                <Link href={`/ask/${id}`} className="button button-dark">
                  Ask this capsule <ArrowUpRight size={17} />
                </Link>
              </section>
              <section className="surface">
                <div className="surface-heading">
                  <h2>Access & permissions</h2>
                  <LockKeyhole size={19} />
                </div>
                {query.data.templates.length ? (
                  query.data.templates.map((t) => (
                    <div className="version-entry" key={t.id}>
                      <strong>{t.name}</strong>
                      <p>Allowed purposes: {t.purposes.join(", ")}</p>
                      <p>
                        AI training:{" "}
                        {t.aiTrainingAllowed
                          ? "Explicitly allowed"
                          : "Not allowed"}
                      </p>
                      <p>
                        Commercial use:{" "}
                        {t.commercialUse ? "Allowed" : "Not allowed"}
                      </p>
                      <button
                        disabled={pending}
                        className="button button-outline small"
                        onClick={async () => {
                          setPending(true);
                          try {
                            await api(`/capsules/${id}/access-requests`, {
                              method: "POST",
                              body: JSON.stringify({ templateId: t.id }),
                            });
                            setMessage(
                              "Your access request has been sent to the capsule owner.",
                            );
                          } catch (err) {
                            setMessage((err as Error).message);
                          } finally {
                            setPending(false);
                          }
                        }}
                      >
                        Request access <ArrowUpRight size={14} />
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="surface-description">
                    This capsule currently requires an invitation from its
                    owner.
                  </p>
                )}
                {message && (
                  <p role="status" className="form-intro">
                    {message}
                  </p>
                )}
              </section>
            </div>
          </>
        ) : null}
      </main>
    </PublicFrame>
  );
}
export function LicensedAsk({ id }: { id: string }) {
  const query = useQuery({
    queryKey: ["licensed-capsule", id],
    queryFn: () => api<Workspace>(`/capsules/${id}/query-context`),
    retry: false,
  });
  const capsule = query.data?.capsules.find((c) => c.id === id);
  return (
    <PublicFrame>
      <main className="public-page-content">
        {query.isPending ? (
          <div className="loading-state">
            <LoaderCircle className="spin" />
            Checking licensed access…
          </div>
        ) : query.error || !query.data || !capsule ? (
          <div className="connection-state">
            <LockKeyhole size={32} />
            <h1>Your access opens the conversation.</h1>
            <p>
              {query.error?.message || "An active capsule license is required."}
            </p>
            <div>
              <Link href="/login" className="button button-dark">
                Sign in
              </Link>
              <Link href={`/capsules/${id}`} className="button button-outline">
                View access options
              </Link>
            </div>
          </div>
        ) : (
          <Ask
            w={query.data}
            capsule={capsule}
            demo={false}
            onChange={() => query.refetch()}
          />
        )}
      </main>
    </PublicFrame>
  );
}
