// Server configuration: ORCA_WEB_SERVER_CONFIG file + env overrides.
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

export type ServerConfig = {
  host: string
  port: number
  /** Browser-facing origin, e.g. https://orca.example.com. Also the WS Origin check. */
  publicOrigin?: string
  gatewayKey: string
  passwordHash: string
  sessionTtlMs: number
  /** Where session hashes persist; without it every restart logs the browser out. */
  sessionStorePath?: string
  staticDir?: string
  /** Trust X-Forwarded-For for login rate limiting (set when behind Caddy/nginx). */
  trustProxy: boolean
  /** Secure cookies follow publicOrigin unless explicitly set. */
  cookieSecure: boolean
}

type FileShape = Partial<Omit<ServerConfig, 'sessionTtlMs'>> & { sessionTtlDays?: number }

const DEFAULT_CONFIG_PATH = 'apps/server/config.json'

export function loadServerConfig(path?: string): ServerConfig {
  const configPath = path ?? process.env.ORCA_WEB_SERVER_CONFIG ?? DEFAULT_CONFIG_PATH
  const file = existsSync(configPath) ? readJson<FileShape>(resolve(configPath)) : {}
  const publicOrigin = process.env.ORCA_WEB_PUBLIC_ORIGIN ?? file.publicOrigin
  const sessionTtlDays = Number(process.env.ORCA_WEB_SESSION_TTL_DAYS ?? file.sessionTtlDays ?? 30)

  return {
    host: process.env.ORCA_WEB_HOST ?? file.host ?? '127.0.0.1',
    port: Number(process.env.ORCA_WEB_PORT ?? file.port ?? 8788),
    ...(publicOrigin ? { publicOrigin } : {}),
    gatewayKey: requireOne(process.env.ORCA_WEB_GATEWAY_KEY ?? file.gatewayKey, 'gatewayKey'),
    passwordHash: requireOne(process.env.ORCA_WEB_PASSWORD_HASH ?? file.passwordHash, 'passwordHash'),
    sessionTtlMs: sessionTtlDays * 24 * 60 * 60 * 1000,
    ...(process.env.ORCA_WEB_SESSION_STORE ?? file.sessionStorePath
      ? { sessionStorePath: process.env.ORCA_WEB_SESSION_STORE ?? file.sessionStorePath }
      : {}),
    ...(process.env.ORCA_WEB_STATIC_DIR ?? file.staticDir
      ? { staticDir: process.env.ORCA_WEB_STATIC_DIR ?? file.staticDir }
      : {}),
    trustProxy: envFlag('ORCA_WEB_TRUST_PROXY', file.trustProxy ?? false),
    cookieSecure: envFlag(
      'ORCA_WEB_COOKIE_SECURE',
      file.cookieSecure ?? publicOrigin?.startsWith('https://') === true
    )
  }
}

function envFlag(name: string, fallback: boolean): boolean {
  const value = process.env[name]
  if (value === undefined) {
    return fallback
  }
  return value === '1' || value.toLowerCase() === 'true'
}

function requireOne(value: string | undefined, label: string): string {
  if (!value) {
    throw new Error(`Missing ${label}: set it in the server config file or the environment`)
  }
  return value
}

function readJson<T>(path: string): T {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as T
  } catch (error) {
    throw new Error(`Could not read config ${path}: ${(error as Error).message}`)
  }
}
