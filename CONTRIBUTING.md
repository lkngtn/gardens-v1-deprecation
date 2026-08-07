# Contributing

Changes should make the proposal easier to reproduce without expanding transaction authority.

1. Create a branch and keep changes focused.
2. Run `npm ci` and `npm run check`.
3. For manifest or fork changes, run `GNOSIS_RPC_URL=... npm run verify:fork -- --bundle <bundle>`.
4. Never add signing, submission, wallet, private-key, mnemonic, or keeper functionality.
5. Explain any change to action ordering, addresses, ABIs, or expected state in the pull request.

Security-sensitive changes require a new bundle, new hashes, and a fresh fork report. Existing production release artifacts are never edited in place.
