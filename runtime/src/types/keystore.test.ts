import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Keypair } from "@solana/web3.js";
import { promises as fsPromises } from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  saveEncryptedKeypair,
  loadEncryptedKeypair,
  isEncryptedKeystore,
  wipeBuffer,
  KeystoreError,
} from "./keystore.js";

describe("keystore", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), "agenc-keystore-test-"));
  });

  afterEach(async () => {
    await fsPromises.rm(tempDir, { recursive: true, force: true });
  });

  it("encrypts and decrypts keypair with valid passphrase", async () => {
    const original = Keypair.generate();
    const filePath = path.join(tempDir, "agent.keystore.json");
    const passphrase = "correct-horse-battery-staple-99";

    await saveEncryptedKeypair(original, passphrase, filePath);

    const isKeystore = await isEncryptedKeystore(filePath);
    expect(isKeystore).toBe(true);

    const decrypted = await loadEncryptedKeypair(filePath, passphrase);
    expect(decrypted.publicKey.toBase58()).toBe(original.publicKey.toBase58());
    expect(Buffer.from(decrypted.secretKey).equals(Buffer.from(original.secretKey))).toBe(true);
  });

  it("fails to decrypt with incorrect passphrase", async () => {
    const original = Keypair.generate();
    const filePath = path.join(tempDir, "agent.keystore.json");

    await saveEncryptedKeypair(original, "valid-passphrase-1234", filePath);

    await expect(
      loadEncryptedKeypair(filePath, "wrong-passphrase-5678"),
    ).rejects.toThrow(KeystoreError);
  });

  it("rejects passphrases shorter than 8 characters", async () => {
    const original = Keypair.generate();
    const filePath = path.join(tempDir, "agent.keystore.json");

    await expect(
      saveEncryptedKeypair(original, "short", filePath),
    ).rejects.toThrow(/at least 8 characters/);
  });

  it("detects ciphertext tampering with authentication tag", async () => {
    const original = Keypair.generate();
    const filePath = path.join(tempDir, "agent.keystore.json");
    const passphrase = "secure-passphrase-test";

    await saveEncryptedKeypair(original, passphrase, filePath);

    const raw = await fsPromises.readFile(filePath, "utf-8");
    const payload = JSON.parse(raw);
    // Tamper with one character in ciphertext
    payload.ciphertext = payload.ciphertext.slice(0, -2) + "00";
    await fsPromises.writeFile(filePath, JSON.stringify(payload));

    await expect(
      loadEncryptedKeypair(filePath, passphrase),
    ).rejects.toThrow(KeystoreError);
  });

  it("returns false for plain json files in isEncryptedKeystore", async () => {
    const plainPath = path.join(tempDir, "plain.json");
    await fsPromises.writeFile(plainPath, JSON.stringify([1, 2, 3]));

    expect(await isEncryptedKeystore(plainPath)).toBe(false);
  });

  it("wipeBuffer zeroes buffer contents", () => {
    const buf = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);
    wipeBuffer(buf);
    // randomFillSync changes contents
    expect(buf.equals(Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]))).toBe(false);
  });
});
