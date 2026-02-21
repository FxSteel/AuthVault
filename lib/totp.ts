/**
 * totp.ts — TOTP Core (RFC 6238) + AES-256-GCM encryption
 */

// ── TOTP ─────────────────────────────────────────────────────────────────────

function base32Decode(input: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  input = input.replace(/=+$/, '').toUpperCase().replace(/\s/g, '')
  let bits = 0, value = 0
  const output = new Uint8Array(Math.floor(input.length * 5 / 8))
  let index = 0
  for (let i = 0; i < input.length; i++) {
    const c = alphabet.indexOf(input[i])
    if (c === -1) throw new Error('Invalid Base32 character: ' + input[i])
    value = (value << 5) | c
    bits += 5
    if (bits >= 8) {
      bits -= 8
      output[index++] = (value >> bits) & 0xFF
    }
  }
  return output
}

export async function generateTOTP(secret: string, digits = 6, period = 30): Promise<string> {
  const key = base32Decode(secret)
  const counter = Math.floor(Date.now() / 1000 / period)
  const msg = new ArrayBuffer(8)
  const view = new DataView(msg)
  view.setUint32(4, counter, false)
  const cryptoKey = await crypto.subtle.importKey(
    'raw', key.buffer as ArrayBuffer, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, msg)
  const h = new Uint8Array(sig)
  const offset = h[h.length - 1] & 0x0F
  const code =
    ((h[offset] & 0x7F) << 24) |
    (h[offset + 1] << 16) |
    (h[offset + 2] << 8) |
    h[offset + 3]
  return String(code % Math.pow(10, digits)).padStart(digits, '0')
}

export function getTimeRemaining(period = 30): number {
  return period - (Math.floor(Date.now() / 1000) % period)
}

// ── Encryption (AES-256-GCM) ──────────────────────────────────────────────────
// Secrets are encrypted in the browser using the user's email as key material.
// Supabase only ever stores ciphertext — never plaintext secrets.

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt.buffer as ArrayBuffer, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function encryptSecret(secret: string, userEmail: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(userEmail, salt)
  const enc = new TextEncoder()
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(secret)
  )
  // Pack: salt(16) + iv(12) + ciphertext → base64
  const combined = new Uint8Array(16 + 12 + ciphertext.byteLength)
  combined.set(salt, 0)
  combined.set(iv, 16)
  combined.set(new Uint8Array(ciphertext), 28)
  return btoa(String.fromCharCode(...combined))
}

export async function decryptSecret(encrypted: string, userEmail: string): Promise<string> {
  const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0))
  const salt = combined.slice(0, 16)
  const iv = combined.slice(16, 28)
  const ciphertext = combined.slice(28)
  const key = await deriveKey(userEmail, salt)
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
  return new TextDecoder().decode(plaintext)
}
