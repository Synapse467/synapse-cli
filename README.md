# Synapse web

Next.js 16.3 / React 19.3 frontend for Synapse. The authoritative product requirements are in `../SYNAPSE_MASTER_BUILD.md`.

## Run

Node 24 and pnpm 10 are required.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://localhost:3000` for the landing page, `/demo` for the explicitly labelled interactive preview, and `/studio` for the connected workspace.

Set `NEXT_PUBLIC_API_BASE_URL` using `.env.example`. Production operations use the API with credentialed requests; server/provider/database/blockchain secrets must never be supplied to this frontend.

## Implemented web surfaces

- Landing: supplied logo, concrete product explanation, canvas knowledge network, floating source cards, parallax, pinned scroll chapters, progress indicator, reveal transitions, responsive navigation, FAQ, reduced-motion support.
- Registration/sign-in forms and service error states.
- Capsule overview and creation; private/public visibility; domain and scope.
- Source library, text/Markdown capture, interview notes, five-second audio chunks with IndexedDB recovery and bounded upload retries.
- Knowledge approval, rejection, expert edits with original proposal, contributor/source attribution, critical conflict view.
- Evaluation dashboard, threshold display, publication gate, immutable version history.
- Access grants, audience/purpose/expiry/usage caps, explicit AI-training, commercial, and derivative permissions, revocation.
- Usage activity and honest unconfigured settlement state.
- Expert profile, public discovery and capsule detail, licensed question answering, source citation dialog, unsupported-answer and denied-access states.

## Demo boundary

`/demo/**` runs a **synthetic, browser-local adapter**. The banner is always visible. Its extraction splits text into sample insights, evaluations are simulated, queries use conservative lexical matching against published snapshots, and publication records are not anchored. No real AI quality, verification, license contract, payment, or blockchain transaction is implied.

Demo state is stored under `synapse-explicit-demo-v1`. Reset removes that one demo workspace. Real studio data is never stored through the demo adapter. Pending live audio is held in IndexedDB only until confirmed upload so interrupted capture can be retried.

## API integration contract

The web uses the PRD `/v1` endpoints for authentication, signed upload, interview segments/finalization/follow-up, conversations/messages, and access requests. The workspace screens additionally expect two typed orchestration endpoints:

- `GET /v1/workspace`: authenticated user's `Workspace` projection.
- `POST /v1/workspace/actions`: authorized, validated action followed by refreshed projection.

Public discovery uses `GET /v1/capsules?visibility=PUBLIC`, public detail uses `GET /v1/capsules/:id/public`, and licensed context uses `GET /v1/capsules/:id/query-context`. Types are in `src/lib/workspace.ts`; API generation should replace these handwritten projections after the API OpenAPI schema is established.

The API must enforce all authorization, tenancy, license limits, approved-version retrieval, immutable manifests, publishing gates, and idempotency. UI checks are conveniences, never a security boundary.

## Validation

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm exec playwright install chromium --only-shell
pnpm test:e2e
pnpm build
```

Unit tests cover demo version immutability, approval gates, unsupported abstention, citations, usage recording, and invalid license denial. Browser tests exercise desktop/mobile landing navigation, the synthetic capture-to-publish workflow, citations, abstention, and revocation.

## Remaining integration work

`/demo/**` remains a browser-local, explicitly-labelled synthetic adapter and is not implemented against any of the real backend features below.

Against the real stack, `synapse-api` + `synapse-ai` + `synapse-contracts` now implement: real account/session handling (email/password and Freighter wallet sign-in), source security scanning, real transcription (interview audio segments transcribed and auto-assembled into a reviewable source), persistent evaluation results (both AI-suggested and expert-authored golden cases), license templates/grants/revocation, expert-credential evidence submission/review, organization creation/membership with TOTP-based admin MFA enforcement, and real Stellar Testnet anchoring of capsule publication and license grant/revocation.

This web app's authenticated Studio UI currently covers capsules, sources, interviews, knowledge review, evaluations, licensing, and usage — i.e. everything in PRD §20's "Expert Studio" and "Licensed user" screen lists. It does **not** yet have UI screens for organization creation/membership/MFA enrollment or expert-credential submission/review, even though the API fully supports them (see `synapse-api/README.md`); those are usable today only via direct API calls. Settlement UI (beyond the "usage/settlement" activity view) is limited to what the API's settlement endpoints currently expose, since payout orchestration itself is not yet wired into any API flow. Privacy and terms pages identify deployment-specific details requiring completion before a public launch. No production deployment has been performed.
