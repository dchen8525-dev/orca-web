import { useState } from 'react'
import { api } from './api'

export function Login({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      if (await api.login(password)) {
        onSuccess()
        return
      }
      setError('密码不正确')
    } catch {
      setError('无法连接到服务器')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="login" onSubmit={submit}>
      <div className="login-kicker">orca-web · private edition</div>
      <h1>Orca</h1>
      <p className="login-tagline">你的工作，在看得到的地方继续。</p>
      <input
        type="password"
        autoComplete="current-password"
        placeholder="password"
        aria-label="密码"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        autoFocus
      />
      {error ? <p className="error">{error}</p> : null}
      <button className="login-submit" type="submit" disabled={busy || password.length === 0}>
        {busy ? '登录中…' : '进入'}
      </button>
      <p className="login-fine">只有一台机器、一个人。密码错误时请稍候再试。</p>
    </form>
  )
}
