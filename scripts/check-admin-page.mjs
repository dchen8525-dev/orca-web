// The admin page ships as JS inside a TS template literal. A bad escape becomes a
// SyntaxError only in the browser; catch it here before it goes anywhere.
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../apps/gateway/src/local-admin-server.ts', import.meta.url), 'utf8')
const start = source.indexOf('const ADMIN_PAGE_HTML = `')
const end = source.indexOf('`', start + 26)
if (start < 0 || end < 0) {
  console.error('ADMIN_PAGE_HTML template not found')
  process.exit(1)
}
const script = source
  .slice(start + 'const ADMIN_PAGE_HTML = `'.length, end)
  .split('<script>')[1]
  ?.split('</script>')[0]
if (!script) {
  console.error('no inline script in ADMIN_PAGE_HTML')
  process.exit(1)
}
try {
  new Function(script)
  console.log('admin page script compiles: OK')
} catch (error) {
  console.error('admin page script does not compile:', error.message)
  process.exit(1)
}
