# Security Model

- Store secrets only in `.env.local`.
- Never expose private keys through `NEXT_PUBLIC_` variables.
- Validate all commands.
- Enforce operating limits and control interlocks.
- Require approval for high-risk commands.
- Record commands and state changes.
- Do not claim live control without authenticated BMS integration.
