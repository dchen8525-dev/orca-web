// Release-exe self-update: check the latest GitHub release, then swap the running exe.
// On Windows a running exe cannot be deleted but can be renamed — rename the live one to
// .bak, move the downloaded one into place, exit; gateway-loop.cmd restarts it within 10s.
// Bundle installs (no build version baked in) do not self-update; rerun the bootstrap.
import { createHash } from 'node:crypto'
import { createWriteStream, readFileSync, renameSync, unlinkSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { pipeline } from 'node:stream/promises'

const REPO_API = 'https://api.github.com/repos/dchen8525-dev/orca-web/releases/latest'
export const GATEWAY_EXE_URL =
  'https://github.com/dchen8525-dev/orca-web/releases/latest/download/orca-gateway-windows-x64.exe'

export type UpdateCheck = {
  version: string | null
  latest: string | null
  updateAvailable: boolean
}

// Injected by `bun build --define`; plain esbuild bundle builds leave the typeof guard.
// Ambient so the typecheck sees it; the runtime guard keeps bundle installs honest.
declare const ORCA_BUILD_VERSION: string
const buildVersion = typeof ORCA_BUILD_VERSION === 'undefined' ? null : ORCA_BUILD_VERSION

export function currentVersion(): string | null {
  return buildVersion
}

/** The exe to swap — only a release exe install whose filename matches the loop's path. */
export function installedExePath(): string | null {
  if (!buildVersion) {
    return null
  }
  const exe = process.execPath
  return basename(exe) === 'orca-gateway.exe' ? exe : null
}

export async function checkForUpdate(): Promise<UpdateCheck> {
  const latest = await latestTagName()
  return {
    version: buildVersion,
    latest,
    updateAvailable: buildVersion !== null && latest !== null && latest !== buildVersion
  }
}

async function latestTagName(): Promise<string | null> {
  const response = await fetch(REPO_API, { headers: { 'user-agent': 'orca-web-gateway' } })
  if (!response.ok) {
    throw new Error(`GitHub API HTTP ${response.status}`)
  }
  const release = (await response.json()) as { tag_name?: string }
  return release.tag_name ?? null
}

/**
 * Downloads the release exe plus its sha256, verifies the digest, stages the swap.
 * The process must exit shortly after (the caller decides how soon) so gateway-loop
 * restarts from the new file.
 */
export async function stageSelfUpdate(): Promise<string> {
  const exe = installedExePath()
  if (!exe) {
    throw new Error('本机不是 release exe 安装，不能在本机自更新')
  }
  const dir = dirname(exe)
  const staging = `${exe}.update`
  const backup = `${exe}.bak`
  await downloadVerified(GATEWAY_EXE_URL, `${GATEWAY_EXE_URL}.sha256`, staging)
  // A stale backup from a previous update is not running and free to delete.
  try {
    unlinkSync(backup)
  } catch {
    // none present
  }
  renameSync(exe, backup)
  renameSync(staging, exe)
  log(`update staged: ${join(dir, 'orca-gateway.exe')} → restart pending`)
  return '新版本已就位，gateway 即将重启（loop 会在几秒内拉起）。'
}

/** Fetches both files, sha256-compares, leaves `target` verified and complete. */
async function downloadVerified(url: string, shaUrl: string, target: string): Promise<void> {
  const response = await fetch(url)
  if (!response.ok || !response.body) {
    throw new Error(`下载失败：HTTP ${response.status}`)
  }
  await pipeline(response.body, createWriteStream(target))
  const expected = (await (await fetch(shaUrl)).text())
    .trim()
    .split(/\s+/)[0]?.toLowerCase()
  const actual = sha256File(target)
  if (!expected || expected !== actual) {
    try {
      unlinkSync(target)
    } catch {
      // best effort
    }
    throw new Error('下载的 exe 与官方 sha256 不一致，已放弃')
  }
}

function sha256File(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}

function log(message: string): void {
  console.log(`${new Date().toISOString()} ${message}`)
}
