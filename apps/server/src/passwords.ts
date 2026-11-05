// scrypt password hashing without extra dependencies. Format: scrypt$N$r$p$salt$hash (base64).
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

const N = 16_384
const R = 8
const P = 1
const KEY_LENGTH = 32

export function hashPassword(password: string): string {
  const salt = randomBytes(16)
  const hash = scryptSync(password, salt, KEY_LENGTH, { N, r: R, p: P })
  return ['scrypt', N, R, P, salt.toString('base64'), hash.toString('base64')].join('$')
}

export function verifyPassword(password: string, encoded: string): boolean {
  const parts = encoded.split('$')
  if (parts.length !== 6 || parts[0] !== 'scrypt') {
    return false
  }
  const [, n, r, p, saltB64, hashB64] = parts
  const expected = Buffer.from(hashB64!, 'base64')
  if (expected.length !== KEY_LENGTH) {
    return false
  }
  const actual = scryptSync(password, Buffer.from(saltB64!, 'base64'), KEY_LENGTH, {
    N: Number(n),
    r: Number(r),
    p: Number(p)
  })
  return timingSafeEqual(actual, expected)
}
