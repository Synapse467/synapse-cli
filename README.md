<p align="center"><img src="assets/logo.svg" alt="Synapse logo" width="112"></p>

<h1 align="center">synapse-cli</h1>

<p align="center"><b>The synapse command: publish, verify, ask, license and serve expertise with no account.</b></p>

<p align="center">
  <a href="https://github.com/Synapse467/synapse-cli/actions/workflows/ci.yml"><img src="https://github.com/Synapse467/synapse-cli/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/Synapse467/synapse-cli/blob/main/LICENSE"><img src="https://img.shields.io/github/license/Synapse467/synapse-cli?color=blue" alt="License: MIT"></a>
  <a href="https://github.com/Synapse467/synapse-cli/releases"><img src="https://img.shields.io/github/v/release/Synapse467/synapse-cli?color=brightgreen" alt="Latest release"></a>
  <img src="https://img.shields.io/github/go-mod/go-version/Synapse467/synapse-cli?color=00ADD8" alt="Go version">
  <a href="https://github.com/Synapse467/synapse-cli/issues"><img src="https://img.shields.io/github/issues/Synapse467/synapse-cli?color=orange" alt="Open issues"></a>
  <a href="https://github.com/Synapse467/synapse-cli/issues?q=is%3Aopen+label%3A%22help+wanted%22"><img src="https://img.shields.io/badge/help%20wanted-welcome-8A2BE2" alt="Help wanted"></a>
  <img src="https://img.shields.io/badge/built%20for-Stellar-black" alt="Built for Stellar">
</p>

<p align="center">
  <a href="https://cjay-1.gitbook.io/synapse-docs/">Documentation</a> ·
  <a href="https://github.com/Synapse467/synapse-cli/releases">Releases</a> ·
  <a href="https://github.com/Synapse467/synapse-cli/issues">Issues</a> ·
  <a href="CONTRIBUTING.md">Contributing</a> ·
  <a href="SECURITY.md">Security</a>
</p>

---


The `synapse` command: turn what an expert knows into a signed, tested, licensable file, and let people, programs and AI agents use it.

```bash
synapse demo
```

That is the whole setup. No account, no API key, no environment variables, no server. The first time you do anything that needs an identity, one is made on your machine.

## What it does

A **capsule** is one file holding an expert's approved knowledge: claims, procedures, rules of thumb, exceptions and worked cases, each with its source quote and its author. It is signed, versioned and tested before it can be published. Anyone who receives it can check it offline, ask it questions, and rely on it either answering from the expert's own words or saying it cannot.

```
documents ──▶ synapse add ──▶ review & approve ──▶ synapse publish ──▶ tenancy.capsule.json
                                                                              │
              ask · license · serve · mcp · chain anchor  ◀───────────────────┘
```

## Install

Go 1.26 or later:

```bash
go install github.com/Synapse467/synapse-cli/cmd/synapse@latest
```

or download a binary for your system from the Releases page, or build it:

```bash
git clone https://github.com/Synapse467/synapse-cli && cd synapse-cli
go build -o synapse ./cmd/synapse
```

## Five minutes

### Publish expertise

```bash
synapse init tenancy-law --title "Tenancy Law Basics" --domain law --scope England
cd tenancy-law

synapse add my-notes.md another-doc.md     # proposes items, citing the exact words they came from
synapse review                             # see what was proposed
synapse review item-3fa9                   # one item in full
synapse approve --all                      # or approve and reject one by one
synapse note --type heuristic --title "..." --body "..."   # add something you know that is not in a document

synapse eval                               # test it before publishing
synapse publish                            # sign it and write dist/tenancy-law.capsule.json
```

Nothing is published that you have not approved. Your documents stay on your machine: the capsule records only their hashes and the short quotes you approve.

### Use expertise

```bash
synapse verify tenancy-law.capsule.json                    # integrity and signatures, offline
synapse inspect tenancy-law.capsule.json --items           # what it contains and how it was tested
synapse ask tenancy-law.capsule.json "When must a deposit be protected?"
```

If the capsule does not cover a question it says so. It does not guess.

### Sell or share it under a license

```bash
synapse whoami                             # the buyer runs this and sends you their address
synapse license issue tenancy-law.capsule.json \
    --to GBUYER… --purpose research --queries 100 --days 90

synapse ask tenancy-law.capsule.json "…" --license tenancy.gbuyer.license.json
synapse license revoke tenancy.gbuyer.license.json         # withdraw it; send the revocation file on
```

A license is a signed file. The buyer needs no account with anyone.

### Make it enforceable

A license checked on the buyer's machine is honour-system: whoever holds the file could ignore its terms. To enforce limits yourself, keep the capsule and serve it:

```bash
synapse serve tenancy-law.capsule.json                     # listens on 127.0.0.1:8787
synapse ask --remote http://127.0.0.1:8787 --license l.json "…"
```

Every question arrives signed by the licensee, so the gateway knows who is asking without accounts. It enforces purposes, quotas, expiry and revocation, and refuses to answer if it cannot record the use.

### Give it to an AI agent

```bash
synapse mcp tenancy-law.capsule.json
```

serves the capsule as a tool over the Model Context Protocol, so Claude, Cursor and other agents can consult it. No model or API key is involved on the capsule's side.

```jsonc
// Claude Desktop: claude_desktop_config.json
{ "mcpServers": { "tenancy-law": { "command": "synapse", "args": ["mcp", "/path/to/tenancy-law.capsule.json"] } } }
```

```bash
# Claude Code
claude mcp add tenancy-law -- synapse mcp /path/to/tenancy-law.capsule.json
```

For a capsule that needs a license add `--license /path/to/license.json`. The agent can ask questions and receive the matching answers. It cannot list or download the capsule, and licenses still apply.

### Use it from Go

```go
import "github.com/Synapse467/synapse-engine/synapse"

c, err := synapse.Open("tenancy-law.capsule.json") // verified; a tampered file does not open
reply, err := c.Ask("When must a deposit be protected?", synapse.Access{Purpose: "research"})
fmt.Println(reply.Markdown)
```

See [`synapse-engine`](https://github.com/Synapse467/synapse-engine) for the full library, including the HTTP gateway as an `http.Handler` you can mount in your own server.

### Optionally, record it on Stellar

```bash
synapse chain anchor tenancy-law.capsule.json     # timestamp this version publicly
synapse chain status tenancy-law.capsule.json     # anyone can check a file against its anchor
synapse chain grant   license.json                # record a license
synapse chain revoke  license.json                # revoke it publicly
synapse usage seal && synapse chain record        # record sealed usage batches
```

This uses your Synapse identity, creates and funds a Testnet account automatically, and talks to a shared public deployment. There is nothing to configure. Everything above works without it.

## Command reference

| Command | Purpose |
|---|---|
| `demo [--write dir]` | Walk through everything Synapse does with a sample capsule. Touches nothing on your machine. |
| `whoami` | Show your identity (created on first use). |
| `init <name>` | Start a capsule in a folder. |
| `add <file>…` | Add documents. Proposes items for review; never publishes. |
| `note` | Write an item yourself. |
| `import <items.json>` | Add items proposed by another tool or an AI agent. They wait for your approval. |
| `review [id]` | List or show items. |
| `approve` / `reject` / `edit` | Decide on items. |
| `contributor add <address>` | List a co-author whose items are credited to them. |
| `eval [--write-suite]` | Test the capsule. Write the suite out to add your own questions. |
| `publish` | Evaluate, sign, and write the capsule file. Fails if it does not pass. |
| `cosign <capsule>` | A listed contributor adds their signature. |
| `verify <capsule>` | Check integrity and signatures. `--previous` also checks the version chain. |
| `inspect <capsule>` | Summarise a capsule. |
| `ask <capsule> "…"` | Ask a question. `--license`, `--purpose`, `--remote`, `--json`. |
| `license issue / inspect / revoke` | Create, read and withdraw licenses. |
| `revocations add <file>` | Accept a revocation someone sent you. |
| `serve <capsule>` | HTTP gateway that enforces licenses. |
| `mcp <capsule>…` | MCP server for AI agents. |
| `usage [seal]` | Show your tamper-evident usage log, or seal new uses into a batch. |
| `chain …` | Optional Stellar records. |

Run `synapse help <command>` for the options of any command. Exit status is 0 on success, 1 on failure and 2 for incorrect usage, so the commands work in scripts and CI.

## Where things live

Everything is a plain file.

| What | Where |
|---|---|
| Your identity (signing key) | `identity.json` in your Synapse folder: `%AppData%\synapse` on Windows, `~/Library/Application Support/synapse` on macOS, `~/.config/synapse` on Linux |
| Revocations you have accepted, usage logs | The same folder |
| A capsule in progress | The folder `synapse init` made: `synapse.draft.json`, plus `.synapse/` for private copies of your sources |
| Published capsules | `dist/` in that folder |

Set `SYNAPSE_HOME` to move your Synapse folder. That is the only environment variable, and it is optional. An optional `chain.json` in the Synapse folder can point the Stellar commands at a different deployment.

**Back up `identity.json`.** It is what proves a capsule or license is yours. Anyone who has it can sign as you; nobody can recover it for you.

## Privacy and safety

- Documents you add are never uploaded or embedded in the capsule; only hashes and the quotes you approve are.
- Questions are never logged. The usage log records the SHA-256 of each question.
- A capsule that was altered after signing does not open. A license that was altered does not verify.
- The engine answers from approved items only. It does not generate text, so it cannot invent an answer.
- Extraction from documents is heuristic and will miss things and sometimes mislabel them. That is why nothing is published until you approve it.

## Limits worth knowing

- File-mode licensing is cooperative; use `serve` for authority. See [`docs/licensing.md`](docs/licensing.md).
- Retrieval is keyword-based. It is predictable and explainable, and it is not semantic search: a question using none of the capsule's words will be declined.
- The Stellar deployment is on Testnet. Mainnet is a deliberate later step.

## More

[`docs/licensing.md`](docs/licensing.md) · [`docs/gateway.md`](docs/gateway.md) · [`docs/mcp.md`](docs/mcp.md) · [`docs/stellar.md`](docs/stellar.md) · [`docs/faq.md`](docs/faq.md)

MIT licensed. See [`../REPOSITORIES.md`](https://github.com/Synapse467/synapse-core/blob/main/docs/REPOSITORIES.md) for how the four repositories fit together.

## Maintainers

| Maintainer | Role | Contact |
| --- | --- | --- |
| [Synapse467](https://github.com/Synapse467) | Organization owner, releases | [GitHub issues](https://github.com/Synapse467/synapse-cli/issues) |

## Community

Ask questions and propose changes in [GitHub issues](https://github.com/Synapse467/synapse-cli/issues). Read the [documentation](https://cjay-1.gitbook.io/synapse-docs/) first; the [FAQ](https://cjay-1.gitbook.io/synapse-docs/project/faq) answers the common questions.

## Contributors

<a href="https://github.com/Synapse467/synapse-cli/graphs/contributors"><img src="https://contrib.rocks/image?repo=Synapse467/synapse-cli" alt="Contributors"></a>
