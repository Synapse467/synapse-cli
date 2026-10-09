# Contributing

Thank you for helping. A few things keep Synapse trustworthy.

## Before you start

- Read `AGENTS.md` (the rules every change follows) and synapse-core's `docs/REPOSITORIES.md` (which repository owns what).
- The CLI is presentation. If a change needs new behaviour, it probably belongs in synapse-engine or synapse-core first.
- The CLI must keep working with zero configuration. A change that makes any command require an environment variable, an account or a config file will not be accepted.

## Build and test

Go 1.26 or later. The CLI builds on its own from the tagged synapse-core and synapse-engine. To change them together with the CLI, clone them beside it and use a `go.work` file:

```bash
go work init ./synapse-cli ./synapse-engine ./synapse-core
cd synapse-cli
go vet ./... && go test ./...
go run ./cmd/synapse demo
```

## What a good change has

- Tests through `app.Run` with a temporary Synapse folder, covering success and each failing path, including exit status.
- Help text and `README.md` / `docs/` updated together with behaviour.
- No secrets, no real customer data, no real documents in fixtures. Use made-up examples.
- Formatted code (`gofmt`) and no `go vet` warnings.
- A note in `CHANGELOG.md` for anything a user would notice.

## Commit messages

Describe what changed and why in the first line (imperative mood), then details if needed.
