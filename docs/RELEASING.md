# Release procedure

## Design release

1. Pin `configs/design.config.json` to an exact Gnosis block.
2. Commit all verifier source and record that 40-character commit as the source commit.
3. Run `npm ci`, `npm run check`, `npm run verify:design`, and the fork verifier.
4. Promote the generated directory to `releases/design-v1.0.0` in a second artifact commit.
5. Verify the promoted bundle again, sign the `design-v1.0.0` tag, and create the GitHub release.
6. Mark the release clearly as non-production.

## Production release

1. Commit a production config containing the exact snapshot block, deployed Safe, expected owners, and threshold.
2. Require a clean source commit and run the exporter from that commit.
3. Run bundle reconstruction and the complete normal-limit fork lifecycle.
4. Independently compare the Safe, HNY amount, 35/56 decoded actions, raw scripts, and hashes.
5. Promote the bundle to `releases/proposal-v1.0.0` in a separate artifact commit.
6. Re-run checksum and bundle verification from a fresh clone of the source commit.
7. Sign the artifact tag and create the GitHub release. Put both full commit URLs and both script hashes in the release notes.
8. Announce corrections as replacements; never edit a published bundle in place.

## Vote 2 readiness

After Vote 1 executes and every intermediate postcondition passes, create a new supplement with current state and fork evidence. It must reproduce the original Vote 2 bytes and hash exactly. If the bytes change, it is a new proposal requiring a new production release.

External review and attestations are advisory. There is no minimum publication delay, but live-state, exact-script, bytecode, Safe, and fork gates are mandatory immediately before creation and execution.
