import { randomBytes, createCipheriv, createDecipheriv, createHash, scryptSync } from "crypto";

function deriveKey(): Buffer {
  const raw = process.env.RECOVERY_CODES_ENCRYPTION_KEY || "dev-recovery-codes-key-do-not-use-in-prod";
  return scryptSync(raw, "recovery-codes-salt", 32);
}

const ALGORITHM = "aes-256-gcm";
const KEY = deriveKey();

export function generateRecoveryCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < 10; i++) {
    const buf = randomBytes(6);
    const hex = buf.toString("hex").toUpperCase();
    codes.push(`${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}`);
  }
  return codes;
}

export function encryptRecoveryCodes(codes: string[]): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(codes), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptRecoveryCodes(encrypted: string): string[] {
  const [ivHex, tagHex, dataHex] = encrypted.split(":");
  const decipher = createDecipheriv(ALGORITHM, KEY, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]);
  return JSON.parse(decrypted.toString("utf8"));
}

export function verifyRecoveryCode(encrypted: string, input: string): { codes: string[] | null; remaining: string[] | null } {
  const codes = decryptRecoveryCodes(encrypted);
  const normalized = input.trim().toUpperCase();
  const idx = codes.findIndex(c => c === normalized);
  if (idx === -1) return { codes: null, remaining: null };
  const remaining = codes.filter((_, i) => i !== idx);
  return { codes: remaining, remaining: remaining.length === 0 ? [] : remaining };
}
