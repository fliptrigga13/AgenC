/**
 * In-house encrypted keystore for Solana Keypairs using AES-256-GCM.
 *
 * Implements password-based authenticated encryption for private keys
 * using native `node:crypto` (PBKDF2-SHA256, 100,000 iterations, 12-byte IV,
 * 16-byte GCM authentication tag).
 *
 * Includes memory zeroing for decrypted key buffers to minimize memory exposure.
 *
 * @module
 */

import {
  randomBytes,
  pbkdf2Sync,
  createCipheriv,
  createDecipheriv,
  randomFillSync,
} from "node:crypto";
import { promises as fsPromises } from "node:fs";
import { Keypair } from "@solana/web3.js";

export class KeystoreError extends Error {
  readonly filePath: string;
  readonly cause?: Error;

  constructor(message: string, filePath: string, cause?: Error) {
    super(message);
    this.name = "KeystoreError";
    this.filePath = filePath;
    this.cause = cause;
  }
}

export interface EncryptedKeystorePayload {
  version: 1;
  kdf: "pbkdf2";
  kdfParams: {
    iterations: number;
    salt: string; // hex
    hash: "sha256";
  };
  cipher: "aes-256-gcm";
  cipherParams: {
    iv: string; // hex
    authTag: string; // hex
  };
  ciphertext: string; // hex
  publicKey: string; // base58 for quick inspection without decryption
}

const CURRENT_VERSION = 1;
const PBKDF2_ITERATIONS = 100_000;
const KEY_LEN_BYTES = 32; // 256-bit key for AES-256
const SALT_LEN_BYTES = 16;
const IV_LEN_BYTES = 12; // 96-bit recommended IV for GCM

/**
 * Derives an AES-256 key from a passphrase and salt using PBKDF2.
 */
function deriveKey(passphrase: string, salt: Buffer): Buffer {
  return pbkdf2Sync(passphrase, salt, PBKDF2_ITERATIONS, KEY_LEN_BYTES, "sha256");
}

/**
 * Safely zeroes a buffer in memory.
 */
export function wipeBuffer(buf: Uint8Array | Buffer): void {
  randomFillSync(buf);
}

/**
 * Checks if a given file contains an AgenC encrypted keystore payload.
 *
 * @param filePath - Path to examine
 * @returns True if file is valid JSON with version and cipher fields
 */
export async function isEncryptedKeystore(filePath: string): Promise<boolean> {
  try {
    const raw = await fsPromises.readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    return (
      parsed &&
      typeof parsed === "object" &&
      parsed.version === 1 &&
      parsed.cipher === "aes-256-gcm" &&
      typeof parsed.ciphertext === "string"
    );
  } catch {
    return false;
  }
}

/**
 * Encrypts a Solana Keypair and writes it to disk as an encrypted keystore JSON.
 *
 * @param keypair - The Keypair to encrypt
 * @param passphrase - The passphrase used to protect the secret key
 * @param filePath - Path to write the encrypted keystore JSON file
 */
export async function saveEncryptedKeypair(
  keypair: Keypair,
  passphrase: string,
  filePath: string,
): Promise<void> {
  if (!passphrase || passphrase.length < 8) {
    throw new KeystoreError(
      "Passphrase must be at least 8 characters long for secure keystore encryption",
      filePath,
    );
  }

  const salt = randomBytes(SALT_LEN_BYTES);
  const iv = randomBytes(IV_LEN_BYTES);
  const derivedKey = deriveKey(passphrase, salt);

  let ciphertextHex: string;
  let authTagHex: string;

  // Clone secret key bytes into buffer for encryption
  const secretBuffer = Buffer.from(keypair.secretKey);

  try {
    const cipher = createCipheriv("aes-256-gcm", derivedKey, iv);
    const encrypted = Buffer.concat([cipher.update(secretBuffer), cipher.final()]);
    const authTag = cipher.getAuthTag();

    ciphertextHex = encrypted.toString("hex");
    authTagHex = authTag.toString("hex");
  } finally {
    // Zero secret key clone and derived key in memory
    wipeBuffer(secretBuffer);
    wipeBuffer(derivedKey);
  }

  const payload: EncryptedKeystorePayload = {
    version: CURRENT_VERSION,
    kdf: "pbkdf2",
    kdfParams: {
      iterations: PBKDF2_ITERATIONS,
      salt: salt.toString("hex"),
      hash: "sha256",
    },
    cipher: "aes-256-gcm",
    cipherParams: {
      iv: iv.toString("hex"),
      authTag: authTagHex,
    },
    ciphertext: ciphertextHex,
    publicKey: keypair.publicKey.toBase58(),
  };

  await fsPromises.writeFile(filePath, JSON.stringify(payload, null, 2), {
    mode: 0o600, // Read/write only by owner
  });
}

/**
 * Loads and decrypts a Solana Keypair from an encrypted keystore JSON file.
 *
 * @param filePath - Path to the encrypted keystore file
 * @param passphrase - The passphrase to decrypt the keystore
 * @returns The decrypted Keypair
 */
export async function loadEncryptedKeypair(
  filePath: string,
  passphrase: string,
): Promise<Keypair> {
  let content: string;
  try {
    content = await fsPromises.readFile(filePath, "utf-8");
  } catch (err) {
    throw new KeystoreError(
      `Failed to read keystore file: ${filePath}`,
      filePath,
      err instanceof Error ? err : undefined,
    );
  }

  let payload: EncryptedKeystorePayload;
  try {
    payload = JSON.parse(content);
  } catch (err) {
    throw new KeystoreError(
      `Invalid JSON in keystore file: ${filePath}`,
      filePath,
      err instanceof Error ? err : undefined,
    );
  }

  if (payload.version !== 1 || payload.cipher !== "aes-256-gcm") {
    throw new KeystoreError(
      `Unsupported keystore format or cipher in ${filePath}`,
      filePath,
    );
  }

  const salt = Buffer.from(payload.kdfParams.salt, "hex");
  const iv = Buffer.from(payload.cipherParams.iv, "hex");
  const authTag = Buffer.from(payload.cipherParams.authTag, "hex");
  const ciphertext = Buffer.from(payload.ciphertext, "hex");

  const derivedKey = deriveKey(passphrase, salt);

  let decryptedSecret: Buffer;
  try {
    const decipher = createDecipheriv("aes-256-gcm", derivedKey, iv);
    decipher.setAuthTag(authTag);
    decryptedSecret = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch {
    wipeBuffer(derivedKey);
    throw new KeystoreError(
      `Failed to decrypt keystore at ${filePath}: incorrect passphrase or corrupted file`,
      filePath,
    );
  } finally {
    wipeBuffer(derivedKey);
  }

  try {
    if (decryptedSecret.length !== 64) {
      throw new KeystoreError(
        `Decrypted secret key has invalid length (${decryptedSecret.length} bytes, expected 64)`,
        filePath,
      );
    }
    return Keypair.fromSecretKey(new Uint8Array(decryptedSecret));
  } finally {
    wipeBuffer(decryptedSecret);
  }
}
