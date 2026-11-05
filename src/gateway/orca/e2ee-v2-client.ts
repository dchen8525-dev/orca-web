// Orca remote-runtime E2EE v2 client framing. Protocol facts mirrored from Orca (MIT),
// see docs/UPSTREAM.md. Keep this file free of Orca imports so upstream can move freely.
import { createHash, hkdfSync } from 'node:crypto'
import nacl from 'tweetnacl'

const SALT_LABEL = new TextEncoder().encode('orca-mobile-e2ee/v2/salt\0')
const INFO_LABEL = new TextEncoder().encode('orca-mobile-e2ee/v2/session\0')
const TRANSCRIPT_DOMAIN = 'orca-mobile-e2ee/v2/transcript'
const PROTOCOL = 'orca-mobile-e2ee'

const SESSION_ID_LENGTH = 32
const NONCE_LENGTH = 24
const HEADER_LENGTH = SESSION_ID_LENGTH + 2 + 8
const FRAME_VERSION = 2
const MAX_COUNTER = (1n << 64n) - 1n

export type E2eeTransport = 'direct' | 'relay'

export type E2eeContext = {
  protocol: typeof PROTOCOL
  initiator: 'mobile'
  responder: 'desktop'
  transport: E2eeTransport
  relayHostId?: string
}

type KeySchedule = {
  mobileToDesktopKey: Uint8Array
  desktopToMobileKey: Uint8Array
  sessionId: Uint8Array
  transcriptHash: Uint8Array
}

export type E2eeClientOptions = {
  hostPublicKeyB64: string
  transport?: E2eeTransport
  relayHostId?: string
}

export class OrcaE2eeClient {
  readonly hello: {
    type: 'e2ee_hello'
    v: 2
    clientPublicKeyB64: string
    clientNonceB64: string
    capabilities: { framing: [2]; payloadKinds: ['text', 'binary'] }
    context: E2eeContext
  }

  private readonly clientSecretKey: Uint8Array
  private readonly clientNonce: Uint8Array
  private readonly pinnedHostPublicKey: Uint8Array
  private schedule: KeySchedule | null = null
  private inboundCounter = 0n
  private outboundCounter = 0n

  constructor(options: E2eeClientOptions) {
    const keyPair = nacl.box.keyPair()
    const clientNonce = nacl.randomBytes(32)
    this.clientSecretKey = keyPair.secretKey
    this.clientNonce = clientNonce
    this.pinnedHostPublicKey = decodeHostKey(options.hostPublicKeyB64)
    this.hello = {
      type: 'e2ee_hello',
      v: 2,
      clientPublicKeyB64: encodeBase64(keyPair.publicKey),
      clientNonceB64: encodeBase64(clientNonce),
      capabilities: { framing: [2], payloadKinds: ['text', 'binary'] },
      context: {
        protocol: PROTOCOL,
        initiator: 'mobile',
        responder: 'desktop',
        transport: options.transport ?? 'direct',
        ...(options.relayHostId ? { relayHostId: options.relayHostId } : {})
      }
    }
  }

  helloText(): string {
    return JSON.stringify(this.hello)
  }

  /** Returns false for a ready that does not continue this hello or pins another host key. */
  acceptReady(text: string): boolean {
    let ready: ReadyFrame
    try {
      ready = JSON.parse(text) as ReadyFrame
    } catch {
      return false
    }
    const accepted = this.validateReady(ready)
    if (!accepted) {
      return false
    }
    const transcript = encodeTranscript({
      hello: this.hello,
      ready,
      clientPublicKey: decodeBase64(this.hello.clientPublicKeyB64),
      hostPublicKey: accepted.hostPublicKey,
      clientNonce: this.clientNonce,
      hostNonce: accepted.hostNonce
    })
    this.schedule = deriveKeySchedule({
      sharedSecret: nacl.box.before(accepted.hostPublicKey, this.clientSecretKey),
      transcript,
      clientNonce: this.clientNonce,
      hostNonce: accepted.hostNonce
    })
    return true
  }

  get isReady(): boolean {
    return this.schedule !== null
  }

  get transcriptHashB64(): string {
    if (!this.schedule) {
      throw new Error('E2EE v2 ready has not been accepted')
    }
    return encodeBase64(this.schedule.transcriptHash)
  }

  /** Token auth is sealed like any payload and names this connection's transcript. */
  authText(deviceToken: string): string {
    return this.sealText(
      JSON.stringify({
        type: 'e2ee_auth',
        v: 2,
        transcriptHashB64: this.transcriptHashB64,
        deviceToken
      })
    )
  }

  isAuthenticatedControl(text: string): boolean {
    const reply = parseJson(text)
    return (
      isRecord(reply) &&
      reply.type === 'e2ee_authenticated' &&
      reply.v === 2 &&
      reply.transcriptHashB64 === this.transcriptHashB64
    )
  }

  sealText(plaintext: string): string {
    const frame = this.seal(new TextEncoder().encode(plaintext), 'text')
    return encodeBase64(frame)
  }

  openText(frameB64: string): string | null {
    const frame = decodeBase64OrNull(frameB64)
    if (!frame) {
      return null
    }
    const plaintext = this.open(frame, 'text')
    return plaintext ? new TextDecoder().decode(plaintext) : null
  }

  private validateReady(ready: ReadyFrame): { hostPublicKey: Uint8Array; hostNonce: Uint8Array } | null {
    if (!isRecord(ready) || ready.type !== 'e2ee_ready' || ready.v !== 2) {
      return null
    }
    if (ready.clientNonceB64 !== this.hello.clientNonceB64) {
      return null
    }
    const selection = ready.selection
    if (
      !isRecord(selection) ||
      selection.framing !== 2 ||
      !Array.isArray(selection.payloadKinds) ||
      selection.payloadKinds.join() !== 'text,binary'
    ) {
      return null
    }
    const context = ready.context as E2eeContext | undefined
    if (!context || !sameContext(context, this.hello.context)) {
      return null
    }
    const hostPublicKey = decodeFixedBase64(ready.desktopPublicKeyB64, 32)
    const hostNonce = decodeFixedBase64(ready.desktopNonceB64, 32)
    if (!hostPublicKey || !hostNonce || !equalBytes(hostPublicKey, this.pinnedHostPublicKey)) {
      return null
    }
    return { hostPublicKey, hostNonce }
  }

  private open(frame: Uint8Array, kind: 'text' | 'binary'): Uint8Array | null {
    if (!this.schedule || frame.length < NONCE_LENGTH + nacl.secretbox.overheadLength + HEADER_LENGTH) {
      return null
    }
    const expected = {
      sessionId: this.schedule.sessionId,
      direction: 'desktop-to-mobile' as const,
      kind,
      counter: this.inboundCounter
    }
    const nonce = encodeNonce(expected)
    if (!equalBytes(frame.subarray(0, NONCE_LENGTH), nonce)) {
      return null
    }
    const plaintext = nacl.secretbox.open(
      frame.subarray(NONCE_LENGTH),
      nonce,
      this.schedule.desktopToMobileKey
    )
    if (!plaintext || !equalBytes(plaintext.subarray(0, HEADER_LENGTH), encodeHeader(expected))) {
      return null
    }
    this.inboundCounter++
    return plaintext.slice(HEADER_LENGTH)
  }

  private seal(plaintext: Uint8Array, kind: 'text' | 'binary'): Uint8Array {
    if (!this.schedule) {
      throw new Error('E2EE v2 ready has not been accepted')
    }
    const header = {
      sessionId: this.schedule.sessionId,
      direction: 'mobile-to-desktop' as const,
      kind,
      counter: this.outboundCounter
    }
    const nonce = encodeNonce(header)
    const body = concatBytes([encodeHeader(header), plaintext])
    const ciphertext = nacl.secretbox(body, nonce, this.schedule.mobileToDesktopKey)
    this.outboundCounter++
    return concatBytes([nonce, ciphertext])
  }
}

type ReadyFrame = {
  type: 'e2ee_ready'
  v: 2
  desktopPublicKeyB64: string
  clientNonceB64: string
  desktopNonceB64: string
  selection: { framing: 2; payloadKinds: ['text', 'binary'] }
  context: E2eeContext
}

function deriveKeySchedule(args: {
  sharedSecret: Uint8Array
  transcript: Uint8Array
  clientNonce: Uint8Array
  hostNonce: Uint8Array
}): KeySchedule {
  const transcriptHash = sha256(args.transcript)
  const salt = sha256(concatBytes([SALT_LABEL, args.clientNonce, args.hostNonce]))
  const info = concatBytes([INFO_LABEL, transcriptHash])
  const expanded = new Uint8Array(
    hkdfSync('sha256', args.sharedSecret, salt, info, 96) as ArrayBuffer
  )
  return {
    mobileToDesktopKey: expanded.slice(0, 32),
    desktopToMobileKey: expanded.slice(32, 64),
    sessionId: expanded.slice(64, 96),
    transcriptHash
  }
}

// Field-by-field transcript: both sides must agree on names, order and framing.
function encodeTranscript(args: {
  hello: OrcaE2eeClient['hello']
  ready: ReadyFrame
  clientPublicKey: Uint8Array
  hostPublicKey: Uint8Array
  clientNonce: Uint8Array
  hostNonce: Uint8Array
}): Uint8Array {
  const { hello, ready } = args
  const fields: [string, Uint8Array][] = [
    ['domain', utf8(TRANSCRIPT_DOMAIN)],
    ['mobile-to-desktop.type', utf8(hello.type)],
    ['mobile-to-desktop.version', uint32(hello.v)],
    ['mobile-to-desktop.client-public-key', args.clientPublicKey],
    ['mobile-to-desktop.client-nonce', args.clientNonce],
    ['mobile-to-desktop.capabilities.framing', encodeNumberList(hello.capabilities.framing)],
    ['mobile-to-desktop.capabilities.payload-kinds', encodeStringList(hello.capabilities.payloadKinds)],
    ['mobile-to-desktop.context.protocol', utf8(hello.context.protocol)],
    ['mobile-to-desktop.context.initiator', utf8(hello.context.initiator)],
    ['mobile-to-desktop.context.responder', utf8(hello.context.responder)],
    ['mobile-to-desktop.context.transport', utf8(hello.context.transport)],
    ['mobile-to-desktop.context.relay-host-id', utf8(hello.context.relayHostId ?? '')],
    ['desktop-to-mobile.type', utf8(ready.type)],
    ['desktop-to-mobile.version', uint32(ready.v)],
    ['desktop-to-mobile.desktop-public-key', args.hostPublicKey],
    ['desktop-to-mobile.client-nonce-echo', args.clientNonce],
    ['desktop-to-mobile.desktop-nonce', args.hostNonce],
    ['desktop-to-mobile.selection.framing', uint32(ready.selection.framing)],
    ['desktop-to-mobile.selection.payload-kinds', encodeStringList(ready.selection.payloadKinds)],
    ['desktop-to-mobile.context.protocol', utf8(ready.context.protocol)],
    ['desktop-to-mobile.context.initiator', utf8(ready.context.initiator)],
    ['desktop-to-mobile.context.responder', utf8(ready.context.responder)],
    ['desktop-to-mobile.context.transport', utf8(ready.context.transport)],
    ['desktop-to-mobile.context.relay-host-id', utf8(ready.context.relayHostId ?? '')]
  ]
  return concatBytes(
    fields.map(([name, value]) =>
      concatBytes([uint32(utf8(name).length), utf8(name), uint32(value.length), value])
    )
  )
}

type FrameHeader = {
  sessionId: Uint8Array
  direction: 'mobile-to-desktop' | 'desktop-to-mobile'
  kind: 'text' | 'binary'
  counter: bigint
}

function encodeHeader(header: FrameHeader): Uint8Array {
  const bytes = new Uint8Array(HEADER_LENGTH)
  bytes.set(header.sessionId, 0)
  bytes[SESSION_ID_LENGTH] = header.direction === 'mobile-to-desktop' ? 0 : 1
  bytes[SESSION_ID_LENGTH + 1] = header.kind === 'text' ? 0 : 1
  writeUint64(bytes, SESSION_ID_LENGTH + 2, header.counter)
  return bytes
}

function encodeNonce(header: FrameHeader): Uint8Array {
  const nonce = new Uint8Array(NONCE_LENGTH)
  nonce.set(header.sessionId.subarray(0, 12), 0)
  nonce[12] = FRAME_VERSION
  nonce[13] = header.direction === 'mobile-to-desktop' ? 0 : 1
  nonce[14] = header.kind === 'text' ? 0 : 1
  nonce[15] = 0
  writeUint64(nonce, 16, header.counter)
  return nonce
}

function writeUint64(target: Uint8Array, offset: number, value: bigint): void {
  if (value < 0n || value > MAX_COUNTER) {
    throw new Error(`Invalid E2EE v2 counter: ${value}`)
  }
  let remaining = value
  for (let index = 7; index >= 0; index--) {
    target[offset + index] = Number(remaining & 0xffn)
    remaining >>= 8n
  }
}

function sameContext(left: E2eeContext, right: E2eeContext): boolean {
  return (
    left.protocol === right.protocol &&
    left.initiator === right.initiator &&
    left.responder === right.responder &&
    left.transport === right.transport &&
    left.relayHostId === right.relayHostId
  )
}

function decodeHostKey(value: string): Uint8Array {
  const key = decodeFixedBase64(value, 32)
  if (!key) {
    throw new Error('Invalid host public key')
  }
  return key
}

function decodeFixedBase64(value: unknown, length: number): Uint8Array | null {
  if (typeof value !== 'string') {
    return null
  }
  const bytes = decodeBase64OrNull(value)
  return bytes && bytes.length === length ? bytes : null
}

function decodeBase64OrNull(value: string): Uint8Array | null {
  try {
    const bytes = decodeBase64(value)
    return encodeBase64(bytes) === value ? bytes : null
  } catch {
    return null
  }
}

function encodeBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64')
}

function decodeBase64(value: string): Uint8Array {
  return Uint8Array.from(Buffer.from(value, 'base64'))
}

function sha256(bytes: Uint8Array): Uint8Array {
  return new Uint8Array(createHash('sha256').update(bytes).digest())
}

function encodeNumberList(values: readonly number[]): Uint8Array {
  return concatBytes([uint32(values.length), ...values.map(uint32)])
}

function encodeStringList(values: readonly string[]): Uint8Array {
  return concatBytes([
    uint32(values.length),
    ...values.map((value) => {
      const bytes = utf8(value)
      return concatBytes([uint32(bytes.length), bytes])
    })
  ])
}

function uint32(value: number): Uint8Array {
  const bytes = new Uint8Array(4)
  new DataView(bytes.buffer).setUint32(0, value, false)
  return bytes
}

function utf8(value: string): Uint8Array {
  return new TextEncoder().encode(value)
}

function concatBytes(parts: readonly Uint8Array[]): Uint8Array {
  const result = new Uint8Array(parts.reduce((total, part) => total + part.length, 0))
  let offset = 0
  for (const part of parts) {
    result.set(part, offset)
    offset += part.length
  }
  return result
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) {
    return false
  }
  let difference = 0
  for (let index = 0; index < left.length; index++) {
    difference |= left[index]! ^ right[index]!
  }
  return difference === 0
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
