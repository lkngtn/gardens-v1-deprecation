import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesUnder(target));
    else files.push(target);
  }
  return files;
}

const packageJson = JSON.parse(await readFile('package.json', 'utf8'));
if (packageJson.private !== true) throw new Error('package.json must remain private to prevent accidental npm publication.');

const files = await filesUnder('src');
for (const file of files) {
  const source = await readFile(file, 'utf8');
  for (const forbidden of ['privateKeyToAccount', 'createWalletClient', 'sendRawTransaction', 'mnemonicToAccount', 'walletConnect']) {
    if (source.toLowerCase().includes(forbidden.toLowerCase())) throw new Error(`${file} contains forbidden signing/submission capability: ${forbidden}.`);
  }
  if (source.includes('eth_sendTransaction') && file !== path.join('src', 'fork.ts')) throw new Error(`${file} can submit a transaction outside the fork harness.`);
}

const fork = await readFile(path.join('src', 'fork.ts'), 'utf8');
if (!fork.includes("chainId !== 31337")) throw new Error('Fork harness is missing its chain ID 31337 mutation guard.');
if (!fork.includes("'--chain-id', '31337'")) throw new Error('Anvil is not pinned to chain ID 31337.');

console.log('Safety verification passed: no signing/raw-submission surface; mutations confined to chain ID 31337 fork harness.');
