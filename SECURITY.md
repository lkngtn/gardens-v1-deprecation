# Security policy

This repository is intentionally incapable of signing or submitting Gnosis mainnet transactions. It reads chain state, constructs unsigned calldata, and mutates only a chain ID 31337 Anvil fork.

Report vulnerabilities through GitHub private vulnerability reporting. Do not include private keys, mnemonics, RPC credentials, or other secrets in an issue.

Before relying on a release, verify the full Git commit, `checksums.txt`, both execution-script hashes, the production Safe, and the snapshot block directly.
