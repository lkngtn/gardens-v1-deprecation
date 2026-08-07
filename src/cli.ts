#!/usr/bin/env node
import path from 'node:path';
import { exportBundle, verifyBundle } from './bundle.js';
import { loadConfig } from './config.js';
import { verifyFork } from './fork.js';

function option(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function usage(): never {
  throw new Error(`Usage:
  npm run verify:design [-- --out artifacts/generated/design-v1.0.0]
  npm run export:bundle -- --config <config.json> --out <directory>
  npm run verify:bundle -- --bundle <directory>
  GNOSIS_RPC_URL=... npm run verify:fork -- --bundle <directory>`);
}

async function main(): Promise<void> {
  const [command, ...args] = process.argv.slice(2);
  if (!command) usage();
  if (args.some((arg) => /private.?key|mnemonic|seed.?phrase/i.test(arg))) throw new Error('Private-key and mnemonic arguments are forbidden.');

  if (command === 'design' || command === 'export') {
    const configPath = command === 'design' ? 'configs/design.config.json' : option(args, '--config');
    if (!configPath) usage();
    const out = option(args, '--out') ?? (command === 'design' ? 'artifacts/generated/design-v1.0.0' : undefined);
    if (!out) usage();
    const rpcUrl = process.env.GNOSIS_RPC_URL;
    if (!rpcUrl) throw new Error('GNOSIS_RPC_URL is required for read-only snapshot export.');
    const config = await loadConfig(configPath);
    const metadata = await exportBundle(config, rpcUrl, path.resolve(out));
    console.log(JSON.stringify({ ok: true, output: path.resolve(out), block: metadata.snapshot.blockNumber, vote1: metadata.vote1, vote2: metadata.vote2 }, null, 2));
    return;
  }

  if (command === 'verify') {
    const bundle = option(args, '--bundle');
    if (!bundle) usage();
    const metadata = await verifyBundle(path.resolve(bundle));
    console.log(JSON.stringify({ ok: true, sourceCommit: metadata.sourceCommit, vote1: metadata.vote1, vote2: metadata.vote2 }, null, 2));
    return;
  }

  if (command === 'fork') {
    const bundle = option(args, '--bundle');
    if (!bundle) usage();
    const rpcUrl = process.env.GNOSIS_RPC_URL;
    if (!rpcUrl) throw new Error('GNOSIS_RPC_URL is required to start the pinned local fork.');
    await verifyFork(path.resolve(bundle), rpcUrl);
    console.log(JSON.stringify({ ok: true, bundle: path.resolve(bundle), fork: 'pass' }, null, 2));
    return;
  }

  usage();
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
