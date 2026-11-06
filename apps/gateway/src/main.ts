// Entry point: gateway runs beside desktop Orca on the home machine and dials the VPS hub.
// A loopback admin page lets the user re-pair or move hubs without editing files by hand.
import { existsSync, readFileSync } from 'node:fs'
import {
  applyConfigUpdate,
  describeConfig,
  describeConfigSource,
  loadConfig,
  type GatewayConfig
} from './config.ts'
import { LocalAdminServer } from './local-admin-server.ts'
import { checkForUpdate, currentVersion, installedExePath, stageSelfUpdate } from './self-update.ts'
import { HubLink } from './hub-link.ts'
import { OrcaBridge } from './orca-bridge.ts'

const args = parseArgs(process.argv.slice(2))
let config = loadConfig({ configPath: args.config, localOrca: args.localOrca })

log(`orca-web gateway starting`)
log(describeConfig(config))

let runtime = createRuntime(config)
startRuntime(runtime)

const admin = new LocalAdminServer({
  port: config.adminPort,
  updateStatus: installedExePath() ? () => checkForUpdate() : undefined,
  applyUpdate: installedExePath()
    ? async () => {
        const message = await stageSelfUpdate()
        // Let the response flush, then go down so gateway-loop.cmd restarts from the
        // staged exe; the rename is already done, so nothing else can undo it.
        setTimeout(() => process.exit(0), 1000).unref()
        return message
      }
    : undefined,
  status: () => ({
    gatewayId: config.gatewayId,
    configPath: config.configPath,
    pairedVia: config.pairedVia,
    hubUrl: config.serverUrl ?? '',
    hubKey: config.gatewayKey ?? '',
    hubConnected: runtime.hub?.isConnected() ?? false,
    orcaState: runtime.bridge?.getState() ?? 'disconnected',
    orcaDescriptor: runtime.bridge?.getDescriptor() ?? {},
    configNote: describeConfigSource(config),
    version: currentVersion(),
    canUpdate: installedExePath() !== null
  }),
  readFile: () => {
    try {
      if (!config.configPath || !existsSync(config.configPath)) {
        return null
      }
      return readFileSync(config.configPath, 'utf8')
    } catch {
      return null
    }
  },
  // Validation errors must not kill the process; a swap failure is a broken state, so the
  // process exits and the restart loop brings it up on the already-persisted config.
  apply: async (updates) => {
    const next = applyConfigUpdate(config, updates)
    try {
      await swapRuntime(next)
    } catch (error) {
      log(`swap failed, restarting to recover: ${(error as Error).message}`)
      setTimeout(() => process.exit(3), 500).unref()
      throw error
    }
    config = next
    log(describeConfig(config))
    return '已写入新配置，网关正在用新配置重连。'
  }
})
admin.start()

let shuttingDown = false
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    if (shuttingDown) {
      return
    }
    shuttingDown = true
    log(`${signal}: shutting down`)
    admin.stop()
    void stopRuntime(runtime).finally(() => process.exit(0))
    // A hung socket must not keep the process alive.
    setTimeout(() => process.exit(0), 3_000).unref()
  })
}

// Both links are optional: a fresh install starts with an empty config and exists only
// to serve the admin page until the user fills it in.
type Runtime = { bridge: OrcaBridge | null; hub: HubLink | null }

function createRuntime(next: GatewayConfig): Runtime {
  const bridge = next.orca ? new OrcaBridge(next.orca) : null
  bridge?.onEvent((event) => {
    if (event.kind === 'state') {
      log(`orca ${event.state}${event.message ? `: ${event.message}` : ''}`)
    }
  })
  const hub =
    bridge && next.serverUrl && next.gatewayKey
      ? new HubLink({
          url: next.serverUrl,
          key: next.gatewayKey,
          gatewayId: next.gatewayId,
          bridge,
          log
        })
      : null
  return { bridge, hub }
}

function startRuntime(next: Runtime): void {
  next.bridge?.start()
  next.hub?.start()
  if (!next.hub) {
    log('hub 未配置：在本机管理页填写服务器地址与 gatewayKey 后会自动重连')
  }
}

async function stopRuntime(next: Runtime): Promise<void> {
  next.hub?.stop()
  await Promise.race([
    next.bridge?.stop() ?? Promise.resolve(),
    new Promise((resolve) => setTimeout(resolve, 5_000).unref())
  ])
}

async function swapRuntime(next: GatewayConfig): Promise<void> {
  const replacement = createRuntime(next)
  await stopRuntime(runtime)
  runtime = replacement
  startRuntime(runtime)
}

function parseArgs(argv: string[]): { config?: string; localOrca: boolean } {
  const parsed: { config?: string; localOrca: boolean } = { localOrca: false }
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index]
    if (arg === '--config') {
      parsed.config = argv[++index]
      if (!parsed.config) {
        throw new Error('--config needs a path')
      }
    } else if (arg === '--local-orca') {
      parsed.localOrca = true
    }
  }
  return parsed
}

function log(message: string): void {
  console.log(`${new Date().toISOString()} ${message}`)
}
