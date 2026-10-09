# Changelog

All notable changes are recorded here. This project follows semantic versioning once it is tagged.

## [Unreleased] 0.1.0

A ground-up redesign: the web application is replaced by the `synapse` command.

- Publish: `init`, `add`, `note`, `import`, `review`, `approve`, `reject`, `edit`, `contributor`, `eval`, `publish`, `cosign`.
- Use: `verify`, `inspect`, `ask` (local or `--remote`).
- License: `license issue/inspect/revoke`, `revocations add`.
- Serve and integrate: `serve` (HTTP gateway), `mcp` (AI agents).
- Records: `usage`, and optional Stellar commands under `chain`.
- `demo`: a guided tour that needs no setup and leaves nothing behind.
- Removed: the Next.js web application and all of its configuration.
