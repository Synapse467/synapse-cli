# Synapse

**Expertise you can ship.**

An expert's knowledge is hard to hand over. A PDF loses who said it and whether it was tested. A chatbot invents things. A licence is a sentence in a contract that nobody can check. Synapse puts expertise in a form that can be trusted, used by people and software, and licensed.

```bash
synapse demo
```

One command, no account, no key to manage, no environment variables, no server.

## The idea

A **capsule** is one signed file holding an expert's approved knowledge:

- **Cited.** Every claim, procedure, rule of thumb, exception and worked case carries the exact words it came from.
- **Attributed.** Every item names its contributor, and contributors can co-sign.
- **Tested.** It cannot be published until it passes an evaluation, and the evaluation is recorded inside it.
- **Honest.** It answers from the expert's own approved words, or says it does not cover the question. There is no model in it to invent anything.
- **Tamper-evident.** Change one character and it no longer opens.
- **Licensable.** A signed license file says who may use it, for what, how many times and until when. Revocation is a signed file too.
- **Versioned.** Each version's hash is chained to the one before, and can be timestamped publicly on Stellar so a file cannot be quietly swapped.

It is used three ways, with the same file:

| Who | How |
|---|---|
| **A person** | `synapse ask capsule.json "…"` |
| **A program** | `synapse.Open("capsule.json")` and `Ask`, in Go. Or run `synapse serve` and use HTTP from anything. |
| **An AI agent** | `synapse mcp capsule.json`: the capsule becomes a tool for Claude, Cursor and others |

## How it avoids needing any setup

| Usually needed | Here |
|---|---|
| An account | Your identity is a Stellar key pair generated on first use, on your machine |
| API keys | There is no model to call and no service to authenticate to |
| A database | Capsules, licenses and usage logs are files |
| A server | Files are checked offline. A gateway is optional, for when you must enforce limits yourself |
| A blockchain wallet and setup | The same key is already a Stellar account. A shared public deployment is built in; a new account is funded automatically |
| Environment variables | None. (`SYNAPSE_HOME` can relocate the folder; nothing requires it.) |

## Where Stellar fits

Synapse works without it. Stellar adds a **public record that neither side controls**, through three small contracts with no admin and no fees:

- an **anchor** for each capsule version, so a buyer can prove the file they hold is the one the owner published;
- the **grant and revocation** of a license, which anyone can check;
- **receipts** for sealed batches of usage, so use can be shown without revealing a single question.

Only hashes, counts and times go on-chain. It is currently on Testnet.

## Honest limits

- A license checked on the buyer's machine is **cooperative**: whoever holds the file could ignore it. Run a gateway (`synapse serve`) when limits must be enforced.
- Answers are **keyword-based retrieval**, not semantic search or generation. That is why they are dependable, and also why a question using none of the capsule's words is declined.
- Extracting items from documents is **heuristic**. Nothing is published until the expert approves it.
- Payment is out of scope. Synapse makes licenses unambiguous and checkable; how you charge is between you and your buyer.
- The Stellar deployment is **Testnet**.

## The four repositories

| Repository | Role | Language |
|---|---|---|
| [`synapse-cli`](https://github.com/Synapse467/synapse-cli) | The `synapse` command: author, verify, ask, license, serve, MCP, Stellar | Go |
| [`synapse-engine`](https://github.com/Synapse467/synapse-engine) | Answering, extracting, evaluating; the gateway and MCP server; the `synapse` library | Go |
| [`synapse-core`](https://github.com/Synapse467/synapse-core) | The formats and rules, with a written [specification](https://github.com/Synapse467/synapse-core/blob/main/SPEC.md) and test vectors | Go |
| [`synapse-contracts`](https://github.com/Synapse467/synapse-contracts) | The three Soroban contracts | Rust |

How they depend on each other, and what belongs where, is in [`REPOSITORIES.md`](https://github.com/Synapse467/synapse-core/blob/main/docs/REPOSITORIES.md).

## Working on it

```bash
# From this folder, with all four repositories cloned beside each other:
go test ./synapse-api/... ./synapse-ai/... ./synapse-web/...
(cd synapse-contracts && cargo test)
```

`go.work` ties the Go modules together for local development. Each repository also builds on its own from tagged dependencies.
