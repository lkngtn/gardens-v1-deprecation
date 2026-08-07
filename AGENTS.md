# Repository instructions

This repository is a read-only verifier for the Gardens v1 deprecation proposal.

- Read `README.md` and `docs/PROPOSAL.md` before changing behavior.
- Keep `package.json` private; this source is not an npm package.
- Never add private-key, mnemonic, wallet, signer, keeper, or mainnet submission code.
- Chain ID 100 access must remain read-only and produce unsigned calldata only.
- Mutable JSON-RPC methods are allowed only in `src/fork.ts` after a chain ID 31337 check.
- Preserve the locked 35-action/56-action split, unless a newly reviewed proposal explicitly replaces it.
- Never target the shared Celeste Court.
- Run `npm run check`; run the pinned fork verification for any manifest, ABI, address, snapshot, or harness change.
- Published artifacts are immutable by convention: corrections use a new directory, commit, and release.
