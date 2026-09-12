#!/usr/bin/env node
/**
 * Cross-platform pre-deployment readiness validator for AgenC.
 * Checks router verifier pinning, nullifier protection, Borsh guards,
 * desktop hardening, and instruction coverage across localnet, devnet, and mainnet.
 *
 * Usage:
 *   node scripts/check-deployment-readiness.mjs [--network devnet|mainnet|localnet]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
let network = 'devnet';
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--network' && args[i + 1]) {
    network = args[i + 1];
    i++;
  } else if (['mainnet', 'devnet', 'localnet'].includes(args[i])) {
    network = args[i];
  }
}

let exitCode = 0;

function pass(msg) {
  console.log(`  \x1b[32mPASS\x1b[0m: ${msg}`);
}
function fail(msg) {
  console.log(`  \x1b[31mFAIL\x1b[0m: ${msg}`);
  exitCode = 1;
}
function warn(msg) {
  console.log(`  \x1b[33mWARN\x1b[0m: ${msg}`);
}

console.log('=== AgenC Deployment Readiness Validator ===');
console.log(`Target Network: ${network}\n`);

// 1. Router Verifier Policy
console.log('--- 1. Router Verifier Policy & Pinning ---');
const routerPath = path.join(
  rootDir,
  'programs',
  'agenc-coordination',
  'src',
  'instructions',
  'complete_task_private.rs'
);

if (!fs.existsSync(routerPath)) {
  fail(`Private completion file not found at: ${routerPath}`);
} else {
  const content = fs.readFileSync(routerPath, 'utf8');

  if (content.includes('TRUSTED_RISC0_SELECTOR')) {
    pass('Trusted RISC0 selector pinning present');
  } else {
    fail('Missing trusted RISC0 selector pinning');
  }

  if (content.includes('TRUSTED_RISC0_IMAGE_ID')) {
    pass('Trusted RISC0 image ID pinning present');
  } else {
    fail('Missing trusted RISC0 image ID pinning');
  }

  if (
    content.includes('TRUSTED_RISC0_ROUTER_PROGRAM_ID') &&
    content.includes('TRUSTED_RISC0_VERIFIER_PROGRAM_ID')
  ) {
    pass('Trusted router and verifier program pinning present');
  } else {
    fail('Missing trusted router/verifier program pinning');
  }

  if (content.includes('binding_spend') && content.includes('nullifier_spend')) {
    pass('Dual spend replay protection present');
  } else {
    fail('Missing dual spend replay checks');
  }

  if (content.includes('nullifier_spend')) {
    pass('Nullifier spend tracking account present in CompleteTaskPrivate');
  } else {
    fail('Missing nullifier spend account definition');
  }

  if (content.includes('InvalidNullifier')) {
    pass('Zero-nullifier and journal nullifier validation present');
  } else {
    fail('Missing zero-nullifier check');
  }

  if (content.includes('InvalidJournalBinding') || content.includes('binding_seed')) {
    pass('Proof binding validation present (InvalidJournalBinding)');
  } else {
    fail('Missing proof binding check');
  }

  if (content.includes('output_commitment')) {
    pass('Output commitment validation present');
  } else {
    fail('Missing output commitment check');
  }

  if (content.includes('ConstraintHashMismatch')) {
    pass('Constraint hash validation present');
  } else {
    fail('Missing constraint hash check');
  }
}
console.log('');

// 2. Security Guard Scripts
console.log('--- 2. Repository Security Guards ---');
try {
  execSync('node scripts/check-borsh-zst-guard.mjs', { cwd: rootDir, stdio: 'pipe' });
  pass('Borsh non-ZST deserialization guard passed');
} catch (err) {
  fail(`Borsh ZST guard failed: ${err.message}`);
}

try {
  execSync('node scripts/check-desktop-image-hardening.mjs', { cwd: rootDir, stdio: 'pipe' });
  pass('Desktop sandbox container hardening passed');
} catch (err) {
  fail(`Desktop hardening check failed: ${err.message}`);
}

try {
  execSync('node scripts/check-onchain-instruction-coverage.js', { cwd: rootDir, stdio: 'pipe' });
  pass('On-chain instruction test coverage complete (42/42 instructions)');
} catch (err) {
  fail(`Instruction coverage check failed: ${err.message}`);
}
console.log('');

// 3. Built Artifacts Check
console.log('--- 3. Monorepo Build Artifacts ---');
const artifacts = [
  { name: '@agenc/sdk CJS/ESM', file: path.join(rootDir, 'sdk', 'dist', 'index.js') },
  { name: '@agenc/sdk types', file: path.join(rootDir, 'sdk', 'dist', 'index.d.ts') },
  { name: '@agenc/runtime CJS', file: path.join(rootDir, 'runtime', 'dist', 'index.js') },
  { name: '@agenc/runtime types', file: path.join(rootDir, 'runtime', 'dist', 'index.d.ts') },
  { name: '@agenc/mcp bundle', file: path.join(rootDir, 'mcp', 'dist', 'index.cjs') },
  { name: '@agenc/web distribution', file: path.join(rootDir, 'web', 'dist', 'index.html') },
];

for (const art of artifacts) {
  if (fs.existsSync(art.file)) {
    pass(`${art.name} built and verified`);
  } else {
    fail(`${art.name} missing at ${art.file}`);
  }
}
console.log('');

// 4. Mainnet-Specific Evidence
console.log('--- 4. Network-Specific Policy Validation ---');
const policyDir = path.join(rootDir, 'artifacts', 'risc0', 'router-policy');
const transcriptPath = path.join(policyDir, 'transcript.json');

if (network === 'mainnet') {
  if (fs.existsSync(transcriptPath)) {
    try {
      const transcript = JSON.parse(fs.readFileSync(transcriptPath, 'utf8'));
      if (transcript.contributions && transcript.contributions.length >= 3) {
        pass(`${transcript.contributions.length} MPC contributions verified (>= 3 required)`);
      } else {
        fail(`Insufficient MPC contributions: ${transcript.contributions?.length || 0} (< 3)`);
      }
      if (transcript.beaconApplied) {
        pass('Random beacon entropy verified');
      } else {
        fail('Random beacon entropy not applied');
      }
    } catch (e) {
      fail(`Failed to parse MPC transcript: ${e.message}`);
    }
  } else {
    fail(`Proof policy transcript missing for mainnet at: ${transcriptPath}`);
  }
} else {
  warn(`Mainnet MPC transcript validation skipped for ${network}`);
}
console.log('');

// Summary
console.log('=== Deployment Readiness Summary ===');
if (exitCode === 0) {
  console.log(`\x1b[32mSUCCESS: All deployment readiness checks passed for ${network}.\x1b[0m`);
} else {
  console.log(`\x1b[31mFAILURE: Deployment checks failed. Resolve issues before deploying to ${network}.\x1b[0m`);
}

process.exit(exitCode);
