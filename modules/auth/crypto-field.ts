import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function keyBytes(hexKey: string): Buffer {
  const buf = Buffer.from(hexKey, "hex");
  if (buf.length === 32) return buf;
  return createHash("sha256").update(hexKey).digest();
}

export function encryptField(plain: string, hexKey: string): string {
  const key = keyBytes(hexKey);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptField(payload: string, hexKey: string): string {
  const key = keyBytes(hexKey);
  const buf = Buffer.from(payload, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}

export function emailHash(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 16);
}
