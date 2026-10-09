# Gateway

`synapse serve` keeps a capsule on your machine and answers questions over HTTP. The licensee never receives the file, so the terms of their license are enforced by you, not left to their goodwill.

```bash
synapse serve tenancy-law.capsule.json                  # 127.0.0.1:8787
synapse serve tenancy-law.capsule.json --addr :8787     # all interfaces; put TLS in front first
```

There is no configuration, no database and no user table. Identity is the Stellar key that signs each request, and the licensee's license travels inside every request.

## What the gateway checks

For a signed request, in order:

1. The signature is valid for the `grantee` address.
2. The request time is within 5 minutes of the gateway's clock.
3. The `(grantee, nonce)` pair has not been seen recently, so a captured request cannot be replayed.
4. The request is for the exact capsule version being served, and for the license that was sent.
5. The license is valid, covers this capsule and version, is held by the signer, and has not been revoked, expired or used up. The declared purpose and uses are covered by it.
6. The use is **written to the log before the answer is returned.** If it cannot be written, no answer is given.

Revocations are read on every request, so `synapse license revoke` takes effect immediately.

Unsigned requests are accepted only for open capsules, and still only for the purposes and uses in the capsule's policy.

## Asking it

```bash
synapse ask --remote http://127.0.0.1:8787 --license l.json "When must a deposit be protected?"
```

`ask --remote` signs the question with your Synapse identity, so you must be the licensee named in the license.

## HTTP API

| Route | Description |
|---|---|
| `GET /v1/health` | `{"status":"ok"}` |
| `GET /v1/capsule` | The capsule's public summary: slug, title, version, hash, owner, item count, evaluation. Never its knowledge. |
| `POST /v1/ask` | Ask a question (below). |

### `POST /v1/ask`

```json
{
  "request": { "format": "synapse.request/1", "capsule": "<hash>", "license": "<license hash>",
               "purpose": "research", "question": "…", "nonce": "…", "at": "…",
               "grantee": "G…", "signature": "…" },
  "license": { … the license file … },
  "commercial": false, "aiTraining": false, "derivative": false
}
```

For an open capsule you may send `{"question": "…", "purpose": "research"}` instead of a signed request.

Success is `200` with the reply: `decision`, `answered`, `answer` (the matching items, caveats and their citations), `markdown` and `capsule`.

| Status | Meaning |
|---|---|
| `400` | Malformed body, unknown fields, missing question, or the request was not signed for the license sent |
| `401` | Bad or stale signature, or a signed request is required |
| `403` | Refused by the license: the body carries `code` (see [`SPEC.md` §5.1](https://github.com/Synapse467/synapse-core/blob/main/SPEC.md)) and the reason |
| `409` | Replayed request, or made for a different version of the capsule |
| `413` | Body larger than 1 MiB |
| `500` | The use could not be recorded (so no answer was given), or revocations could not be read |

A refusal for lack of coverage is not an error: it is a `200` with `answered: false`, and is not counted against a quota.

## From Go

```go
handler, err := gateway.New(gateway.Config{
    Capsule: capsule,           // *synapse.Capsule
    Log:     usageLog,          // required
    Revocations: func() (license.RevocationSet, error) { return license.LoadRevocations("revocations.json") },
})
http.ListenAndServe(":8787", handler)   // or mount it under your own router
```

and the matching client:

```go
reply, err := gateway.Client{BaseURL: "https://example.com"}.Ask(ctx, identity, license, "research", "…", gateway.Use{})
```

## Running it for real

- Put it behind TLS. The gateway speaks plain HTTP and prints a warning if it listens beyond localhost.
- Back up the usage log. It is your record of what was used; `synapse usage` verifies it and `synapse chain record` can publish sealed batches of it.
- It serves one capsule per process. Run several, or mount several handlers in your own server.
- Rate limiting, request logging and authentication of operators are left to your reverse proxy.
