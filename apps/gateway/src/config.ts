// Gateway configuration: file (ORCA_WEB_CONFIG) + env overrides. The device token is a bearer
// credential — keep it out of git and out of logs.
import { readFileSync } from 'node:fs'
import { hostname } from 'node:os'
import type { OrcaConnectionOptions } from '../../../src/gateway/orca/rpc-client.ts'
import { readLocalOrcaPairing } from '../../../src/gateway/orca/local-pairing.ts'

export type GatewayConfig = {
  serverUrl: string
  gatewayKey: string
  gatewayId: string
  orca: OrcaConnectionOptions
}

type FileShape = {
  serverUrl?: string
  gatewayKey?: string
  gatewayId?: string
  orca?: {
    endpoint?: string
    deviceToken?: string
    hostPublicKeyB64?: string
  }
}

export function loadConfig(options: { configPath?: string; localOrca?: boolean }): GatewayConfig {
  const file = options.configPath ? readJson<FileShape>(options.configPath) : {}
  const orca = options.localOrca ? localOrcaOptions() : fileOrcaOptions(file)

  return {
    serverUrl: requireOne(process.env.ORCA_WEB_SERVER_URL ?? file.serverUrl, 'serverUrl'),
    gatewayKey: requireOne(process.env.ORCA_WEB_GATEWAY_KEY ?? file.gatewayKey, 'gatewayKey'),
    gatewayId: process.env.ORCA_WEB_GATEWAY_ID ?? file.gatewayId ?? hostname(),
    orca
  }
}

export function describeConfig(config: GatewayConfig): string {
  return [
    `server        ${config.serverUrl}`,
    `gateway id    ${config.gatewayId}`,
    `orca          ${config.orca.endpoint}`
  ].join('\n')
}

function fileOrcaOptions(file: FileShape): OrcaConnectionOptions {
  const endpoint = process.env.ORCA_WEB_ORCA_ENDPOINT ?? file.orca?.endpoint
  const deviceToken = process.env.ORCA_WEB_ORCA_DEVICE_TOKEN ?? file.orca?.deviceToken
  const hostPublicKeyB64 = process.env.ORCA_WEB_ORCA_HOST_KEY ?? file.orca?.hostPublicKeyB64
  return {
    endpoint: requireOne(endpoint, 'orca.endpoint'),
    deviceToken: requireOne(deviceToken, 'orca.deviceToken'),
    hostPublicKeyB64: requireOne(hostPublicKeyB64, 'orca.hostPublicKeyB64')
  }
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

function requireOne(value: string | undefined, label: string): string {
  if (!value) {
    throw new Error(`Missing ${label}: set it in ORCA_WEB_CONFIG or the environment`)
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
