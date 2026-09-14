"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpRight,
  ArrowRight,
  Plus,
  Layers,
  AudioLines,
  FileText,
  ShieldCheck,
  ChartNoAxesCombined,
  Settings,
  Search,
  Check,
  ChevronRight,
  X,
  LogOut,
  Upload,
  Mic,
  Square,
  LoaderCircle,
  AlertCircle,
  Globe,
  LockKeyhole,
  Send,
  Quote,
  FlaskConical,
  ExternalLink,
  MoreHorizontal,
  Menu,
  RotateCcw,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { Brand } from "./brand";
import {GoldenCases} from './golden-cases';
import {DocumentUpload} from './document-upload';
import { saveChunk, pendingChunks, flushCapture } from "@/lib/capture-queue";
import {
  api,
  ApiError,
  applyDemoAction,
  loadDemo,
  persistDemo,
  resetDemo,
  askDemo,
  type Workspace,
  type Capsule,
  type Action,
  type Answer,
  type Knowledge,
} from "@/lib/workspace";
type Mutate = (action: Action) => Promise<Workspace>;
const date = (value: string) =>
  new Date(value).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
export function Status({ value }: { value: string }) {
  return (
    <span className={`status status-${value.toLowerCase()}`}>
      {value.toLowerCase().replaceAll("_", " ")}
    </span>
  );
}
function Modal({
  title,
  children,
  close,
}: {
  title: string;
  children: React.ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      onCancel={close}
      onClick={(e) => {
        if (e.target === ref.current) close();
      }}
    >
      <div className="modal-title">
        <h2>{title}</h2>
        <button
          onClick={close}
          className="icon-button"
          aria-label="Close dialog"
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
function Empty({
  icon: Icon = Layers,
  title,
  description,
  children,
}: {
  icon?: typeof Layers;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon size={29} strokeWidth={1.3} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </div>
  );
}
function CapsuleCard({
  capsule,
  w,
  base,
}: {
  capsule: Capsule;
  w: Workspace;
  base: string;
}) {
  const items = w.knowledge.filter((k) => k.capsuleId === capsule.id);
  return (
    <Link className="capsule-card" href={`${base}/capsules/${capsule.id}`}>
      <div
        className={`capsule-art domain-${capsule.domain.includes("leadership") ? "blue" : "green"}`}
      >
        <div className="capsule-art-grid" />
        <Layers size={52} strokeWidth={1} />
        <span className="capsule-art-label">EXPERTISE CAPSULE</span>
        <Status value={capsule.status} />
      </div>
      <div className="capsule-card-content">
        <span className="eyebrow">{capsule.domain}</span>
        <h3>{capsule.title}</h3>
        <p>{capsule.scope}</p>
        <div className="capsule-meta">
          <span>
            <FileText size={13} />
            {w.sources.filter((s) => s.capsuleId === capsule.id).length} sources
          </span>
          <span>
            {items.filter((k) => k.status === "APPROVED").length} approved
            insights
          </span>
        </div>
        <div className="capsule-card-footer">
          <span>
            {capsule.visibility === "PRIVATE" ? (
              <LockKeyhole size={12} />
            ) : (
              <Globe size={12} />
            )}{" "}
            {capsule.visibility.toLowerCase()}
          </span>
          <span>
            {capsule.version ? `v${capsule.version}` : "Continue building"}{" "}
            <ArrowUpRight size={14} />
          </span>
        </div>
      </div>
    </Link>
  );
}
export function Studio({
  segments = [],
  demo = false,
}: {
  segments?: string[];
  demo?: boolean;
}) {
  const router = useRouter();
  const base = demo ? "/demo" : "/studio";
  const client = useQueryClient();
  const [modal, setModal] = useState(false);
  const [sidebar, setSidebar] = useState(false);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const key = ["workspace", demo];
  const query = useQuery({
    queryKey: key,
    queryFn: () =>
      demo ? Promise.resolve(loadDemo()) : api<Workspace>("/workspace"),
    retry: false,
  });
  const mutation = useMutation({
    mutationFn: async (action: Action) => {
      if (demo) {
        const w = applyDemoAction(loadDemo(), action);
        persistDemo(w);
        return w;
      }
      return api<Workspace>("/workspace/actions", {
        method: "POST",
        body: JSON.stringify(action),
      });
    },
    onSuccess: (w) => client.setQueryData(key, w),
  });
  const mutate: Mutate = async (action) => {
    setNotice("");
    try {
      const w = await mutation.mutateAsync(action);
      setNotice("Changes saved.");
      return w;
    } catch (err) {
      setNotice((err as Error).message);
      throw err;
    }
  };
  const w = query.data;
  const section = segments[0] || "overview";
  const capsule = w?.capsules.find((c) => c.id === segments[1]);
  const tab = segments[2] || "overview";
  const nav = [
    {
      label: "Overview",
      href: base,
      icon: ChartNoAxesCombined,
      active: section === "overview",
    },
    {
      label: "My capsules",
      href: `${base}/capsules`,
      icon: Layers,
      active: section === "capsules",
    },
    {
      label: "Licenses & access",
      href: `${base}/licenses`,
      icon: ShieldCheck,
      active: section === "licenses",
    },
    {
      label: "Usage & earnings",
      href: `${base}/usage`,
      icon: ChartNoAxesCombined,
      active: section === "usage",
    },
  ];
  return (
    <div className="workspace">
      <aside className={`sidebar ${sidebar ? "sidebar-open" : ""}`}>
        <Brand />
        <button className="sidebar-workspace">
          <span className="workspace-avatar">
            {w?.profile.name.charAt(0) || "S"}
          </span>
          <span>
            Personal workspace<small>Expert Studio</small>
          </span>
          <MoreHorizontal size={16} />
        </button>
        <span className="sidebar-label">WORKSPACE</span>
        <nav>
          {nav.map((n) => (
            <Link
              key={n.label}
              className={n.active ? "active" : ""}
              href={n.href}
              onClick={() => setSidebar(false)}
            >
              <n.icon size={18} />
              {n.label}
              {n.label === "My capsules" && (
                <span className="nav-count">{w?.capsules.length || 0}</span>
              )}
            </Link>
          ))}
        </nav>
        <span className="sidebar-label discover-label">DISCOVER</span>
        <nav>
          <Link href={demo ? `${base}/explore` : "/capsules"}>
            <Globe size={18} />
            Explore capsules
            <ArrowUpRight size={13} />
          </Link>
          <Link
            className={section === "profile" ? "active" : ""}
            href={`${base}/profile`}
          >
            <Settings size={18} />
            Expert profile
          </Link>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <span className="tiny-star">✳</span>
            <strong>Start with what you know.</strong>
            <p>One good story can become your first useful insight.</p>
            <button onClick={() => setModal(true)}>
              Create a capsule <ArrowRight size={14} />
            </button>
          </div>
          <Link className="sidebar-user" href={`${base}/profile`}>
            <span className="avatar">
              {w?.profile.name
                .split(" ")
                .map((s) => s[0])
                .join("")
                .slice(0, 2) || "SY"}
            </span>
            <span>
              {w?.profile.name || "Your workspace"}
              <small>{demo ? "Demo expert" : "Personal account"}</small>
            </span>
            <Settings size={16} />
          </Link>
        </div>
      </aside>
      <div className="workspace-main">
        <header className="workspace-header">
          <button
            className="icon-button sidebar-toggle"
            aria-label="Toggle sidebar"
            onClick={() => setSidebar(!sidebar)}
          >
            <Menu size={20} />
          </button>
          <div className="breadcrumbs">
            <span>Expert Studio</span>
            <ChevronRight size={12} />
            <strong>
              {capsule
                ? capsule.title
                : section === "overview"
                  ? "Overview"
                  : section.replaceAll("-", " ")}
            </strong>
          </div>
          <div className="workspace-header-right">
            <Link href="/" className="text-button">
              Synapse home <ArrowUpRight size={14} />
            </Link>
            <button
              className="icon-button"
              aria-label={demo ? "Exit demo" : "Sign out"}
              onClick={async () => {
                if (!demo)
                  await api("/auth/logout", { method: "POST" }).catch(() => {});
                client.clear();
                router.push("/");
              }}
            >
              <LogOut size={17} />
            </button>
          </div>
        </header>
        {demo && (
          <div className="demo-banner">
            <span>
              <FlaskConical size={14} />
              <strong>Interactive demo</strong> · Synthetic data saved only in
              this browser. AI and publishing are simulated.
            </span>
            <button
              onClick={() => {
                resetDemo();
                client.invalidateQueries({ queryKey: key });
                setNotice("Demo reset.");
              }}
            >
              <RotateCcw size={12} /> Reset
            </button>
          </div>
        )}
        <div className="workspace-content">
          {notice && (
            <div className="toast" role="status">
              <span>{notice}</span>
              <button
                className="icon-button"
                aria-label="Dismiss notification"
                onClick={() => setNotice("")}
              >
                <X size={15} />
              </button>
            </div>
          )}
          {query.isPending ? (
            <div className="loading-state">
              <LoaderCircle className="spin" /> Opening your workspace…
            </div>
          ) : query.error ? (
            <div className="connection-state">
              <AlertCircle size={35} />
              <h1>
                {query.error instanceof ApiError && query.error.status === 401
                  ? "Sign in to your workspace"
                  : "Your workspace is not connected yet."}
              </h1>
              <p>{query.error.message}</p>
              <div>
                <Link className="button button-dark" href="/login">
                  Sign in <ArrowUpRight size={17} />
                </Link>
                <Link className="button button-outline" href="/demo">
                  Explore the interactive demo
                </Link>
                <button className="text-button" onClick={() => query.refetch()}>
                  Try again
                </button>
              </div>
            </div>
          ) : w ? (
            <>
              {section === "overview" ||
              (section === "capsules" && !capsule && !segments[1]) ? (
                <>
                  <div className="page-heading">
                    <div>
                      <span className="eyebrow">
                        {section === "overview"
                          ? "A LITTLE KNOWLEDGE GOES A LONG WAY"
                          : "YOUR EXPERTISE, ORGANISED"}
                      </span>
                      <h1>
                        {section === "overview"
                          ? `Good to see you, ${w.profile.name.split(" ")[0]}.`
                          : "Your capsules."}
                      </h1>
                      <p>
                        {section === "overview"
                          ? "Your experience is taking shape. Here’s where things stand."
                          : "Build, refine, and share the things only you know."}
                      </p>
                    </div>
                    <button
                      onClick={() => setModal(true)}
                      className="button button-dark"
                    >
                      <Plus size={17} />
                      New capsule
                    </button>
                  </div>
                  {section === "overview" && (
                    <>
                      <div className="stat-grid">
                        <Stat
                          label="Total capsules"
                          value={w.capsules.length}
                          detail={`${w.capsules.filter((c) => c.status === "PUBLISHED").length} published`}
                          icon={Layers}
                        />
                        <Stat
                          label="Approved insights"
                          value={
                            w.knowledge.filter((k) => k.status === "APPROVED")
                              .length
                          }
                          detail="Knowledge you’ve signed off on"
                          icon={CheckCircle2}
                        />
                        <Stat
                          label="Awaiting review"
                          value={
                            w.knowledge.filter((k) => k.status === "PENDING")
                              .length
                          }
                          detail="Your judgement makes the difference"
                          icon={FileText}
                        />
                        <Stat
                          label="Questions answered"
                          value={w.usage.length}
                          detail="Across your licensed capsules"
                          icon={Quote}
                        />
                      </div>
                      <div className="studio-feature">
                        <div>
                          <span className="eyebrow">
                            CAPTURE THE KNOW-HOW BEHIND THE KNOWLEDGE
                          </span>
                          <h2>
                            Your next capsule starts
                            <br />
                            with a <span className="serif">conversation.</span>
                          </h2>
                          <p>
                            Talk through a decision, a difficult case, or a
                            lesson you learned. We’ll help you find the useful
                            parts.
                          </p>
                          <button
                            className="button button-dark small"
                            onClick={() => setModal(true)}
                          >
                            Start capturing <ArrowUpRight size={16} />
                          </button>
                        </div>
                        <div className="feature-wave">
                          <AudioLines size={100} strokeWidth={0.75} />
                          <span>EXPERIENCE → INSIGHT</span>
                        </div>
                      </div>
                    </>
                  )}
                  <div className="list-toolbar">
                    <h2>
                      {section === "overview"
                        ? "Your capsules"
                        : "All capsules"}{" "}
                      <span>{w.capsules.length}</span>
                    </h2>
                    <label className="search-field">
                      <Search size={16} />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search capsules"
                        aria-label="Search your capsules"
                      />
                    </label>
                  </div>
                  <div className="capsule-grid">
                    {w.capsules
                      .filter((c) =>
                        `${c.title} ${c.domain}`
                          .toLowerCase()
                          .includes(search.toLowerCase()),
                      )
                      .map((c) => (
                        <CapsuleCard capsule={c} w={w} base={base} key={c.id} />
                      ))}
                    <button
                      className="new-capsule-card"
                      onClick={() => setModal(true)}
                    >
                      <span>
                        <Plus size={26} />
                      </span>
                      <strong>A new chapter of your expertise</strong>
                      <p>Turn your next idea into a capsule.</p>
                      <span className="text-button">
                        Create capsule <ArrowUpRight size={15} />
                      </span>
                    </button>
                  </div>
                </>
              ) : section === "capsules" && capsule ? (
                <>
                  <div className="page-heading capsule-heading">
                    <div>
                      <Link href={`${base}/capsules`} className="eyebrow">
                        ← ALL CAPSULES
                      </Link>
                      <h1>{capsule.title}</h1>
                      <p>
                        {capsule.domain}{" "}
                        <span className="inline-divider">/</span>{" "}
                        {capsule.scope}
                      </p>
                    </div>
                    <Status value={capsule.status} />
                  </div>
                  <nav className="capsule-tabs" aria-label="Capsule sections">
                    {[
                      ["overview", "Overview"],
                      ["sources", "Sources"],
                      ["interview", "Interview"],
                      ["knowledge", "Knowledge"],
                      ["conflicts", "Conflicts"],
                      ["evals", "Evaluations"],
                      ["publish", "Publish"],
                    ].map(([id, label]) => (
                      <Link
                        href={`${base}/capsules/${capsule.id}${id === "overview" ? "" : `/${id}`}`}
                        className={tab === id ? "active" : ""}
                        key={id}
                      >
                        {label}
                        {id === "knowledge" && (
                          <span>
                            {
                              w.knowledge.filter(
                                (k) =>
                                  k.capsuleId === capsule.id &&
                                  k.status === "PENDING",
                              ).length
                            }
                          </span>
                        )}
                      </Link>
                    ))}
                  </nav>
                  {tab === "overview" ? (
                    <CapsuleOverview w={w} capsule={capsule} base={base} />
                  ) : tab === "sources" ? (
                    <Sources
                      w={w}
                      capsule={capsule}
                      mutate={mutate}
                      demo={demo}
                    />
                  ) : tab === "interview" ? (
                    <Interview capsule={capsule} mutate={mutate} demo={demo} />
                  ) : tab === "knowledge" || tab === "conflicts" ? (
                    <KnowledgeReview
                      w={w}
                      capsule={capsule}
                      mutate={mutate}
                      conflicts={tab === "conflicts"}
                    />
                  ) : tab === "evals" ? (
                    <Evaluations
                      w={w}
                      capsule={capsule}
                      mutate={mutate}
                      demo={demo}
                    />
                  ) : tab === "publish" ? (
                    <Publish
                      w={w}
                      capsule={capsule}
                      mutate={mutate}
                      demo={demo}
                    />
                  ) : (
                    <Empty
                      title="Screen not found"
                      description="Choose one of the capsule sections above."
                    />
                  )}
                </>
              ) : section === "licenses" ? (
                <Licenses w={w} mutate={mutate} />
              ) : section === "usage" ? (
                <Usage w={w} />
              ) : section === "profile" ? (
                <Profile w={w} mutate={mutate} />
              ) : section === "explore" ? (
                <>
                  <div className="page-heading">
                    <div>
                      <span className="eyebrow">
                        HUMAN KNOWLEDGE. READY TO HELP.
                      </span>
                      <h1>Find your next perspective.</h1>
                      <p>Explore this demo’s published expertise capsules.</p>
                    </div>
                  </div>
                  <div className="capsule-grid">
                    {w.capsules
                      .filter(
                        (c) =>
                          c.visibility === "PUBLIC" && c.status === "PUBLISHED",
                      )
                      .map((c) => (
                        <div key={c.id}>
                          <CapsuleCard capsule={c} w={w} base={base} />
                          <Link
                            href={`${base}/ask/${c.id}`}
                            className="button button-dark ask-card-button"
                          >
                            Ask this capsule <ArrowUpRight size={17} />
                          </Link>
                        </div>
                      ))}
                  </div>
                </>
              ) : section === "ask" && capsule ? (
                <Ask
                  w={w}
                  capsule={capsule}
                  demo={demo}
                  onChange={(next) => {
                    persistDemo(next);
                    client.setQueryData(key, next);
                  }}
                />
              ) : (
                <Empty
                  title="We couldn’t find that page."
                  description="Return to your overview to keep working."
                >
                  <Link className="button button-dark" href={base}>
                    Workspace overview
                  </Link>
                </Empty>
              )}
            </>
          ) : null}
        </div>
      </div>
      {modal && (
        <Modal title="Create a capsule" close={() => setModal(false)}>
          <p className="form-intro">
            Give a useful part of your experience a home. You can add sources
            and refine it as you go.
          </p>
          <Form
            onSubmit={async (data) => {
              await mutate({ type: "create-capsule", data });
              setModal(false);
            }}
            submit="Create capsule"
          >
            <label>
              Capsule title
              <input
                name="title"
                placeholder="e.g. The field engineer’s playbook"
                minLength={3}
                maxLength={120}
                required
              />
            </label>
            <label>
              Domain
              <input
                name="domain"
                placeholder="e.g. Operations & engineering"
                minLength={2}
                maxLength={80}
                required
              />
            </label>
            <label>
              What should this capsule help people do?
              <textarea
                name="scope"
                placeholder="Describe its scope, practical uses, and boundaries…"
                minLength={15}
                maxLength={2000}
                required
                rows={4}
              />
            </label>
            <label>
              Visibility
              <select name="visibility">
                <option value="PRIVATE">
                  Private — only people you invite
                </option>
                <option value="PUBLIC">
                  Public — discoverable after publishing
                </option>
              </select>
            </label>
          </Form>
        </Modal>
      )}
    </div>
  );
}
function Stat({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: number;
  detail: string;
  icon: typeof Layers;
}) {
  return (
    <div className="stat-card">
      <div>
        <span>{label}</span>
        <Icon size={17} />
      </div>
      <strong>{value.toString().padStart(2, "0")}</strong>
      <small>{detail}</small>
    </div>
  );
}
function Form({
  children,
  onSubmit,
  submit = "Save changes",
}: {
  children: React.ReactNode;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  submit?: string;
}) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  return (
    <form
      className="product-form"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const data: Record<string, unknown> = Object.fromEntries(
          new FormData(form),
        );
        form
          .querySelectorAll<HTMLInputElement>("input[type=checkbox]")
          .forEach((el) => (data[el.name] = el.checked));
        setPending(true);
        setError("");
        try {
          await onSubmit(data);
        } catch (err) {
          setError((err as Error).message);
        } finally {
          setPending(false);
        }
      }}
    >
      {children}
      {error && (
        <div role="alert" className="error-box">
          {error}
        </div>
      )}
      <button disabled={pending} className="button button-dark">
        {pending ? <LoaderCircle size={17} className="spin" /> : submit}
        <ArrowUpRight size={17} />
      </button>
    </form>
  );
}
function CapsuleOverview({
  w,
  capsule,
  base,
}: {
  w: Workspace;
  capsule: Capsule;
  base: string;
}) {
  const sources = w.sources.filter((s) => s.capsuleId === capsule.id);
  const knowledge = w.knowledge.filter((k) => k.capsuleId === capsule.id);
  return (
    <div className="detail-grid">
      <section className="surface">
        <div className="surface-heading">
          <h2>A little experience. A lot of possibility.</h2>
          <Layers size={20} />
        </div>
        <p className="surface-description">
          Build a capsule you can stand behind. Each step keeps your expertise
          accurate, attributable, and under your control.
        </p>
        <div className="journey-list">
          {[
            {
              title: "Capture your experience",
              description: `${sources.length} sources added. Upload a document or start an interview.`,
              done: sources.length > 0,
              href: "sources",
              icon: Upload,
            },
            {
              title: "Review the knowledge",
              description: `${knowledge.filter((k) => k.status === "PENDING").length} insights are waiting for your judgement.`,
              done: knowledge.some((k) => k.status === "APPROVED"),
              href: "knowledge",
              icon: Check,
            },
            {
              title: "Check the answers",
              description:
                "Evaluate grounding, citations, and unsupported questions.",
              done: w.evaluations.some(
                (e) => e.capsuleId === capsule.id && e.passed,
              ),
              href: "evals",
              icon: FlaskConical,
            },
            {
              title: "Publish a version",
              description:
                "An immutable snapshot of the knowledge you approve.",
              done: !!capsule.version,
              href: "publish",
              icon: Layers,
            },
          ].map((step, i) => (
            <Link
              href={`${base}/capsules/${capsule.id}/${step.href}`}
              className="journey-step"
              key={step.href}
            >
              <span className={`journey-number ${step.done ? "complete" : ""}`}>
                {step.done ? (
                  <Check size={17} />
                ) : (
                  String(i + 1).padStart(2, "0")
                )}
              </span>
              <div>
                <strong>{step.title}</strong>
                <p>{step.description}</p>
              </div>
              <ArrowUpRight size={18} />
            </Link>
          ))}
        </div>
      </section>
      <aside>
        <div className="surface capsule-summary">
          <span className="eyebrow">CAPSULE DETAILS</span>
          <h3>Knowledge with a clear boundary.</h3>
          <p>{capsule.scope}</p>
          <dl>
            <div>
              <dt>Contributor</dt>
              <dd>{w.profile.name}</dd>
            </div>
            <div>
              <dt>Visibility</dt>
              <dd>{capsule.visibility.toLowerCase()}</dd>
            </div>
            <div>
              <dt>Latest version</dt>
              <dd>
                {capsule.version ? `v${capsule.version}` : "Not published"}
              </dd>
            </div>
            <div>
              <dt>Updated</dt>
              <dd>{date(capsule.updatedAt)}</dd>
            </div>
          </dl>
          {capsule.version && (
            <Link
              href={`${base}/ask/${capsule.id}`}
              className="button button-dark"
            >
              Ask this capsule <ArrowUpRight size={16} />
            </Link>
          )}
        </div>
        <div className="info-card">
          <ShieldCheck size={21} />
          <p>
            Unpublished knowledge stays private. Licensees can only query the
            approved knowledge in a published version.
          </p>
        </div>
      </aside>
    </div>
  );
}
function Sources({
  w,
  capsule,
  mutate,
  demo,
}: {
  w: Workspace;
  capsule: Capsule;
  mutate: Mutate;
  demo: boolean;
}) {
  const queryClient=useQueryClient();
  const [modal, setModal] = useState(false);
  const [view, setView] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [filename, setFilename] = useState("");
  const [error, setError] = useState("");
  const sources = w.sources.filter((s) => s.capsuleId === capsule.id);
  return (
    <>
      <div className="section-heading">
        <div>
          <h2>Your source material.</h2>
          <p>
            Documents, notes, and real-world cases. Every insight starts
            somewhere.
          </p>
        </div>
        <button
          className="button button-dark small"
          onClick={() => setModal(true)}
        >
          <Plus size={16} />
          Add source
        </button>
      </div>
      <button className="upload-zone" onClick={() => setModal(true)}>
        <span>
          <Upload size={26} />
        </span>
        <strong>Bring your experience in.</strong>
        <p>Add a note, case, or text document to begin extracting knowledge.</p>
        <small>Text and Markdown · Up to 5 MB</small>
      </button>
      {sources.length > 0 ? (
        <div className="surface table-wrap">
          <table>
            <thead>
              <tr>
                <th>Source</th>
                <th>Contributor</th>
                <th>Added</th>
                <th>Insights</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {sources.map((s) => (
                <tr key={s.id}>
                  <td>
                    <button
                      className="table-source"
                      onClick={() => setView(s.id)}
                    >
                      <FileText size={18} />
                      <span>
                        {s.title}
                        <small>{s.type.toLowerCase()}</small>
                      </span>
                    </button>
                  </td>
                  <td>{s.contributor}</td>
                  <td>{date(s.createdAt)}</td>
                  <td>
                    {w.knowledge.filter((k) => k.sourceId === s.id).length}
                  </td>
                  <td>
                    <button
                      className="icon-button"
                      aria-label={`Read ${s.title}`}
                      onClick={() => setView(s.id)}
                    >
                      <ArrowUpRight size={17} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty
          icon={FileText}
          title="Your first source starts the story."
          description="Add material you have permission to share. It becomes reviewable knowledge, never an automatic publication."
        />
      )}
      {modal && (
        <Modal title="Add source material" close={() => setModal(false)}>
          <Form
            submit="Add source & extract insights"
            onSubmit={async (data) => {
              await mutate({
                type: "add-source",
                capsuleId: capsule.id,
                data: { ...data, text },
              });
              setModal(false);
              setText("");
              setFilename("");
            }}
          >
            <label>
              Source title
              <input
                name="title"
                defaultValue={filename}
                placeholder="e.g. Lessons from a difficult handover"
                required
                maxLength={180}
              />
            </label>
            <label>
              Source type
              <select name="type">
                <option value="NOTE">Note</option>
                <option value="DOCUMENT">Document</option>
                <option value="CASE">Case study</option>
              </select>
            </label>
            <label className="file-picker">
              Choose a text file
              <input
                type="file"
                accept=".txt,.md,text/plain,text/markdown"
                onChange={async (e) => {
                  setError("");
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 5 * 1024 * 1024) {
                    setError("Choose a file smaller than 5 MB.");
                    return;
                  }
                  if (!/\.(txt|md)$/i.test(file.name)) {
                    setError("Choose a .txt or .md file.");
                    return;
                  }
                  setText(await file.text());
                  setFilename(file.name);
                }}
              />
            </label>
            <label>
              Source text
              <textarea
                name="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={7}
                minLength={20}
                required
                placeholder="Paste what you know, including the context and exceptions…"
              />
            </label>
            {error && (
              <div className="error-box" role="alert">
                {error}
              </div>
            )}
            <p className="form-help">
              {demo
                ? "Demo extraction splits your text into sample candidate insights."
                : "The source will be processed into candidate knowledge for your review."}{" "}
              Nothing publishes automatically.
            </p>
          </Form>
          {!demo&&<DocumentUpload capsuleId={capsule.id} onUploaded={()=>queryClient.invalidateQueries({queryKey:['workspace',false]})}/>}
        </Modal>
      )}
      {view && (
        <Modal
          title={sources.find((s) => s.id === view)?.title || "Source"}
          close={() => setView(null)}
        >
          <span className="eyebrow">
            CONTRIBUTED BY {sources.find((s) => s.id === view)?.contributor}
          </span>
          <p className="source-text">
            {sources.find((s) => s.id === view)?.text}
          </p>
        </Modal>
      )}
    </>
  );
}
function Interview({
  capsule,
  mutate,
  demo,
}: {
  capsule: Capsule;
  mutate: Mutate;
  demo: boolean;
}) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [question, setQuestion] = useState(
    "Tell me about a difficult decision in your work. What did you notice first?",
  );
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [interviewId, setInterviewId] = useState("");
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const [uploading, setUploading] = useState(false);
  const [unsent, setUnsent] = useState(0);
  const savedChunks = useRef<Promise<void>[]>([]);
  useEffect(() => {
    if (!demo)
      pendingChunks(capsule.id)
        .then((chunks) => setUnsent(chunks.length))
        .catch(() => {});
  }, [capsule.id, demo]);
  useEffect(() => {
    if (!recording) return;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [recording]);
  useEffect(
    () => () => {
      if (recorder.current?.state === "recording") recorder.current.stop();
      stream.current?.getTracks().forEach((t) => t.stop());
    },
    [],
  );
  async function start() {
    setError("");
    if (demo) {
      setError(
        "Microphone upload requires the connected API. In this demo, type your interview response below to try capture and review.",
      );
      return;
    }
    try {
      if (
        !navigator.mediaDevices?.getUserMedia ||
        typeof MediaRecorder === "undefined"
      )
        throw new Error(
          "This browser does not support audio capture. You can still type your interview below.",
        );
      setSeconds(0);
      const result = await api<{ id: string }>(
        `/capsules/${capsule.id}/interviews`,
        { method: "POST", body: JSON.stringify({}) },
      );
      setInterviewId(result.id);
      stream.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      const r = new MediaRecorder(stream.current);
      recorder.current = r;
      let sequence = 0;
      savedChunks.current = [];
      r.ondataavailable = (e) => {
        if (!e.data.size) return;
        const index = sequence++;
        const save = saveChunk({
          id: `${result.id}:${index}`,
          capsuleId: capsule.id,
          interviewId: result.id,
          sequence: index,
          blob: e.data,
          createdAt: Date.now(),
        });
        savedChunks.current.push(save);
        void save
          .then(() => flushCapture(capsule.id))
          .then(() => pendingChunks(capsule.id))
          .then((chunks) => setUnsent(chunks.length))
          .catch((err) => setError((err as Error).message));
      };
      r.onstop = async () => {
        stream.current?.getTracks().forEach((t) => t.stop());
        setRecording(false);
        setUploading(true);
        try {
          await Promise.all(savedChunks.current);
          await saveChunk({
            id: `${result.id}:complete`,
            capsuleId: capsule.id,
            interviewId: result.id,
            sequence: Number.MAX_SAFE_INTEGER,
            blob: new Blob(),
            createdAt: Date.now(),
            complete: sequence,
          });
          await flushCapture(capsule.id);
          setUnsent((await pendingChunks(capsule.id)).length);
        } catch (err) {
          setError((err as Error).message);
          setUnsent((await pendingChunks(capsule.id)).length);
        } finally {
          setUploading(false);
        }
      };
      r.start(5000);
      setRecording(true);
    } catch (err) {
      stream.current?.getTracks().forEach((t) => t.stop());
      setError((err as Error).message);
    }
  }
  return (
    <div className="interview-layout">
      <section className="surface recorder-panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">CAPTURE STUDIO</span>
            <h2>Let’s talk it through.</h2>
          </div>
          <span className="status status-draft">
            {recording ? "Recording" : "Ready when you are"}
          </span>
        </div>
        <p className="surface-description">
          The things you take for granted are often the things worth capturing.
        </p>
        <div className={`recorder-orb ${recording ? "is-recording" : ""}`}>
          <AudioLines size={65} strokeWidth={1} />
        </div>
        <div className="recording-time">
          {String(Math.floor(seconds / 60)).padStart(2, "0")}:
          {String(seconds % 60).padStart(2, "0")}
        </div>
        <button
          className={`button ${recording ? "button-outline" : "button-dark"}`}
          disabled={uploading}
          onClick={() => (recording ? recorder.current?.stop() : start())}
        >
          {recording ? <Square size={16} /> : <Mic size={17} />}{" "}
          {recording ? "Stop recording" : "Start recording"}
        </button>
        <p className="form-help">
          Audio uploads in small chunks. Unsent audio stays on this device until
          it is uploaded successfully.
        </p>
        {uploading && (
          <p className="form-help" role="status">
            Finishing audio upload…
          </p>
        )}
        {unsent > 0 && (
          <button
            className="button button-outline small"
            disabled={uploading}
            onClick={async () => {
              setUploading(true);
              setError("");
              try {
                await flushCapture(capsule.id);
                setUnsent((await pendingChunks(capsule.id)).length);
              } catch (err) {
                setError((err as Error).message);
              } finally {
                setUploading(false);
              }
            }}
          >
            Retry {unsent} pending audio chunks
          </button>
        )}
        {error && (
          <div role="alert" className="error-box">
            {error}
          </div>
        )}
        <div className="interviewer-card">
          <span className="eyebrow">YOUR NEXT QUESTION</span>
          <p>{question}</p>
          <button
            className="text-button"
            onClick={async () => {
              setError("");
              try {
                if (demo) {
                  const next = [
                    "What changed your mind, and what evidence did you trust?",
                    "When would your usual approach be the wrong one?",
                    "What should someone inexperienced watch out for?",
                  ];
                  setQuestion(
                    next[(seconds + transcript.length) % next.length],
                  );
                } else {
                  if (!interviewId)
                    throw new Error("Start an interview first.");
                  const result = await api<{ question: string }>(
                    `/capsules/${capsule.id}/interviews/${interviewId}/next-question`,
                    { method: "POST", body: JSON.stringify({ transcript }) },
                  );
                  setQuestion(result.question);
                }
              } catch (err) {
                setError((err as Error).message);
              }
            }}
          >
            Ask a follow-up <ArrowRight size={14} />
          </button>
        </div>
      </section>
      <section className="surface transcript-panel">
        <div className="surface-heading">
          <h2>Your interview notes</h2>
          <FileText size={20} />
        </div>
        <p className="surface-description">
          Type an answer or add your own transcript. Include the why, not just
          the steps.
        </p>
        <Form
          submit="Save for knowledge review"
          onSubmit={async () => {
            await mutate({
              type: "add-source",
              capsuleId: capsule.id,
              data: {
                title: `Expert interview · ${date(new Date().toISOString())}`,
                type: "INTERVIEW",
                text: transcript,
              },
            });
            setSaved(true);
          }}
        >
          <label>
            Response
            <textarea
              name="transcript"
              value={transcript}
              onChange={(e) => {
                setTranscript(e.target.value);
                setSaved(false);
              }}
              required
              minLength={20}
              rows={16}
              placeholder="Start with a real situation. What happened? What did you do? What made the difference?"
            />
          </label>
          {saved && (
            <div className="success-box">
              <Check size={16} />
              Saved. Your insights are ready for review.
            </div>
          )}
        </Form>
        <div className="info-card">
          <ShieldCheck size={20} />
          <p>
            Your interview becomes a draft source. Review extracted insights
            before sharing.
          </p>
        </div>
      </section>
    </div>
  );
}
function KnowledgeReview({
  w,
  capsule,
  mutate,
  conflicts = false,
}: {
  w: Workspace;
  capsule: Capsule;
  mutate: Mutate;
  conflicts?: boolean;
}) {
  const [filter, setFilter] = useState("PENDING");
  const [edit, setEdit] = useState<Knowledge | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const items = w.knowledge.filter(
    (k) => k.capsuleId === capsule.id && (!conflicts || k.critical),
  );
  const shown = items.filter((k) => filter === "ALL" || k.status === filter);
  async function act(type: string, id: string) {
    setBusy(id);
    setError("");
    try {
      await mutate({ type, id, capsuleId: capsule.id });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy("");
    }
  }
  return (
    <>
      <div className="section-heading">
        <div>
          <h2>
            {conflicts
              ? "Resolve the contradictions."
              : "Your judgement is the final layer."}
          </h2>
          <p>
            {conflicts
              ? "Critical unresolved conflicts block publication."
              : "Check the meaning, follow the source, and make each insight your own."}
          </p>
        </div>
        <span className="review-count">
          {items.filter((k) => k.status === "PENDING").length} awaiting review
        </span>
      </div>
      <div className="filter-tabs">
        {["PENDING", "APPROVED", "REJECTED", "ALL"].map((f) => (
          <button
            key={f}
            className={filter === f ? "active" : ""}
            onClick={() => setFilter(f)}
          >
            {f === "ALL" ? "All insights" : f.toLowerCase()}{" "}
            <span>
              {items.filter((k) => f === "ALL" || k.status === f).length}
            </span>
          </button>
        ))}
      </div>
      {error && (
        <div className="error-box" role="alert">
          {error}
        </div>
      )}
      <div className="knowledge-list">
        {shown.map((k) => (
          <article key={k.id} className="surface knowledge-item">
            <div className="knowledge-header">
              <span className="knowledge-kind">{k.kind}</span>
              <span>{Math.round(k.confidence * 100)}% AI confidence</span>
              <Status value={k.status} />
            </div>
            <p className="knowledge-text">{k.text}</p>
            {k.proposal !== k.text && (
              <details className="original-proposal">
                <summary>View original AI proposal</summary>
                <p>{k.proposal}</p>
              </details>
            )}
            <div className="knowledge-citation">
              <Quote size={16} />
              <div>
                <strong>
                  {w.sources.find((s) => s.id === k.sourceId)?.title ||
                    "Source unavailable"}
                </strong>
                <span>Contributed by {k.contributor}</span>
              </div>
            </div>
            <div className="knowledge-actions">
              <button className="text-button" onClick={() => setEdit(k)}>
                Edit insight
              </button>
              <div>
                <button
                  disabled={busy === k.id || k.status === "REJECTED"}
                  className="button button-outline small"
                  onClick={() => act("reject", k.id)}
                >
                  <X size={14} />
                  Reject
                </button>
                <button
                  disabled={busy === k.id || k.status === "APPROVED"}
                  className="button button-dark small"
                  onClick={() => act("approve", k.id)}
                >
                  <Check size={15} />
                  Approve
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
      {!shown.length && (
        <Empty
          icon={CheckCircle2}
          title={
            conflicts
              ? "No unresolved conflicts."
              : "You’re all caught up here."
          }
          description={
            conflicts
              ? "Any detected critical contradictions will appear here for review."
              : "Try another status, or add a source to capture more knowledge."
          }
        />
      )}{" "}
      {edit && (
        <Modal title="Refine this insight" close={() => setEdit(null)}>
          <Form
            submit="Save correction"
            onSubmit={async (data) => {
              await mutate({
                type: "edit",
                id: edit.id,
                capsuleId: capsule.id,
                data,
              });
              setEdit(null);
            }}
          >
            <label>
              Expert correction
              <textarea
                name="text"
                defaultValue={edit.text}
                rows={7}
                minLength={10}
                required
              />
            </label>
            <p className="form-help">
              The original proposal is kept for attribution and evaluation.
              Review the edited insight before approving it.
            </p>
          </Form>
        </Modal>
      )}
    </>
  );
}
function Evaluations({
  w,
  capsule,
  mutate,
  demo,
}: {
  w: Workspace;
  capsule: Capsule;
  mutate: Mutate;
  demo: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const evaluation = w.evaluations.find((e) => e.capsuleId === capsule.id);
  return (
    <>
      <div className="section-heading">
        <div>
          <h2>Does it answer like your knowledge?</h2>
          <p>
            Check grounding, required details, and when the capsule should say
            “I don’t know.”
          </p>
        </div>
        <button
          className="button button-dark small"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              await mutate({ type: "evaluate", capsuleId: capsule.id });
            } catch (err) {
              setError((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? (
            <LoaderCircle size={16} className="spin" />
          ) : (
            <FlaskConical size={16} />
          )}
          Run evaluation
        </button>
      </div>
      {!demo&&<GoldenCases capsuleId={capsule.id}/>}
      {demo && (
        <div className="info-card">
          <FlaskConical size={20} />
          <p>
            Demo results illustrate the evaluation workflow. They are not
            evidence of AI quality or production readiness.
          </p>
        </div>
      )}
      {error && (
        <div className="error-box" role="alert">
          {error}
        </div>
      )}
      {evaluation ? (
        <>
          <div className="evaluation-result">
            <ShieldCheck size={22} />
            <div>
              <strong>
                {evaluation.passed
                  ? "Publication checks passed"
                  : "Some checks need attention"}
              </strong>
              <p>
                Last run {date(evaluation.createdAt)}
                {demo ? " · Simulated evaluation" : ""}
              </p>
            </div>
            <Status value={evaluation.passed ? "APPROVED" : "PENDING"} />
          </div>
          <div className="stat-grid eval-stats">
            {evaluation.metrics.map((m) => (
              <div className="stat-card" key={m.name}>
                <div>
                  <span>{m.name}</span>
                  <Check size={16} />
                </div>
                <strong>
                  {m.score}
                  <em>%</em>
                </strong>
                <div className="metric-bar">
                  <span style={{ width: `${m.score}%` }} />
                </div>
                <small>Required threshold: {m.threshold}%</small>
              </div>
            ))}
          </div>
          <section className="surface">
            <div className="surface-heading">
              <h2>Evaluation cases</h2>
              <span>{evaluation.cases.length} checks</span>
            </div>
            {evaluation.cases.map((c, i) => (
              <div className="eval-case" key={i}>
                <span className="eval-case-icon">
                  <Check size={15} />
                </span>
                <div>
                  <strong>{c.question}</strong>
                  <p>{c.expected}</p>
                </div>
                <Status value={c.passed ? "APPROVED" : "PENDING"} />
              </div>
            ))}
          </section>
        </>
      ) : (
        <Empty
          icon={FlaskConical}
          title="Good answers deserve a proper test."
          description="Approve your source-grounded knowledge, then run an evaluation. Passing checks are required before publication."
        />
      )}
    </>
  );
}
function Publish({
  w,
  capsule,
  mutate,
  demo,
}: {
  w: Workspace;
  capsule: Capsule;
  mutate: Mutate;
  demo: boolean;
}) {
  const [confirm, setConfirm] = useState(false);
  const passed = w.evaluations.some(
    (e) => e.capsuleId === capsule.id && e.passed,
  );
  const approved = w.knowledge.filter(
    (k) => k.capsuleId === capsule.id && k.status === "APPROVED",
  ).length;
  const conflict = w.knowledge.some(
    (k) => k.capsuleId === capsule.id && k.status === "PENDING" && k.critical,
  );
  return (
    <div className="detail-grid">
      <section className="surface">
        <span className="eyebrow">A VERSION YOU CAN STAND BEHIND</span>
        <h2 className="surface-large-title">
          Ready to put your
          <br />
          knowledge to work?
        </h2>
        <p className="surface-description">
          Publishing creates an immutable snapshot. Future corrections become a
          new version, so the history stays clear.
        </p>
        <div className="publish-checks">
          {[
            { label: `${approved} expert-approved insights`, ok: approved > 0 },
            { label: "Evaluation thresholds met", ok: passed },
            { label: "No unresolved critical conflicts", ok: !conflict },
          ].map((c) => (
            <div key={c.label} className={c.ok ? "check-pass" : "check-wait"}>
              {c.ok ? <CheckCircle2 size={20} /> : <Clock size={20} />}
              <span>{c.label}</span>
            </div>
          ))}
        </div>
        <button
          className="button button-dark"
          disabled={!passed || !approved || conflict}
          onClick={() => setConfirm(true)}
        >
          Publish {demo ? "demo " : ""}version <ArrowUpRight size={17} />
        </button>
        <p className="form-help">
          {demo
            ? "Demo publication is local and does not anchor a proof on Stellar."
            : "Only approved knowledge is included. Private sources remain off-chain."}
        </p>
      </section>
      <section className="surface">
        <div className="surface-heading">
          <h2>Version history</h2>
          <Layers size={18} />
        </div>
        {capsule.versions.length ? (
          capsule.versions.toReversed().map((v) => (
            <div className="version-entry" key={v.version}>
              <div>
                <strong>v{v.version}</strong>
                <Status value="PUBLISHED" />
              </div>
              <p>
                {date(v.publishedAt)} · {v.knowledge.length} approved insights
              </p>
              <code title={v.manifestHash}>{v.manifestHash}</code>
              <small>
                {demo ? "Local demo record · not anchored" : "Manifest hash"}
              </small>
            </div>
          ))
        ) : (
          <p className="surface-description">
            Your first published version will appear here.
          </p>
        )}
      </section>
      {confirm && (
        <Modal title="Publish this version?" close={() => setConfirm(false)}>
          <p className="form-intro">
            This captures {approved} approved insights in a fixed version.
            Pending and rejected insights are excluded. You can still refine the
            next version.
          </p>
          <Form
            submit="Publish version"
            onSubmit={async () => {
              await mutate({ type: "publish", capsuleId: capsule.id });
              setConfirm(false);
            }}
          >
            <label className="checkbox-label">
              <input type="checkbox" required />
              <span>
                I have reviewed the knowledge and have the rights to share it.
              </span>
            </label>
          </Form>
        </Modal>
      )}
    </div>
  );
}
function Licenses({ w, mutate }: { w: Workspace; mutate: Mutate }) {
  const [modal, setModal] = useState(false);
  const [revoke, setRevoke] = useState<string | null>(null);
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">SHARED ON YOUR TERMS</span>
          <h1>Access, with intention.</h1>
          <p>
            Choose who can use your knowledge—and draw a clear line around how.
          </p>
        </div>
        <button className="button button-dark" onClick={() => setModal(true)}>
          <Plus size={16} />
          Grant access
        </button>
      </div>
      <div className="stat-grid three-stats">
        <Stat
          label="Active grants"
          value={
            w.licenses.filter(
              (l) =>
                l.status === "ACTIVE" && new Date(l.expiresAt) > new Date(),
            ).length
          }
          detail="People with current permissions"
          icon={ShieldCheck}
        />
        <Stat
          label="Training permissions"
          value={w.licenses.filter((l) => l.aiTrainingAllowed).length}
          detail="Always an explicit, separate choice"
          icon={Layers}
        />
        <Stat
          label="Revoked grants"
          value={w.licenses.filter((l) => l.status === "REVOKED").length}
          detail="Future queries are blocked"
          icon={LockKeyhole}
        />
      </div>
      <div className="license-list">
        {w.licenses.map((l) => (
          <article className="surface license-card" key={l.id}>
            <div className="surface-heading">
              <div>
                <span className="eyebrow">
                  {w.capsules.find((c) => c.id === l.capsuleId)?.title}
                </span>
                <h2>{l.name}</h2>
              </div>
              <Status
                value={
                  l.status === "ACTIVE" && new Date(l.expiresAt) < new Date()
                    ? "EXPIRED"
                    : l.status
                }
              />
            </div>
            <div className="license-details">
              <div>
                <span>Granted to</span>
                <strong>{l.grantee}</strong>
              </div>
              <div>
                <span>Allowed purposes</span>
                <strong>{l.purposes.join(", ")}</strong>
              </div>
              <div>
                <span>Usage</span>
                <strong>
                  {l.used} / {l.usageLimit} queries
                </strong>
              </div>
              <div>
                <span>Expires</span>
                <strong>{date(l.expiresAt)}</strong>
              </div>
            </div>
            <div className="license-bottom">
              <div>
                <span
                  className={
                    l.aiTrainingAllowed
                      ? "permission-chip permitted"
                      : "permission-chip"
                  }
                >
                  AI training: {l.aiTrainingAllowed ? "allowed" : "not allowed"}
                </span>
                <span className="permission-chip">
                  Commercial use: {l.commercialUse ? "allowed" : "not allowed"}
                </span>
              </div>
              <button
                className="text-button danger-text"
                disabled={l.status === "REVOKED"}
                onClick={() => setRevoke(l.id)}
              >
                Revoke access
              </button>
            </div>
          </article>
        ))}
      </div>
      {!w.licenses.length && (
        <Empty
          icon={ShieldCheck}
          title="Good knowledge. Clear permissions."
          description="Create your first access grant for a published capsule."
        />
      )}
      {modal && (
        <Modal title="Grant capsule access" close={() => setModal(false)}>
          <Form
            submit="Grant access"
            onSubmit={async (data) => {
              await mutate({
                type: "grant",
                capsuleId: String(data.capsuleId),
                data,
              });
              setModal(false);
            }}
          >
            <label>
              Capsule
              <select name="capsuleId" required>
                <option value="">Select a published capsule</option>
                {w.capsules
                  .filter((c) => c.status === "PUBLISHED")
                  .map((c) => (
                    <option value={c.id} key={c.id}>
                      {c.title}
                    </option>
                  ))}
              </select>
            </label>
            <div className="form-row">
              <label>
                License name
                <input name="name" defaultValue="Team learning" required />
              </label>
              <label>
                Audience
                <input name="audience" defaultValue="Team members" required />
              </label>
            </div>
            <label>
              Recipient email
              <input
                name="grantee"
                type="email"
                required
                placeholder="teammate@company.com"
              />
            </label>
            <label>
              Allowed purposes
              <input
                name="purposes"
                defaultValue="learning, internal-operations"
                required
              />
              <small>Separate purposes with commas.</small>
            </label>
            <div className="form-row">
              <label>
                Access duration (days)
                <input
                  name="days"
                  type="number"
                  defaultValue={90}
                  min={1}
                  max={3650}
                  required
                />
              </label>
              <label>
                Query limit
                <input
                  name="usageLimit"
                  type="number"
                  defaultValue={100}
                  min={1}
                  max={1000000}
                  required
                />
              </label>
            </div>
            <div className="permission-options">
              <label className="checkbox-label">
                <input name="commercialUse" type="checkbox" />
                Allow commercial use
              </label>
              <label className="checkbox-label">
                <input name="derivativeUse" type="checkbox" />
                Allow derivative use
              </label>
              <label className="checkbox-label">
                <input name="aiTrainingAllowed" type="checkbox" />
                <span>
                  Allow use for AI model training
                  <small>
                    Separate permission. Off unless you explicitly enable it.
                  </small>
                </span>
              </label>
            </div>
          </Form>
        </Modal>
      )}
      {revoke && (
        <Modal title="Revoke future access?" close={() => setRevoke(null)}>
          <p className="form-intro">
            This recipient will no longer be able to submit new queries under
            this grant. Existing usage records remain.
          </p>
          <Form
            submit="Revoke access"
            onSubmit={async () => {
              await mutate({ type: "revoke", id: revoke });
              setRevoke(null);
            }}
          >
            <p className="form-help">
              Grant a new license if you want to restore access later.
            </p>
          </Form>
        </Modal>
      )}
    </>
  );
}
function Usage({ w }: { w: Workspace }) {
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">WHERE YOUR KNOWLEDGE GOES</span>
          <h1>Useful, and accounted for.</h1>
          <p>Follow capsule activity and the permissions behind every query.</p>
        </div>
      </div>
      <div className="stat-grid three-stats">
        <Stat
          label="Total queries"
          value={w.usage.length}
          detail="Recorded under licensed access"
          icon={Quote}
        />
        <Stat
          label="Capsules queried"
          value={new Set(w.usage.map((u) => u.capsuleId)).size}
          detail="Approved knowledge in use"
          icon={Layers}
        />
        <Stat
          label="Usage units"
          value={w.usage.reduce((sum, u) => sum + u.units, 0)}
          detail="Available for settlement policies"
          icon={ChartNoAxesCombined}
        />
      </div>
      <section className="surface">
        <div className="surface-heading">
          <h2>Recent activity</h2>
          <span>{w.usage.length} events</span>
        </div>
        {w.usage.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Capsule</th>
                  <th>Purpose</th>
                  <th>Units</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {w.usage.map((u) => (
                  <tr key={u.id}>
                    <td>
                      {w.capsules.find((c) => c.id === u.capsuleId)?.title}
                    </td>
                    <td>{u.purpose}</td>
                    <td>{u.units}</td>
                    <td>{date(u.occurredAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            icon={ChartNoAxesCombined}
            title="The next question starts the story."
            description="Licensed capsule activity appears here as people start asking questions."
          />
        )}
      </section>
      <div className="surface settlement-surface">
        <div>
          <span className="eyebrow">SETTLEMENTS</span>
          <h2>No payments to show yet.</h2>
          <p>
            Usage-based compensation requires a configured payment asset and
            settlement policy. No payment is implied by a query count.
          </p>
        </div>
        <ShieldCheck size={35} strokeWidth={1} />
      </div>
    </>
  );
}
function Profile({ w, mutate }: { w: Workspace; mutate: Mutate }) {
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">THE HUMAN BEHIND THE KNOWLEDGE</span>
          <h1>Your expert profile.</h1>
          <p>Give your contributions a name, a context, and a point of view.</p>
        </div>
      </div>
      <div className="detail-grid">
        <section className="surface">
          <Form
            onSubmit={async (data) => {
              await mutate({ type: "profile", data });
            }}
          >
            <label>
              Public name
              <input
                name="name"
                defaultValue={w.profile.name}
                required
                minLength={2}
                maxLength={120}
              />
            </label>
            <label>
              Area of expertise
              <input
                name="domain"
                defaultValue={w.profile.domain}
                required
                maxLength={120}
              />
            </label>
            <label>
              About you
              <textarea
                name="bio"
                defaultValue={w.profile.bio}
                rows={6}
                maxLength={2000}
                placeholder="What have you learned, and where has your work taken you?"
              />
            </label>
            <label>
              Email
              <input value={w.profile.email} readOnly />
              <small>Your account email is managed separately.</small>
            </label>
          </Form>
        </section>
        <section className="surface profile-preview">
          <span className="profile-avatar">
            {w.profile.name
              .split(" ")
              .map((s) => s[0])
              .join("")
              .slice(0, 2)}
          </span>
          <h2>{w.profile.name}</h2>
          <span className="eyebrow">{w.profile.domain}</span>
          <p>{w.profile.bio}</p>
          <span className="status status-pending">
            Credentials not verified
          </span>
          <p className="form-help">
            Attribution identifies the contributor. Verification is a separate
            review.
          </p>
        </section>
      </div>
    </>
  );
}
export function Ask({
  w,
  capsule,
  demo,
  onChange,
}: {
  w: Workspace;
  capsule: Capsule;
  demo: boolean;
  onChange: (w: Workspace) => void;
}) {
  const [text, setText] = useState("");
  const [purpose, setPurpose] = useState("learning");
  const [version, setVersion] = useState(capsule.version || "");
  const [messages, setMessages] = useState<
    { question: string; answer: Answer }[]
  >([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [citation, setCitation] = useState<Answer["citations"][0] | null>(null);
  const [conversationId, setConversationId] = useState("");
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottom.current?.scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "nearest",
    });
  }, [messages]);
  async function send(question: string) {
    if (!question.trim()) return;
    setBusy(true);
    setError("");
    try {
      let answer: Answer;
      if (demo) {
        const result = askDemo(
          loadDemo(),
          capsule.id,
          question,
          purpose,
          version,
        );
        onChange(result.workspace);
        answer = result.answer;
      } else {
        let id = conversationId;
        if (!id) {
          const conversation = await api<{ id: string }>(
            `/capsules/${capsule.id}/conversations`,
            { method: "POST", body: JSON.stringify({ version, purpose }) },
          );
          id = conversation.id;
          setConversationId(id);
        }
        answer = await api<Answer>(
          `/capsules/${capsule.id}/conversations/${id}/messages`,
          {
            method: "POST",
            body: JSON.stringify({
              query: question,
              purpose,
              version,
              idempotencyKey: crypto.randomUUID(),
            }),
          },
        );
      }
      setMessages((m) => [...m, { question, answer }]);
      setText("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const grant = w.licenses.find(
    (l) =>
      l.capsuleId === capsule.id &&
      l.grantee === w.profile.email &&
      l.status === "ACTIVE",
  );
  return (
    <div className="ask-layout">
      <section className="ask-main">
        <div className="ask-heading">
          <div>
            <span className="eyebrow">ASK A CAPSULE</span>
            <h1>{capsule.title}</h1>
          </div>
          <select
            aria-label="Published version"
            value={version}
            onChange={(e) => {
              setVersion(e.target.value);
              setConversationId("");
            }}
          >
            {capsule.versions.map((v) => (
              <option key={v.version} value={v.version}>
                v{v.version}
              </option>
            ))}
          </select>
        </div>
        <div className="conversation">
          {!messages.length ? (
            <div className="ask-welcome">
              <span className="ask-symbol">✳</span>
              <h2>
                Good questions.
                <br />
                <span className="serif">Experienced answers.</span>
              </h2>
              <p>
                Ask a practical question. The capsule answers from approved
                knowledge and shows you where it came from.
              </p>
              <div className="suggestion-grid">
                {[
                  "How should I troubleshoot a recurring fault?",
                  "What should I check before replacing a component?",
                  "When should I stop troubleshooting?",
                ].map((q) => (
                  <button key={q} disabled={busy} onClick={() => send(q)}>
                    {q}
                    <ArrowUpRight size={15} />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <div className="conversation-turn" key={i}>
                <div className="question-bubble">{m.question}</div>
                <div className="response-block">
                  <span className="mini-logo">✳</span>
                  <div>
                    <span className="response-label">
                      SYNAPSE · APPROVED CAPSULE KNOWLEDGE
                    </span>
                    <p>{m.answer.text}</p>
                    {m.answer.citations.length > 0 && (
                      <div className="answer-citations">
                        {m.answer.citations.map((c, j) => (
                          <button
                            key={`${c.id}-${j}`}
                            onClick={() => setCitation(c)}
                          >
                            <FileText size={13} />
                            <span>
                              [{j + 1}] {c.source}
                            </span>
                            <ExternalLink size={12} />
                          </button>
                        ))}
                      </div>
                    )}
                    <small>
                      {m.answer.abstained
                        ? "No supported answer"
                        : "Grounded answer"}{" "}
                      · v{m.answer.version}
                      {demo ? " · Demo lexical retrieval" : ""}
                    </small>
                  </div>
                </div>
              </div>
            ))
          )}
          {busy && (
            <div className="answer-loading">
              <LoaderCircle size={17} className="spin" />
              Looking through approved knowledge…
            </div>
          )}
          <div ref={bottom} />
        </div>
        <form
          className="ask-composer"
          onSubmit={(e) => {
            e.preventDefault();
            send(text);
          }}
        >
          {error && (
            <div className="error-box" role="alert">
              {error}
            </div>
          )}
          <div className="composer-input">
            <textarea
              aria-label="Your question"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (!busy) send(text);
                }
              }}
              rows={2}
              placeholder="What would you like to understand?"
              maxLength={4000}
              required
            />
            <button aria-label="Send question" disabled={busy || !text.trim()}>
              <Send size={19} />
            </button>
          </div>
          <div className="composer-note">
            <ShieldCheck size={12} /> Answers come from approved knowledge. Gaps
            are acknowledged.
          </div>
        </form>
      </section>
      <aside className="ask-context">
        <span className="eyebrow">KNOW YOUR SOURCE</span>
        <span className="avatar">
          {w.profile.name
            .split(" ")
            .map((s) => s[0])
            .join("")
            .slice(0, 2)}
        </span>
        <h3>{w.profile.name}</h3>
        <p>{capsule.scope}</p>
        <div className="context-divider" />
        <label>
          Query purpose
          <select
            value={purpose}
            onChange={(e) => {
              setPurpose(e.target.value);
              setConversationId("");
            }}
          >
            {(grant?.purposes || ["learning"]).map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <dl>
          <div>
            <dt>Access</dt>
            <dd>{grant ? "Licensed" : "No active grant"}</dd>
          </div>
          <div>
            <dt>Queries used</dt>
            <dd>{grant ? `${grant.used} / ${grant.usageLimit}` : "—"}</dd>
          </div>
          <div>
            <dt>AI training</dt>
            <dd>{grant?.aiTrainingAllowed ? "Permitted" : "Not permitted"}</dd>
          </div>
        </dl>
        <div className="info-card">
          <Quote size={18} />
          <p>
            This is an AI interface to approved expertise. The human expert is
            not speaking live.
          </p>
        </div>
      </aside>
      {citation && (
        <Modal title="Follow the source" close={() => setCitation(null)}>
          <span className="eyebrow">{citation.source}</span>
          <blockquote className="citation-quote">{citation.quote}</blockquote>
          <div className="citation-contributor">
            <ShieldCheck size={18} />
            Contributed by {citation.contributor}
          </div>
        </Modal>
      )}
    </div>
  );
}
