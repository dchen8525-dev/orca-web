// Gateway configuration: file (ORCA_WEB_CONFIG) + env overrides. The device token is a bearer
// credential — keep it out of git and out of logs.
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { homedir, hostname } from 'node:os'
import type { OrcaConnectionOptions } from '../../../src/gateway/orca/rpc-client.ts'
import { readLocalOrcaPairing } from '../../../src/gateway/orca/local-pairing.ts'

export type GatewayConfig = {
  serverUrl: string | null
  gatewayKey: string | null
  gatewayId: string
  adminPort: number
  configPath: string | null
  orca: OrcaConnectionOptions | null
  pairedVia: 'config' | 'local-orca'
}

type FileShape = {
  serverUrl?: string
  gatewayKey?: string
  gatewayId?: string
  admin?: { port?: number }
  orca?: {
    endpoint?: string
    deviceToken?: string
    hostPublicKeyB64?: string
  }
}

// An unconfigured gateway is a valid state: it runs the loopback admin page so the
// user can fill in the hub address, key and pairing code. Starting the hub and Orca
// links is main.ts's call once those values exist.
export function loadConfig(options: { configPath?: string; localOrca?: boolean }): GatewayConfig {
  const configPath = resolveConfigPath(options.configPath)
  // A config that does not exist yet is the fresh-install case, not an error: the
  // gateway starts unconfigured and the admin page creates the file on first save.
  const file = configPath && existsSync(configPath) ? readJson<FileShape>(configPath) : {}
  return {
    serverUrl: text(process.env.ORCA_WEB_SERVER_URL) ?? text(file.serverUrl),
    gatewayKey: text(process.env.ORCA_WEB_GATEWAY_KEY) ?? text(file.gatewayKey),
    gatewayId: process.env.ORCA_WEB_GATEWAY_ID ?? text(file.gatewayId) ?? hostname(),
    adminPort:
      readNumber(process.env.ORCA_WEB_ADMIN_PORT) ?? readNumber(file.admin?.port) ?? 8790,
    configPath,
    orca: options.localOrca ? localOrcaOptions() : fileOrcaOptions(file),
    pairedVia: options.localOrca ? 'local-orca' : 'config'
  }
}

function resolveConfigPath(cliPath?: string): string | null {
  if (cliPath) {
    return cliPath
  }
  const fromEnv = process.env.ORCA_WEB_CONFIG
  if (fromEnv) {
    return fromEnv
  }
  // A release exe double-clicked with no arguments: fall back to the file the
  // bootstrap install uses, so the admin page has somewhere to persist edits.
  // Node (npm run gateway) keeps the old "no path, nothing persisted" dev behavior.
  if (process.platform === 'win32' && !isNodeRuntime()) {
    return join(appDataDir(), 'orca-web', 'gateway.json')
  }
  return null
}

function appDataDir(): string {
  return process.env.APPDATA ?? join(homedir(), 'AppData', 'Roaming')
}

function isNodeRuntime(): boolean {
  return /^node(\.exe)?$/i.test(basename(process.execPath))
}

// The admin page edits the file; env vars already present at startup would shadow it on restart.
export function describeConfigSource(config: GatewayConfig): string | null {
  if (config.pairedVia === 'local-orca') {
    return '--local-orca：配对材料读自桌面 Orca 本地文件，本页写入与表内更新不会生效。去掉该参数重启即可。'
  }
  if (process.env.ORCA_WEB_SERVER_URL || process.env.ORCA_WEB_GATEWAY_KEY) {
    return 'ORCA_WEB_* 环境变量优先于配置文件：本页写入会被覆盖。去掉环境变量重启即可。'
  }
  return null
}

export function describeConfig(config: GatewayConfig): string {
  return [
    `server        ${config.serverUrl ?? '(未配置)'}`,
    `gateway id    ${config.gatewayId}`,
    `orca          ${config.orca?.endpoint ?? '(未配对)'}`
  ].join('\n')
}

export type ConfigUpdates = {
  serverUrl?: string
  gatewayKey?: string
  orca?: { endpoint: string; deviceToken: string; hostPublicKeyB64: string }
}

/** Merges the update in memory and, with a `--config` file, persists the effective values. */
export function applyConfigUpdate(
  current: GatewayConfig,
  updates: ConfigUpdates
): GatewayConfig {
  if (!current.configPath) {
    throw new ConfigError('gateway 没有用 --config 启动，配置无处落盘')
  }
  const file = existsSync(current.configPath) ? readJson<FileShape>(current.configPath) : {}
  const next: FileShape = {
    ...file,
    ...(updates.serverUrl === undefined ? {} : { serverUrl: updates.serverUrl }),
    ...(updates.gatewayKey === undefined ? {} : { gatewayKey: updates.gatewayKey }),
    ...(updates.orca === undefined
      ? {}
      : {
          orca: {
            ...file.orca,
            endpoint: updates.orca.endpoint,
            deviceToken: updates.orca.deviceToken,
            hostPublicKeyB64: updates.orca.hostPublicKeyB64
          }
        })
  }
  writeJson(current.configPath, next)
  return loadConfig({ configPath: current.configPath })
}

export class ConfigError extends Error {}

// Pairing needs all three parts; a partially-filled file (or none at all) just means
// "not paired yet", which the admin page shows and can fix.
function fileOrcaOptions(file: FileShape): OrcaConnectionOptions | null {
  const endpoint = text(process.env.ORCA_WEB_ORCA_ENDPOINT) ?? text(file.orca?.endpoint)
  const deviceToken = text(process.env.ORCA_WEB_ORCA_DEVICE_TOKEN) ?? text(file.orca?.deviceToken)
  const hostPublicKeyB64 = text(process.env.ORCA_WEB_ORCA_HOST_KEY) ?? text(file.orca?.hostPublicKeyB64)
  if (!endpoint || !deviceToken || !hostPublicKeyB64) {
    return null
  }
  return { endpoint, deviceToken, hostPublicKeyB64 }
}

// Dev-only: reuse the pairing material desktop Orca persisted on this machine.
function localOrcaOptions(): OrcaConnectionOptions {
  const path = process.env.ORCA_WEB_LOCAL_ORCA_DIR
  const pairing = path ? readLocalOrcaPairing(path) : readLocalOrcaPairing()
  return {
    endpoint: pairing.endpoint,
    deviceToken: pairing.deviceToken,
    hostPublicKeyB64: pairing.hostPublicKeyB64
  }
}

export function normalizeHubUrl(value: string): string {
  let parsed: URL
  try {
    parsed = new URL(value.trim())
  } catch {
    throw new ConfigError(`serverUrl 无法解析: ${value}`)
  }
  if (parsed.protocol !== 'ws:' && parsed.protocol !== 'wss:') {
    throw new ConfigError('serverUrl 必须是 ws:// 或 wss:// 地址')
  }
  const path = parsed.pathname.replace(/\/+$/, '')
  return `${parsed.protocol}//${parsed.host}${path === '/gateway' ? path : `${path}/gateway`}`
}

export type PairingOffer = {
  v: number
  endpoint: string
  deviceToken: string
  publicKeyB64: string
  scope?: string
  pairedDeviceId?: string
}

/** Accepts the deep link or the bare base64 code; the mobile app does the same. */
export function decodePairingCode(input: string): PairingOffer {
  const trimmed = input.trim()
  if (!trimmed) {
    throw new ConfigError('配对码为空')
  }
  // The parameter separator is "?code=" or "&code="; matching plain "code=" would let the
  // same 5 chars appear inside a bare base64 payload and cut it mid-way.
  const separator = /[?&]code=/.exec(trimmed)
  const prefix = !separator && trimmed.startsWith('code=') ? 5 : 0
  const candidate = separator ? trimmed.slice(separator.index + separator[0].length) : trimmed.slice(prefix)
  const code = /^[A-Za-z0-9_-]+/.exec(candidate)?.[0]
  if (!code) {
    throw new ConfigError('配对码里没有可解码的 base64 内容')
  }
  let offer: PairingOffer
  try {
    offer = JSON.parse(Buffer.from(code.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'))
  } catch (error) {
    throw new ConfigError(`配对码无法解码: ${(error as Error).message}`)
  }
  if (typeof offer.deviceToken !== 'string' || !offer.deviceToken) {
    throw new ConfigError('配对码缺少 deviceToken')
  }
  if (typeof offer.publicKeyB64 !== 'string' || !offer.publicKeyB64) {
    throw new ConfigError('配对码缺少 publicKeyB64')
  }
  if (offer.scope !== undefined && offer.scope !== 'mobile') {
    throw new ConfigError(`配对码 scope 是 ${offer.scope}，需要 mobile`)
  }
  return offer
}

/** Same-machine gateway: the advertised LAN endpoint is less stable than loopback. */
export function loopbackEndpoint(endpoint: string): string {
  try {
    const parsed = new URL(endpoint)
    return `ws://127.0.0.1:${parsed.port}${parsed.pathname === '/' ? '' : parsed.pathname}`
  } catch {
    throw new ConfigError(`配对码 endpoint 无法解析: ${endpoint}`)
  }
}

function readNumber(value: string | number | undefined): number | undefined {
  const parsed = typeof value === 'number' ? value : Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

function text(value: string | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function readJson<T>(path: string): T {
  try {
    // Windows PowerShell 5.1 writes `Set-Content -Encoding UTF8` with a BOM, and the
    // bootstrap script creates this file that way; JSON.parse rejects it.
    const raw = readFileSync(path, 'utf8')
    return JSON.parse(raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw) as T
  } catch (error) {
    throw new ConfigError(`Could not read config ${path}: ${(error as Error).message}`)
  }
}

function writeJson(path: string, value: unknown): void {
  try {
    mkdirSync(dirname(path), { recursive: true })
    const temp = `${path}.tmp`
    writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 })
    renameSync(temp, path)
  } catch (error) {
    throw new ConfigError(`Could not write config: ${(error as Error).message}`)
  }
}
