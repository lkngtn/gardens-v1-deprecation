# Publication security review

The source was separated from the private Bee repository to minimize the review and attack surface.

Excluded surfaces include signer daemons, keystores, WalletConnect, mainnet submission, keeper/runtime state, operator history, personal paths, and the Bee v2 branch. Runtime configs and generated artifacts are ignored by default.

Required checks before each release:

- `npm run check`
- `npm audit --omit=dev --audit-level=high`
- secret scan of the complete public tree and history
- `npm pack --dry-run --json` confirming accidental publication remains blocked by `private: true`
- fresh-clone bundle reconstruction
- pinned-block and latest-applicable fork rehearsals

The initial AI-assisted scan found no evident live credentials and no current npm advisories. This is not a substitute for a professional security audit.
