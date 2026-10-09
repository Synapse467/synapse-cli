# Giving a capsule to an AI agent

`synapse mcp` serves one or more capsules as tools over the [Model Context Protocol](https://modelcontextprotocol.io), on standard input and output. An agent can then consult an expert's capsule the way it calls any tool.

```bash
synapse mcp tenancy-law.capsule.json
synapse mcp law.capsule.json ops.capsule.json --license ops.license.json
```

No language model, API key or network connection is used by the capsule. The agent brings its own model; the capsule brings the expert's approved words.

## Setting it up

**Claude Desktop** (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "tenancy-law": {
      "command": "synapse",
      "args": ["mcp", "/absolute/path/to/tenancy-law.capsule.json"]
    }
  }
}
```

**Claude Code:**

```bash
claude mcp add tenancy-law -- synapse mcp /absolute/path/to/tenancy-law.capsule.json
```

**Cursor and others:** any client that can launch a stdio MCP server can run the same command.

## Tools

| Tool | What it does |
|---|---|
| `synapse_capsules` | Lists the available capsules: slug, title, version, owner, field and size. |
| `synapse_ask` | `question` (required), `capsule` (slug; optional if only one is served) and `purpose` (optional). Returns the expert's matching guidance with citations and attribution, or says the capsule does not cover the question. |

The server tells the agent not to answer from its own knowledge when a capsule says it is not covered. Whether the agent obeys is up to the agent; what the server guarantees is that it never supplies text the expert did not approve.

## Licensing through an agent

Licenses apply exactly as they do on the command line, because the server uses the same code:

- An **open** capsule is answered for the purposes in its policy. The agent's stated `purpose` is used, and `--purpose` (default `assistant`) is the fallback.
- A **closed** capsule needs `--license`. The asker is your local Synapse identity, so the license must have been issued to your address.
- Each use is recorded in your usage log (hashes of questions only), and quotas and revocations apply. A denied call is returned to the agent as a tool error with the reason.

The agent can ask questions. It cannot list or download the capsule, so it can only retrieve what a question matches.

## Troubleshooting

Standard output carries only protocol messages; anything else the server says goes to standard error. If a client reports that the server will not start, run the command by hand and check that the capsule verifies (`synapse verify <file>`).
