#!/usr/bin/env node
/**
 * Cross-platform NPM publication script for AgenC.
 * Runs pre-deployment validation, builds all packages, and publishes to NPM.
 *
 * Usage:
 *   node scripts/release-publish.mjs [--dry-run]
 */

import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const isDryRun = process.argv.includes('--dry-run');

console.log('=== AgenC Package Release & Publish Pipeline ===');
console.log(`Mode: ${isDryRun ? 'DRY-RUN (Packaging only)' : 'LIVE (Publishing to npm)'}\n`);

function run(cmd, cwd = rootDir) {
  console.log(`\x1b[36m> [${path.basename(cwd)}] ${cmd}\x1b[0m`);
  execSync(cmd, { cwd, stdio: 'inherit' });
}

// 1. Run readiness check
console.log('--- Step 1: Pre-Release Readiness Validation ---');
run('node scripts/check-deployment-readiness.mjs --network devnet');
console.log('');

// 2. Build packages in dependency order
console.log('--- Step 2: Compiling Packages ---');
run('npm run build', path.join(rootDir, 'sdk'));
run('npm run build', path.join(rootDir, 'runtime'));
run('npm run build', path.join(rootDir, 'mcp'));
run('npm run build', path.join(rootDir, 'web'));
console.log('');

// 3. Publish Packages
console.log('--- Step 3: Publishing Packages to NPM ---');
const packages = [
  { name: '@agenc/sdk', dir: path.join(rootDir, 'sdk') },
  { name: '@agenc/runtime', dir: path.join(rootDir, 'runtime') },
  { name: '@agenc/mcp', dir: path.join(rootDir, 'mcp') },
];

for (const pkg of packages) {
  if (isDryRun) {
    run('npm pack --dry-run', pkg.dir);
  } else {
    try {
      run('npm publish --access public', pkg.dir);
      console.log(`\x1b[32mSuccessfully published ${pkg.name}\x1b[0m\n`);
    } catch (err) {
      console.error(`\x1b[31mFailed to publish ${pkg.name}: ${err.message}\x1b[0m`);
      console.log('Ensure you are logged into npm via `npm login` before publishing.');
      process.exit(1);
    }
  }
}

console.log('=== AgenC Release Pipeline Complete ===');
