# Stellar

Everything in Synapse works without Stellar. Capsules, licenses and usage logs are files, checked offline. Stellar adds one thing: a **public record that neither party controls**.

| You want to be able to prove… | Command | Recorded |
|---|---|---|
| This is the version the owner published, not a swapped file | `synapse chain anchor` | The hash of each capsule version, chained to the one before |
| A license was granted, and when it was revoked | `synapse chain grant` / `revoke` | The license's hash, grantee, expiry and revocation time |
| What was used, without revealing it | `synapse usage seal` then `synapse chain record` | One hash, a count and a period per batch of usage |

Only hashes, counts and times are recorded. No capsule content, no question, no answer, and nothing about the people involved beyond their public addresses.

## There is nothing to set up

- Your Synapse identity is already a Stellar key pair. The same key signs capsules and pays for transactions.
- The first `chain` command that needs an account creates it on Testnet with Friendbot, which is free.
- The three contracts are a shared, public deployment with no admin and no fees. Everything a user writes is stored under their own address, so nobody needs to deploy a copy. The addresses are built in.

```bash
synapse chain anchor tenancy-law.capsule.json
# Anchored version 1 of "Tenancy Basics".
#   hash         fcfaab04…
#   transaction  a43aca69…
#   see it       https://stellar.expert/explorer/testnet/tx/a43aca69…
```

## Checking a file you were given

```bash
synapse chain status tenancy-law.capsule.json
```

Anyone can run this. It compares the file's hash with what its owner anchored (it reads the chain; it does not write to it):

- **Anchored** and matches: the owner recorded exactly this version.
- **MISMATCH**: the owner anchored a *different* file as this version. Do not trust the file.
- **Not anchored**: allowed, but nothing independent vouches for it.

## Anchoring rules

- Versions are anchored in order: 1, then 2, and so on. There are no gaps and no re-anchoring.
- Each anchor includes the previous version's hash, so history cannot be rewritten without it showing.
- Only the owner's key can anchor their capsule. Others anchoring the same slug write to their own namespace and do not interfere.

## Usage receipts

`synapse usage seal` groups new, answered uses of a license into a batch whose hash commits to each event's hash. `synapse chain record` writes each new batch as a receipt, numbered without gaps and linked to the one before. A receipt proves how many uses occurred in a period; to show *which* uses, you reveal the underlying log entries, which hold question hashes only.

Run `chain record` as the party that holds the log: the owner for a gateway, the licensee for their own file-mode usage.

## Storage lifetime

Soroban deletes entries nobody extends. Every write here extends the entries it touches by roughly 150 days, so records you keep using stay alive. A record you never touch again can eventually expire. If a later write needs expired data, the client restores it automatically first. See [`CONTRACTS.md`](https://github.com/Synapse467/synapse-contracts/blob/main/docs/CONTRACTS.md#storage-lifetime).

## Testnet today, Mainnet later

The built-in deployment is on **Testnet**: free, public, and reset from time to time. That is right for building and trying Synapse, and not yet right for records meant to last for years. Moving to Mainnet means deploying the same contracts there and switching the defaults, and it spends real XLM, so it is a deliberate step rather than something a command does silently.

To point the commands at another deployment (your own Testnet copy, say), create `chain.json` in your Synapse folder:

```json
{
  "rpcUrl": "https://…",
  "passphrase": "…",
  "friendbot": "",
  "capsuleAnchor": "C…",
  "licenseLedger": "C…",
  "usageLedger": "C…"
}
```

Absent that file, the defaults are used. Nothing else is read from the environment.
