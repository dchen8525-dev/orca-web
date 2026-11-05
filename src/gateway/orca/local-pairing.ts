// Dev-only: read the pairing material a running desktop Orca already persisted on this machine.
// Never log or commit the returned token; production binds through the pairing offer instead.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

type RuntimeFile = { transports?: { kind: string; endpoint: string }[] }
type DeviceRow = {
  deviceId: string
  token: string
  name?: string
  scope: string
  lastSeenAt?: number
}
type KeypairFile = { publicKeyB64: string }

export type LocalOrcaPairing = {
  endpoint: string
  deviceToken: string
  hostPublicKeyB64: string
  deviceId: string
  deviceName: string
}

export function readLocalOrcaPairing(
  userDataPath = join(process.env.APPDATA ?? '', 'orca')
): LocalOrcaPairing {
  const runtime = readJson<RuntimeFile>(join(userDataPath, 'orca-runtime.json'))
  const devices = readJson<DeviceRow[]>(join(userDataPath, 'orca-devices.json'))
  const keypair = readJson<KeypairFile>(join(userDataPath, 'orca-e2ee-keypair.json'))

  const websocket = runtime.transports?.find((transport) => transport.kind === 'websocket')
  if (!websocket) {
    throw new Error('Desktop Orca is not listening on a WebSocket transport. Is it running?')
  }
  const mobile = devices
    .filter((device) => device.scope === 'mobile')
    .sort((left, right) => (right.lastSeenAt ?? 0) - (left.lastSeenAt ?? 0))[0]
  if (!mobile) {
    throw new Error('No mobile-scope paired device in orca-devices.json; pair a phone once first.')
  }

  return {
    // 0.0.0.0 is a bind address; loopback is where this machine reaches it.
    endpoint: websocket.endpoint.replace('://0.0.0.0:', '://127.0.0.1:'),
    deviceToken: mobile.token,
    hostPublicKeyB64: keypair.publicKeyB64,
    deviceId: mobile.deviceId,
    deviceName: mobile.name ?? mobile.deviceId
  }
}

function readJson<T>(path: string): T {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as T
  } catch {
    throw new Error(`Could not read ${path}. Start desktop Orca and pair a device first.`)
  }
}
