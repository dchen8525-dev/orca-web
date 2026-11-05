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
  }
}
