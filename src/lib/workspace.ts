import { z } from "zod";
export type KnowledgeKind =
  | "CLAIM"
  | "PROCEDURE"
  | "HEURISTIC"
  | "EXCEPTION"
  | "CASE";
export type Knowledge = {
  id: string;
  capsuleId: string;
  kind: KnowledgeKind;
  text: string;
  proposal: string;
  sourceId: string;
  contributor: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  confidence: number;
  critical?: boolean;
};
export type Source = {
  id: string;
  capsuleId: string;
  title: string;
  type: string;
  text: string;
  contributor: string;
  createdAt: string;
};
export type Capsule = {
  id: string;
  title: string;
  domain: string;
  scope: string;
  description: string;
  visibility: "PRIVATE" | "PUBLIC";
  status: "DRAFT" | "REVIEW" | "PUBLISHED" | "ARCHIVED";
  updatedAt: string;
  version?: string;
  versions: {
    version: string;
    publishedAt: string;
    knowledge: Knowledge[];
    manifestHash: string;
  }[];
};
export type License = {
  id: string;
  capsuleId: string;
  name: string;
  grantee: string;
  audience: string;
  purposes: string[];
  aiTrainingAllowed: boolean;
  commercialUse: boolean;
  derivativeUse: boolean;
  usageLimit: number;
  used: number;
  startsAt: string;
  expiresAt: string;
  status: "ACTIVE" | "REVOKED";
};
export type Evaluation = {
  capsuleId: string;
  createdAt: string;
  passed: boolean;
  metrics: { name: string; score: number; threshold: number }[];
  cases: { question: string; expected: string; passed: boolean }[];
};
export type Usage = {
  id: string;
  capsuleId: string;
  licenseId: string;
  purpose: string;
  occurredAt: string;
  units: number;
};
export type Workspace = {
  profile: { name: string; email: string; bio: string; domain: string };
  capsules: Capsule[];
  sources: Source[];
  knowledge: Knowledge[];
  licenses: License[];
  evaluations: Evaluation[];
  usage: Usage[];
};
export type Answer = {
  text: string;
  abstained: boolean;
  citations: {
    id: string;
    source: string;
    quote: string;
    contributor: string;
  }[];
  version: string;
};
export const capsuleSchema = z.object({
  title: z.string().trim().min(3).max(120),
  domain: z.string().trim().min(2).max(80),
  scope: z.string().trim().min(15).max(2000),
  visibility: z.enum(["PRIVATE", "PUBLIC"]),
});
export const authSchema = z.object({
  email: z.email(),
  password: z.string().min(12, "Use at least 12 characters."),
  name: z.string().min(2).optional(),
});
export const apiBase =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000/v1";
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${apiBase}${path}`, {
      ...options,
      credentials: "include",
      headers: { "Content-Type": "application/json", ...options.headers },
      signal: options.signal || AbortSignal.timeout(15000),
    });
  } catch {
    throw new ApiError(
      0,
      "Synapse could not reach the service. Please try again when the API is running.",
    );
  }
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new ApiError(
      response.status,
      typeof data.message === "string"
        ? data.message
        : "The request could not be completed.",
    );
  }
  return response.status === 204 ? (undefined as T) : response.json();
}
export type Action = {
  type: string;
  capsuleId?: string;
  id?: string;
  data?: Record<string, unknown>;
};
const storageKey = "synapse-explicit-demo-v1";
const now = () => new Date().toISOString();
export function seedWorkspace(): Workspace {
  const capsuleId = "field-notes";
  const sourceId = "source-1";
  const approved: Knowledge[] = [
    {
      id: "k1",
      capsuleId,
      kind: "HEURISTIC",
      text: "Before replacing a component, check what changed in the operating conditions immediately before the fault appeared.",
      proposal:
        "Before replacing a component, check what changed in the operating conditions immediately before the fault appeared.",
      sourceId,
      contributor: "Alex Jordan",
      status: "APPROVED",
      confidence: 0.97,
    },
    {
      id: "k2",
      capsuleId,
      kind: "PROCEDURE",
      text: "For a recurring equipment fault, document the symptom, compare recent operating changes, isolate one variable at a time, and record the result before the next intervention.",
      proposal:
        "For a recurring equipment fault, document the symptom, compare recent operating changes, isolate one variable at a time, and record the result before the next intervention.",
      sourceId,
      contributor: "Alex Jordan",
      status: "APPROVED",
      confidence: 0.96,
    },
    {
      id: "k3",
      capsuleId,
      kind: "EXCEPTION",
      text: "If a fault presents an immediate safety risk, stop the equipment and follow the approved site isolation procedure before troubleshooting.",
      proposal:
        "If a fault presents an immediate safety risk, stop the equipment and follow the approved site isolation procedure before troubleshooting.",
      sourceId,
      contributor: "Alex Jordan",
      status: "APPROVED",
      confidence: 0.99,
    },
  ];
  return {
    profile: {
      name: "Alex Jordan",
      email: "alex@example.test",
      bio: "A fictional operations specialist sharing lessons from the field.",
      domain: "Operations & engineering",
    },
    capsules: [
      {
        id: capsuleId,
        title: "The field engineer’s playbook",
        domain: "Operations & engineering",
        scope:
          "Troubleshooting recurring equipment faults and documenting practical decisions.",
        description:
          "The judgement calls, diagnostic routines, and exceptions behind better troubleshooting.",
        visibility: "PUBLIC",
        status: "PUBLISHED",
        updatedAt: now(),
        version: "1.0.0",
        versions: [
          {
            version: "1.0.0",
            publishedAt: now(),
            knowledge: structuredClone(approved),
            manifestHash: "demo-manifest-not-anchored",
          },
        ],
      },
      {
        id: "handover",
        title: "A better handover",
        domain: "Team leadership",
        scope:
          "Helping new team members understand decisions, responsibilities, and undocumented processes.",
        description:
          "Turn the things your team just knows into a handover people can actually use.",
        visibility: "PRIVATE",
        status: "DRAFT",
        updatedAt: now(),
        versions: [],
      },
    ],
    sources: [
      {
        id: sourceId,
        capsuleId,
        title: "Field experience · Interview 01",
        type: "INTERVIEW",
        text: approved.map((k) => k.text).join("\n"),
        contributor: "Alex Jordan",
        createdAt: now(),
      },
    ],
    knowledge: [
      ...approved,
      {
        id: "k4",
        capsuleId,
        kind: "CASE",
        text: "Keeping a shift log helped a fictional team identify that a recurring fault began after a scheduling change.",
        proposal:
          "Keeping a shift log helped a fictional team identify that a recurring fault began after a scheduling change.",
        sourceId,
        contributor: "Alex Jordan",
        status: "PENDING",
        confidence: 0.89,
      },
    ],
    licenses: [
      {
        id: "license-1",
        capsuleId,
        name: "Team learning",
        grantee: "alex@example.test",
        audience: "Team members",
        purposes: ["learning", "internal-operations"],
        aiTrainingAllowed: false,
        commercialUse: false,
        derivativeUse: false,
        usageLimit: 100,
        used: 0,
        startsAt: now(),
        expiresAt: new Date(Date.now() + 90 * 86400000).toISOString(),
        status: "ACTIVE",
      },
    ],
    evaluations: [],
    usage: [],
  };
}
export function loadDemo(): Workspace {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) return JSON.parse(raw);
  } catch {}
  return seedWorkspace();
}
export function resetDemo() {
  localStorage.removeItem(storageKey);
}
export function persistDemo(workspace: Workspace) {
  localStorage.setItem(storageKey, JSON.stringify(workspace));
}
export function applyDemoAction(
  workspace: Workspace,
  action: Action,
): Workspace {
  const w = structuredClone(workspace);
  const d = action.data || {};
  const capsule = w.capsules.find((c) => c.id === action.capsuleId);
  if (action.type === "create-capsule") {
    const value = capsuleSchema.parse(d);
    w.capsules.unshift({
      ...value,
      id: crypto.randomUUID(),
      description: value.scope,
      status: "DRAFT",
      updatedAt: now(),
      versions: [],
    });
  } else if (action.type === "profile") {
    w.profile = { ...w.profile, ...d };
  } else if (action.type === "add-source" && capsule) {
    const text = String(d.text || "").trim();
    if (text.length < 20)
      throw new Error("Add at least 20 characters of source text.");
    const source: Source = {
      id: crypto.randomUUID(),
      capsuleId: capsule.id,
      title: String(d.title || "Untitled source"),
      type: String(d.type || "NOTE"),
      text,
      contributor: w.profile.name,
      createdAt: now(),
    };
    w.sources.unshift(source);
    const sentences = text
      .split(/(?<=[.!?])\s+|\n/)
      .filter((s) => s.trim().length > 20)
      .slice(0, 20);
    for (const sentence of sentences)
      w.knowledge.push({
        id: crypto.randomUUID(),
        capsuleId: capsule.id,
        kind: "CLAIM",
        text: sentence,
        proposal: sentence,
        sourceId: source.id,
        contributor: w.profile.name,
        status: "PENDING",
        confidence: 0.8,
      });
    capsule.updatedAt = now();
  } else if (["approve", "reject", "edit"].includes(action.type)) {
    const item = w.knowledge.find(
      (k) => k.id === action.id && k.capsuleId === action.capsuleId,
    );
    if (!item) throw new Error("Knowledge item not found.");
    if (action.type === "edit") {
      item.text = z.string().trim().min(10).max(5000).parse(d.text);
      item.status = "PENDING";
    } else item.status = action.type === "approve" ? "APPROVED" : "REJECTED";
    w.evaluations = w.evaluations.filter(
      (e) => e.capsuleId !== action.capsuleId,
    );
  } else if (action.type === "evaluate" && capsule) {
    const items = w.knowledge.filter(
      (k) => k.capsuleId === capsule.id && k.status === "APPROVED",
    );
    if (!items.length)
      throw new Error("Approve some knowledge before running an evaluation.");
    const valid = items.every((k) =>
      w.sources.some((s) => s.id === k.sourceId),
    );
    w.evaluations = w.evaluations.filter((e) => e.capsuleId !== capsule.id);
    w.evaluations.push({
      capsuleId: capsule.id,
      createdAt: now(),
      passed: valid,
      metrics: [
        {
          name: "Citation target validity",
          score: valid ? 100 : 0,
          threshold: 95,
        },
        { name: "Required-element coverage", score: 100, threshold: 90 },
        { name: "Unsupported-question abstention", score: 100, threshold: 100 },
        {
          name: "No fabricated citations",
          score: valid ? 100 : 0,
          threshold: 100,
        },
      ],
      cases: items
        .slice(0, 4)
        .map((k) => ({
          question: `What does the capsule say about ${k.text.split(" ").slice(0, 7).join(" ")}…?`,
          expected: k.text,
          passed: valid,
        }))
        .concat([
          {
            question: "What will the stock market do tomorrow?",
            expected: "Abstain: no supporting capsule knowledge.",
            passed: true,
          },
        ]),
    });
  } else if (action.type === "publish" && capsule) {
    if (!w.evaluations.find((e) => e.capsuleId === capsule.id && e.passed))
      throw new Error("A passing evaluation is required.");
    if (
      w.knowledge.some(
        (k) =>
          k.capsuleId === capsule.id && k.critical && k.status === "PENDING",
      )
    )
      throw new Error("Resolve critical conflicts first.");
    const version = `1.${capsule.versions.length}.0`;
    capsule.versions.push({
      version,
      publishedAt: now(),
      knowledge: structuredClone(
        w.knowledge.filter(
          (k) => k.capsuleId === capsule.id && k.status === "APPROVED",
        ),
      ),
      manifestHash: `demo-${crypto.randomUUID()}`,
    });
    capsule.version = version;
    capsule.status = "PUBLISHED";
    capsule.updatedAt = now();
  } else if (action.type === "grant" && capsule) {
    const email = z.email().parse(d.grantee);
    const limit = z.coerce
      .number()
      .int()
      .min(1)
      .max(1000000)
      .parse(d.usageLimit);
    const days = z.coerce.number().int().min(1).max(3650).parse(d.days);
    const purposes = String(d.purposes || "learning")
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    w.licenses.unshift({
      id: crypto.randomUUID(),
      capsuleId: capsule.id,
      name: String(d.name || "Custom license"),
      grantee: email,
      audience: String(d.audience || "Named user"),
      purposes,
      aiTrainingAllowed: d.aiTrainingAllowed === true,
      commercialUse: d.commercialUse === true,
      derivativeUse: d.derivativeUse === true,
      usageLimit: limit,
      used: 0,
      startsAt: now(),
      expiresAt: new Date(Date.now() + days * 86400000).toISOString(),
      status: "ACTIVE",
    });
  } else if (action.type === "revoke") {
    const license = w.licenses.find((l) => l.id === action.id);
    if (license) license.status = "REVOKED";
  } else throw new Error("This action is unavailable in the preview.");
  return w;
}
export function askDemo(
  w: Workspace,
  capsuleId: string,
  query: string,
  purpose: string,
  version?: string,
): { workspace: Workspace; answer: Answer } {
  const license = w.licenses.find(
    (l) =>
      l.capsuleId === capsuleId &&
      l.grantee === w.profile.email &&
      l.status === "ACTIVE" &&
      new Date(l.startsAt) <= new Date() &&
      new Date(l.expiresAt) > new Date() &&
      l.used < l.usageLimit &&
      l.purposes.includes(purpose),
  );
  if (!license)
    throw new Error(
      "An active license for this purpose is required. It may have expired, been revoked, or reached its usage limit.",
    );
  const capsule = w.capsules.find((c) => c.id === capsuleId);
  const published = capsule?.versions.find(
    (v) => v.version === (version || capsule.version),
  );
  if (!published) throw new Error("This capsule has no published version.");
  const stop = new Set([
    "what",
    "does",
    "this",
    "that",
    "with",
    "have",
    "from",
    "your",
    "would",
    "should",
    "about",
    "when",
    "where",
    "which",
    "there",
    "their",
  ]);
  const words =
    query
      .toLowerCase()
      .match(/[a-z]{4,}/g)
      ?.filter((s) => !stop.has(s)) || [];
  const matches = published.knowledge
    .map((k) => ({
      k,
      score: words.filter((word) => k.text.toLowerCase().includes(word)).length,
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((x) => x.k);
  const next = structuredClone(w);
  next.licenses.find((l) => l.id === license.id)!.used++;
  next.usage.unshift({
    id: crypto.randomUUID(),
    capsuleId,
    licenseId: license.id,
    purpose,
    occurredAt: now(),
    units: 1,
  });
  return {
    workspace: next,
    answer: {
      text: matches.length
        ? `The capsule’s approved knowledge indicates:\n\n${matches.map((k, i) => `${k.text} [${i + 1}]`).join("\n\n")}`
        : "This capsule does not contain approved knowledge that supports an answer to this question. Try a question within its stated scope.",
      abstained: !matches.length,
      version: published.version,
      citations: matches.map((k) => ({
        id: k.sourceId,
        source: w.sources.find((s) => s.id === k.sourceId)?.title || "Source",
        quote: k.text,
        contributor: k.contributor,
      })),
    },
  };
}
