# Questions people ask

### Do I need an account, an API key or a server?

No. The first time you need an identity one is generated on your machine. Nothing is sent anywhere unless you choose to run `serve` or a `chain` command.

### Is there an AI model in here?

Not in the capsule. Answers are made only of the expert's approved items, ranked by keyword relevance, with citations and attribution. That is what makes it dependable: there is no step where text can be made up. AI agents can *use* a capsule through `synapse mcp`, and an AI tool can *propose* items for review through `synapse import`, but a person approves everything.

### How does it decide it "does not cover" a question?

It looks at how much of the question's distinctive wording an item covers (weighted by how rare each word is in the capsule). If the best item covers less than half, it declines. Words the capsule has never seen count for less, so ordinary filler such as "often" or "best" does not cause a refusal. See the engine's [`docs/how-answers-work.md`](https://github.com/Synapse467/synapse-engine/blob/main/docs/how-answers-work.md).

### Why does a question using different words get declined?

Retrieval is keyword-based, not semantic. That is a trade-off: it is predictable, explainable and cannot hallucinate, and it will miss a paraphrase that shares no words with the capsule. Add the expert's own phrasings as tags or titles, and write evaluation questions the way users actually ask.

### Can a buyer just copy the capsule?

In file mode, yes, and no license check on their machine can stop that. If you need to prevent it, do not hand over the file: use `synapse serve`. See [`licensing.md`](licensing.md).

### What does the evaluation prove?

That, before publishing, the capsule answered the questions it should, refused the ones it should, and that every citation checks out against its source and every item is credited. The capsule records how many questions were run and a hash of the suite, so anyone can see what it was tested on. Generated suites are a smoke test; a suite you write yourself is stronger, and `synapse eval --write-suite` lets you add your own.

### Does it keep my source documents?

Your documents stay in your project folder (`.synapse/`, ignored by Git). The published capsule contains each source's SHA-256 hash and only the short quotes you approved.

### What if I lose `identity.json`?

You can no longer sign as that identity, and nobody can recover it. Capsules and licenses already signed remain valid. Back it up like you would an SSH key.

### What does a capsule cost to make or use?

Nothing in Synapse charges for anything. Anchoring on Testnet is free. A future Mainnet deployment would cost the ordinary Stellar transaction fee, a fraction of a cent.

### Is it ready for production?

The formats, the checks and the tooling are complete and tested, including against the live Testnet deployment. What is intentionally not done: Mainnet deployment, payments, and semantic retrieval. Treat the Stellar records as Testnet-grade until the contracts are deployed on Mainnet.
