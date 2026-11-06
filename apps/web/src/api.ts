export type SessionInfo = { authenticated: boolean; expiresAt?: number }

async function post(path: string, body: unknown): Promise<Response> {
  return await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  })
}

export const api = {
  async session(): Promise<SessionInfo> {
    const response = await fetch('/api/session')
    if (!response.ok) {
      return { authenticated: false }
    }
    return (await response.json()) as SessionInfo
  },

  async login(password: string): Promise<boolean> {
    const response = await post('/api/login', { password })
    return response.ok
  },

  async logout(): Promise<void> {
    await post('/api/logout', {})
  },

  /** Rotates the login password; every other session dies, this one is re-issued. */
  async changePassword(current: string, newPassword: string): Promise<{ ok: boolean; error?: string }> {
    const response = await post('/api/password', { current, new: newPassword })
    const payload = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string }
    return { ok: response.ok && payload.ok !== false, error: payload.error }
  }
}
