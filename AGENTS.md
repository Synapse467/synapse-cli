# synapse-cli working rules

- Use Go. The CLI is presentation: parsing, prompts and output. Behaviour belongs in `synapse-engine` or `synapse-core`; add it there first.
- Zero configuration is a requirement. No command may require an environment variable, an account, an API key or a config file. Optional overrides (`SYNAPSE_HOME`, `chain.json`) must have working defaults.
- Never print or log keys, seeds, questions, answers or document contents by default. `whoami` prints the public address only.
- A command exits 0 on success, 1 on failure and 2 on incorrect usage. Output meant for programs goes to stdout; messages for people go to stderr; `mcp` writes only protocol messages to stdout.
- Nothing is published that the expert has not approved. Extraction only ever proposes.
- Distinguish prevention (gateway, license checks that refuse) from audit (usage log, on-chain records) in help text and docs.
- Test commands through `app.Run` with a temporary home folder, including each failing path. The Stellar commands are tested against a fake; live tests are opt-in.
- Do not put credentials, private keys, tokens or real customer data in this workspace.
