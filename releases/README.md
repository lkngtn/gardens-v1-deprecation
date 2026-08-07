# Release artifacts

Generated output belongs under `artifacts/generated/` and is ignored. A reviewed bundle is promoted into this directory only as part of an explicit release commit.

- `design-v1.0.0/` will contain reproducible non-production design evidence.
- `proposal-v1.0.0/` will contain the final Safe, balance snapshot, scripts, unsigned previews, and fork report.
- `vote-2-readiness-v1.0.0/` will contain post-Vote-1 state evidence and must reproduce the original Vote 2 script hash.

Never replace a published directory. Corrections use a new commit and release name and explicitly invalidate the old release.
