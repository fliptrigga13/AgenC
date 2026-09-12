/**
 * Pure retry / error classification utilities for ConnectionManager.
 *
 * @module
 */

import type { RetryConfig } from "./types.js";
import { bigintReplacer } from "../tools/types.js";

// ============================================================================
// Error classification
// ============================================================================

/** Non-retryable error patterns — checked FIRST and take priority. */
const NON_RETRYABLE_PATTERNS: readonly string[] = [
  "Account does not exist",
  "could not find",
  "custom program error",
  "insufficient funds",
  "Signature verification",
  "Transaction simulation failed",
];

/** Retryable error patterns — transient network / server issues. */
const RETRYABLE_PATTERNS: readonly string[] = [
  "ETIMEDOUT",
  "ECONNREFUSED",
  "ECONNRESET",
  "ENOTFOUND",
  "socket hang up",
  "blockhash not found",
  "Node is behind",
  "node is unhealthy",
  "Too Many Requests",
];

/** HTTP status codes that are retryable. */
const RETRYABLE_HTTP_STATUSES = new Set([429, 502, 503, 504]);

/** Connection-level errors that indicate the endpoint is unreachable (used for write failover). */
const CONNECTION_LEVEL_PATTERNS: readonly string[] = [
  "ETIMEDOUT",
  "ECONNREFUSED",
  "ECONNRESET",
  "ENOTFOUND",
  "socket hang up",
];

const CONNECTION_LEVEL_HTTP_STATUSES = new Set([502, 503, 504]);

/**
 * Extract HTTP status from an error, if present.
 */
function extractHttpStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const err = error as Record<string, unknown>;

  // Fetch-style: error.status
  if (typeof err.status === "number") return err.status;

  // Solana web3.js wraps HTTP errors in response
  if (typeof err.statusCode === "number") return err.statusCode;

  // Nested response object
  if (err.response && typeof err.response === "object") {
    const res = err.response as Record<string, unknown>;
    if (typeof res.status === "number") return res.status;
    if (typeof res.statusCode === "number") return res.statusCode;
  }

  return undefined;
}

/**
 * Get the error message string from an unknown error value.
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }
  return String(error);
}

function matchesPatterns(msg: string, patterns: readonly string[]): boolean {
  for (const p of patterns) {
    if (msg.includes(p)) return true;
  }
  return false;
}

/**
 * Classify whether an error is retryable.
 *
 * Non-retryable patterns are checked first and take priority.
 */
export function isRetryableError(error: unknown): boolean {
  const msg = getErrorMessage(error);

  // Non-retryable takes priority
  if (matchesPatterns(msg, NON_RETRYABLE_PATTERNS)) return false;

  // Check HTTP status
  const status = extractHttpStatus(error);
  if (status !== undefined && RETRYABLE_HTTP_STATUSES.has(status)) return true;

  // Check message patterns
  return matchesPatterns(msg, RETRYABLE_PATTERNS);
}

/**
 * Classify whether an error indicates the endpoint itself is unreachable.
 *
 * Used to decide whether to failover on write operations (no retry, just failover).
 */
export function isConnectionLevelError(error: unknown): boolean {
  const msg = getErrorMessage(error);

  const status = extractHttpStatus(error);
  if (status !== undefined && CONNECTION_LEVEL_HTTP_STATUSES.has(status))
    return true;

  return matchesPatterns(msg, CONNECTION_LEVEL_PATTERNS);
}

/** Patterns indicating a transaction was already received and processed by the Solana cluster. */
const ALREADY_PROCESSED_PATTERNS: readonly string[] = [
  "already been processed",
  "Transaction already processed",
  "already processed",
];

/**
 * Classify whether an error indicates the transaction was already processed by the cluster.
 * Used during write failover to treat duplicate broadcast submissions as confirmed.
 */
export function isAlreadyProcessedError(error: unknown): boolean {
  const msg = getErrorMessage(error);
  return matchesPatterns(msg, ALREADY_PROCESSED_PATTERNS);
}

const BASE58_ALPHABET =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

/**
 * Zero-dependency Base58 encoder for Solana transaction signatures.
 */
export function toBase58(bytes: Uint8Array): string {
  const digits: number[] = [0];
  for (let i = 0; i < bytes.length; i++) {
    for (let j = 0; j < digits.length; j++) {
      digits[j] <<= 8;
    }
    digits[0] += bytes[i];
    let carry = 0;
    for (let j = 0; j < digits.length; j++) {
      digits[j] += carry;
      carry = (digits[j] / 58) | 0;
      digits[j] %= 58;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  let str = "";
  for (let i = 0; i < bytes.length && bytes[i] === 0; i++) {
    str += "1";
  }
  for (let i = digits.length - 1; i >= 0; i--) {
    str += BASE58_ALPHABET[digits[i]];
  }
  return str;
}

/**
 * Zero-dependency Base58 decoder for Solana wire payloads and signatures.
 */
export function fromBase58(str: string): Uint8Array | null {
  try {
    const bytes: number[] = [0];
    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      const value = BASE58_ALPHABET.indexOf(char);
      if (value === -1) return null;
      for (let j = 0; j < bytes.length; j++) {
        bytes[j] *= 58;
      }
      bytes[0] += value;
      let carry = 0;
      for (let j = 0; j < bytes.length; j++) {
        bytes[j] += carry;
        carry = bytes[j] >> 8;
        bytes[j] &= 0xff;
      }
      while (carry > 0) {
        bytes.push(carry & 0xff);
        carry >>= 8;
      }
    }
    for (let i = 0; i < str.length && str[i] === "1"; i++) {
      bytes.push(0);
    }
    return new Uint8Array(bytes.reverse());
  } catch {
    return null;
  }
}

/**
 * Extract the primary transaction signature from RPC call arguments for write methods.
 *
 * In Solana JSON-RPC `sendTransaction`:
 * `args[0]` is the base64-encoded wire transaction (or Buffer/Uint8Array).
 * In `sendEncodedTransaction`:
 * `args[0]` can be base64 or base58.
 * The wire format begins with a compact-u16 signature count, followed by 64-byte signatures.
 * The first signature is the fee-payer / transaction signature.
 */
export function extractSignatureFromArgs(args: unknown[]): string | null {
  try {
    if (!args || args.length === 0) return null;
    const raw = args[0];
    const opts = args[1] as { encoding?: string } | undefined;
    let bytes: Uint8Array | null = null;
    if (typeof raw === "string") {
      if (opts?.encoding === "base58") {
        bytes = fromBase58(raw);
      } else {
        bytes = Buffer.from(raw, "base64");
      }
    } else if (raw instanceof Uint8Array || Buffer.isBuffer(raw)) {
      bytes = raw;
    }
    if (!bytes || bytes.length < 65) return null;

    let offset = 0;
    const firstByte = bytes[offset++];
    let numSignatures = 0;
    if ((firstByte & 0x80) === 0) {
      numSignatures = firstByte;
    } else {
      if (bytes.length < 66) return null;
      const secondByte = bytes[offset++];
      numSignatures = (firstByte & 0x7f) | ((secondByte & 0x7f) << 7);
    }

    if (numSignatures > 0 && bytes.length >= offset + 64) {
      const sigBytes = bytes.subarray(offset, offset + 64);
      return toBase58(sigBytes);
    }
    return null;
  } catch {
    return null;
  }
}

// ============================================================================
// Write method detection
// ============================================================================

const WRITE_METHODS = new Set(["sendTransaction", "sendEncodedTransaction"]);

/**
 * Check if an RPC method name is a write operation.
 */
export function isWriteMethod(methodName: string): boolean {
  return WRITE_METHODS.has(methodName);
}

// ============================================================================
// Backoff computation
// ============================================================================

/**
 * Compute exponential backoff delay with random jitter.
 *
 * Formula: `min(baseDelay * 2^attempt, maxDelay) * (1 + random * jitter)`
 */
export function computeBackoff(attempt: number, config: RetryConfig): number {
  const base = Math.min(config.baseDelayMs * 2 ** attempt, config.maxDelayMs);
  const buf = new Uint32Array(1);
  globalThis.crypto.getRandomValues(buf);
  const jitter = 1 + (buf[0] / 0x100000000) * config.jitterFactor;
  return Math.round(base * jitter);
}

// ============================================================================
// Coalesce key derivation
// ============================================================================

/**
 * Derive a deterministic cache key for request coalescing.
 *
 * Normalizes Buffer/Uint8Array to hex strings and handles BigInt via bigintReplacer.
 */
export function deriveCoalesceKey(methodName: string, args: unknown[]): string {
  return methodName + ":" + JSON.stringify(args, coalesceReplacer);
}

function coalesceReplacer(key: string, value: unknown): unknown {
  // Buffer / Uint8Array → hex
  if (value instanceof Uint8Array) {
    return "hex:" + bufferToHex(value);
  }
  // Buffer.toJSON returns { type: 'Buffer', data: number[] } — catch that
  if (
    value !== null &&
    typeof value === "object" &&
    "type" in value &&
    (value as Record<string, unknown>).type === "Buffer" &&
    "data" in value &&
    Array.isArray((value as Record<string, unknown>).data)
  ) {
    return (
      "hex:" + bufferToHex(new Uint8Array((value as { data: number[] }).data))
    );
  }
  // BigInt
  return bigintReplacer(key, value);
}

function bufferToHex(buf: Uint8Array): string {
  let hex = "";
  for (const b of buf) {
    hex += b.toString(16).padStart(2, "0");
  }
  return hex;
}
