# Licensing

A Synapse license is a small signed file that says who may consult a capsule, for what, and for how long. It is issued by the capsule's owner and given to the licensee directly. There is no marketplace, no account and no payment built in: how you charge for a license is between you and the buyer.

## What a license can say

```bash
synapse license issue tenancy-law.capsule.json \
  --to GBUYER…            # the licensee's address (they run `synapse whoami`)
  --purpose research,education
  --queries 100           # at most this many answered questions (omit: unlimited)
  --days 90               # expires after this long (omit: never)
  --commercial            # allow commercial use
  --ai-training           # allow training AI models on the answers
  --derivative            # allow derivative works
  --pin                   # cover this exact version only (default: any version)
  --note "Q4 pilot"
```

- **Purposes** are labels you choose, such as `research`, `education` or `internal-support`. A request must state a purpose and it must match one the license lists exactly. A license can list `*` to allow any purpose.
- **Commercial use, AI training and derivative works** are separate permissions, all off by default. Whoever asks declares how the answer will be used (`ask --commercial`, `--ai-training`, `--derivative`). A request that declares a use the license does not grant is refused.
- **Quota.** Only answered questions count. A question the capsule declines ("not covered") is free.
- **Version.** By default a license covers every version by the same owner, so a buyer keeps access as you improve the capsule. `--pin` ties it to one version.
- **Expiry.** A license is valid from the moment it is issued. The command sets no start time on purpose: a licensee whose clock is a few minutes behind should not be told their license is "not yet valid".

The precise rules, and the reason codes returned when a request is refused, are in [`SPEC.md` §5](https://github.com/Synapse467/synapse-core/blob/main/SPEC.md).

## Open capsules

A capsule published with `synapse init --open` can be consulted without a license, but still only for the purposes in its policy, and only for the uses it allows:

```bash
synapse init my-guide --open --purposes research,education      # no commercial use
synapse init my-guide --open --purposes '*' --commercial        # anything goes
```

An open capsule is a good way to publish free expertise and still say, in a form that software can check, what it may be used for.

## Revoking

```bash
synapse license revoke buyer.license.json
```

This signs a **revocation**, saves it locally so that servers you run honour it at once, and writes `<license-id>.revocation.json`. Send that file to the licensee or anyone else who needs to stop honouring the license; they run:

```bash
synapse revocations add <id>.revocation.json
```

A revocation is signed by the grantor, so nobody else can forge one. For a public, independent revocation that anyone can check, also run `synapse chain revoke`.

## What a license does not do

Be clear-eyed about the two ways licenses are enforced:

| | File mode | Gateway mode |
|---|---|---|
| Where the check runs | On the licensee's machine | On your server |
| Who holds the capsule | The licensee | You |
| Can the licensee ignore the terms? | Yes. The check is part of the software they run, and the capsule is a file they hold. | No. They only receive answers, and only if the gateway agrees. |
| Good for | Trust-based relationships; open capsules; making terms explicit and machine-readable; an audit trail on the honest path | Quotas and purposes you must be able to rely on |

File mode makes the terms unambiguous and gives honest users a log they can show you, but it cannot stop someone determined to copy what they have. If that matters for a capsule, do not hand over the file: [run a gateway](gateway.md).

Also note that a licensee who receives an answer holds that text. No technical measure prevents them copying it; the license is the agreement about what they may do with it. The `--commercial`, `--ai-training` and `--derivative` declarations are what make a violation unambiguous.

## Privacy of use

Usage logs hold the SHA-256 of each question, the purpose, the time and the outcome. Not the question and not the answer. A log entry is chained to the one before it, so editing, removing or reordering entries is detected. `synapse usage` shows the log and verifies the chain.
