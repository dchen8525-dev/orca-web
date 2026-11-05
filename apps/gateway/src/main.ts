// Entry point: gateway runs beside desktop Orca on the home machine and dials the VPS hub.
import { describeConfig, loadConfig } from './config.ts'
import { HubLink } from './hub-link.ts'
import { OrcaBridge } from './orca-bridge.ts'

const args = parseArgs(process.argv.slice(2))
const config = loadConfig({ configPath: args.config, localOrca: args.localOrca })

log(`orca-web gateway starting`)
log(describeConfig(config))

const bridge = new OrcaBridge(config.orca)
bridge.onEvent((event) => {
  if (event.kind === 'state') {
    log(`orca ${event.state}${event.message ? `: ${event.message}` : ''}`)
  }
})
bridge.start()

const hub = new HubLink({
  url: config.serverUrl,
  key: config.gatewayKey,
  gatewayId: config.gatewayId,
  bridge,
  log
})
hub.start()

let shuttingDown = false
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    if (shuttingDown) {
      return
    }
    shuttingDown = true
    log(`${signal}: shutting down`)
    hub.stop()
    void bridge.stop().finally(() => process.exit(0))
    // A hung socket must not keep the process alive.
    setTimeout(() => process.exit(0), 3_000).unref()
  })
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
