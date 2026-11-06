/**
 * End-to-End Encryption (E2EE) Module
 * Implements AES-GCM 256-bit encryption and PBKDF2 key derivation using the Web Crypto API.
 */

const DEFAULT_SALT = new Uint8Array([23, 89, 142, 65, 201, 114, 9, 78, 155, 33, 80, 222, 14, 60, 99, 187]);
const APP_DEFAULT_SECRET = "THPT_HTP_SPORTS_2026_SECURE_KEY";

const enc = new TextEncoder();
const dec = new TextDecoder();

async function deriveKey(passphrase: string, salt: Uint8Array = DEFAULT_SALT): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypt a plaintext string using AES-GCM
 */
export async function encryptText(plaintext: string, secret: string = APP_DEFAULT_SECRET): Promise<string> {
  if (!plaintext) return "";
  try {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(secret);
    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      enc.encode(plaintext)
    );

    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.length);

    let binary = "";
    const len = combined.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(combined[i]);
    }
    return "e2ee:" + btoa(binary);
  } catch (err) {
    console.error("Encryption error:", err);
    return plaintext;
  }
}

/**
 * Decrypt an AES-GCM encrypted string
 */
export async function decryptText(encryptedPayload: string, secret: string = APP_DEFAULT_SECRET): Promise<string> {
  if (!encryptedPayload) return "";
  if (!encryptedPayload.startsWith("e2ee:")) return encryptedPayload;

  try {
    const rawB64 = encryptedPayload.replace("e2ee:", "");
    const binary = atob(rawB64);
    const combined = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      combined[i] = binary.charCodeAt(i);
    }

    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    const key = await deriveKey(secret);

    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext
    );

    return dec.decode(decrypted);
  } catch (err) {
    console.warn("Decryption failed (possibly wrong key or corrupted):", err);
    return "[Dữ liệu đã mã hóa]";
  }
}

/**
 * Mask sensitive string for safe UI presentation
 */
export function maskSensitive(value: string): string {
  if (!value) return "";
  if (value.startsWith("e2ee:")) return "•••••••••••• (Mã hóa E2EE)";
  if (value.length <= 4) return "••••";
  const start = value.slice(0, 3);
  const end = value.slice(-3);
  const stars = "•".repeat(Math.max(4, value.length - 6));
  return `${start}${stars}${end}`;
}

/**
 * Encrypt full JSON payload with custom password
 */
export async function encryptFullDataPackage(data: unknown, password: string): Promise<string> {
  const jsonStr = JSON.stringify(data);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(jsonStr)
  );

  const payload = {
    version: 1,
    algorithm: "AES-256-GCM",
    kdf: "PBKDF2-SHA256-100K",
    salt: Array.from(salt),
    iv: Array.from(iv),
    data: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
    created: new Date().toISOString(),
  };

  return JSON.stringify(payload, null, 2);
}

/**
 * Decrypt full JSON payload with custom password
 */
export async function decryptFullDataPackage(encryptedJson: string, password: string): Promise<unknown> {
  const parsed = JSON.parse(encryptedJson);
  if (!parsed.salt || !parsed.iv || !parsed.data) {
    throw new Error("Tệp không đúng định dạng mã hóa E2EE hợp lệ.");
  }

  const salt = new Uint8Array(parsed.salt);
  const iv = new Uint8Array(parsed.iv);
  const key = await deriveKey(password, salt);

  const binary = atob(parsed.data);
  const ciphertext = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    ciphertext[i] = binary.charCodeAt(i);
  }

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );

  return JSON.parse(dec.decode(decrypted));
}
