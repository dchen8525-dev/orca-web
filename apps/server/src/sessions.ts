// Opaque session tokens stored by hash: a memory dump never yields a usable cookie value.
import { createHash, randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

export const SESSION_COOKIE = 'orca_web_session'

export type SessionRecord = {
  createdAt: number
  lastSeenAt: number
  expiresAt: number
}

export class SessionStore {
  private readonly ttlMs: number
  private readonly storePath: string | undefined
  private readonly records = new Map<string, SessionRecord>()
  private readonly sweepTimer: ReturnType<typeof setInterval>
  private saveTimer: ReturnType<typeof setTimeout> | null = null

  /** With `storePath`, logins survive a server restart; hashes only, never tokens. */
  constructor(ttlMs: number, storePath?: string) {
    this.ttlMs = ttlMs
    this.storePath = storePath
    this.load()
    this.sweepTimer = setInterval(() => this.sweep(), 10 * 60_000)
    this.sweepTimer.unref?.()
  }

  create(): { token: string; record: SessionRecord } {
    const token = randomBytes(32).toString('base64url')
    const now = Date.now()
    const record: SessionRecord = {
      createdAt: now,
      lastSeenAt: now,
      expiresAt: now + this.ttlMs
    }
    this.records.set(keyOf(token), record)
    this.scheduleSave()
    return { token, record }
  }

  /** Rolling expiry: every authenticated use extends the session. */
  touch(token: string): SessionRecord | null {
    const key = keyOf(token)
    const record = this.records.get(key)
    if (!record) {
      return null
    }
    const now = Date.now()
    if (now >= record.expiresAt) {
      this.records.delete(key)
      return null
    }
    record.lastSeenAt = now
    record.expiresAt = now + this.ttlMs
    this.scheduleSave()
    return record
  }

  /** Re-anchor the rolling window; the browser cookie then needs a matching Max-Age. */
  refresh(token: string): SessionRecord | null {
    const key = keyOf(token)
    const record = this.records.get(key)
    if (!record) {
      return null
    }
    const now = Date.now()
    if (now >= record.expiresAt) {
      this.records.delete(key)
      return null
    }
    record.createdAt = now
    record.lastSeenAt = now
    record.expiresAt = now + this.ttlMs
    this.scheduleSave()
    return record
  }

  destroy(token: string): void {
    this.records.delete(keyOf(token))
    this.scheduleSave()
  }

  sweep(now = Date.now()): void {
    for (const [key, record] of this.records) {
      if (now >= record.expiresAt) {
        this.records.delete(key)
      }
    }
    this.scheduleSave()
  }

  private load(): void {
    if (!this.storePath || !existsSync(this.storePath)) {
      return
    }
    try {
      const stored = JSON.parse(readFileSync(this.storePath, 'utf8')) as Record<string, SessionRecord>
      const now = Date.now()
      for (const [key, record] of Object.entries(stored)) {
        if (record && typeof record.expiresAt === 'number' && record.expiresAt > now) {
          this.records.set(key, record)
        }
      }
    } catch {
      // A corrupt file costs one login, never startup.
    }
  }

  private scheduleSave(): void {
    if (!this.storePath || this.saveTimer) {
      return
    }
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null
      this.save()
    }, 5_000)
    this.saveTimer.unref?.()
  }

  private save(): void {
    if (!this.storePath) {
      return
    }
    try {
      mkdirSync(dirname(this.storePath), { recursive: true })
      const temp = `${this.storePath}.tmp`
      writeFileSync(temp, JSON.stringify(Object.fromEntries(this.records)), { mode: 0o600 })
      renameSync(temp, this.storePath)
    } catch {
      // Best effort: the in-memory store stays authoritative.
    }
  }
}

export function readCookie(header: string | undefined, name: string): string | null {
  if (!header) {
    return null
  }
  for (const part of header.split(';')) {
    const index = part.indexOf('=')
    if (index === -1) {
      continue
    }
    if (part.slice(0, index).trim() === name) {
      return decodeURIComponent(part.slice(index + 1).trim())
    }
  }
  return null
}

export function sessionCookie(token: string, options: { secure: boolean; ttlMs: number }): string {
  const attributes = [
    `${SESSION_COOKIE}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${Math.floor(options.ttlMs / 1000)}`
  ]
  if (options.secure) {
    attributes.push('Secure')
  }
  return attributes.join('; ')
}

export function clearedSessionCookie(options: { secure: boolean }): string {
  const attributes = [`${SESSION_COOKIE}=`, 'Path=/', 'HttpOnly', 'SameSite=Strict', 'Max-Age=0']
  if (options.secure) {
    attributes.push('Secure')
  }
  return attributes.join('; ')
}

function keyOf(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}
