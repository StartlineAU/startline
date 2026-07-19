import { randomBytes, createCipheriv, createDecipheriv, createHash } from "crypto";

const ALGORITHM = "aes-256-gcm";
const CODE_COUNT = 10;
const KEY = (() => {
  const envKey = process.env.RECOVERY_CODES_ENCRYPTION_KEY;
  if (envKey) return createHash("sha256").update(envKey).digest();
  return createHash("sha256").update("startline-recovery-codes-dev-only").digest();
})();

function formatCode(bytes: Buffer): string {
  const part = (n: number) => bytes.readUInt16BE(n * 2).toString(16).toUpperCase().padStart(4, "0");
  return `${part(0)}-${part(1)}-${part(2)}`;
}

export function generateRecoveryCodes(): string[] {
  const codes: string[] = [];
  const seen = new Set<string>();
  while (codes.length < CODE_COUNT) {
    const code = formatCode(randomBytes(6));
    if (!seen.has(code)) { seen.add(code); codes.push(code); }
  }
  return codes;
}

export function encryptRecoveryCodes(codes: string[]): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(codes), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${encrypted.toString("base64")}`;
}

export function decryptRecoveryCodes(encoded: string): string[] {
  const [ivB64, tagB64, dataB64] = encoded.split(".");
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const encrypted = Buffer.from(dataB64, "base64");
  const decipher = createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(tag);
  const decrypted = decipher.update(encrypted);
  return JSON.parse(Buffer.concat([decrypted, decipher.final()]).toString("utf8"));
}

export function verifyRecoveryCode(encoded: string, input: string): string[] | null {
  const normalized = input.toUpperCase().replace(/[\s-]/g, "");
  const formatted = normalized.length === 12
    ? `${normalized.slice(0, 4)}-${normalized.slice(4, 8)}-${normalized.slice(8, 12)}`
    : input.toUpperCase();
  const codes = decryptRecoveryCodes(encoded);
  const idx = codes.indexOf(formatted);
  if (idx === -1) return null;
  const remaining = codes.filter((_, i) => i !== idx);
  return remaining.length > 0 ? remaining : [];
}
