# Security

## Reporting a vulnerability

Please report vulnerabilities privately, through GitHub's **Report a vulnerability** button on this repository's Security tab. Do not open a public issue for something exploitable, and do not include real keys, tokens or customer data in a report.

You will get an acknowledgement, and we will agree a disclosure date with you once the fix is ready.

## What counts

- The CLI revealing a key, seed, question, answer or document where it should not.
- A command that publishes an item the expert did not approve.
- A command that overwrites an identity, capsule or license without being asked.
- A path or filename in a crafted capsule, license or draft that makes a command read or write outside the folders it should.
- A gateway or MCP behaviour that answers when the license, signature, quota, purpose or revocation check should have refused (also see synapse-engine).

## What does not

- Licenses checked on the licensee's own machine are cooperative by design. Someone who holds a capsule file can ignore its license terms; use `synapse serve` when limits must be enforced. This is documented, not a vulnerability.
- Anything that needs the attacker to already hold the victim's `identity.json`.
- Testnet being reset.

## Handling secrets

Your Synapse identity is a Stellar secret key in `identity.json` in your Synapse folder (owner-only on Linux and macOS; on Windows, your user profile's permissions apply). Back it up; never share it or commit it. Your identity lives in your Synapse folder, outside any project. `synapse init` adds a `.gitignore` that excludes the private `.synapse/` folder, which holds copies of your source documents.
