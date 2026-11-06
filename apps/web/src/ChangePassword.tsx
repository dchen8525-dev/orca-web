import { useState } from 'react'
import { api } from './api'

const ERROR_TEXT: Record<string, string> = {
  invalid_credentials: '当前密码不对。',
  new_password_too_short: '新密码至少 8 位。',
  persist_failed: '服务器没把新密码写进配置，稍后再试。'
}

export function ChangePassword({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [repeat, setRepeat] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const change = async () => {
    if (next.length < 8) {
      setError('新密码至少 8 位。')
      return
    }
    if (next !== repeat) {
      setError('两次输入的新密码不一致。')
      return
    }
    setBusy(true)
    setError(null)
    const result = await api.changePassword(current, next)
    setBusy(false)
    if (!result.ok) {
      setError(ERROR_TEXT[result.error ?? ''] ?? '改密码失败，稍后再试。')
      return
    }
    onClose()
  }

  return (
    <div className="sheet">
      <div className="topnav">
        <button className="back" onClick={onClose}>
          取消
        </button>
        <span className="sheet-title">改登录密码</span>
        <button className="primary" onClick={() => void change()} disabled={busy}>
          {busy ? '提交中…' : '保存'}
        </button>
      </div>
      <div className="rule" />

      <div className="sheet-body">
        <p className="field-label">当前密码</p>
        <input
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(event) => setCurrent(event.target.value)}
        />
        <p className="field-label">新密码</p>
        <input
          type="password"
          autoComplete="new-password"
          placeholder="至少 8 位"
          value={next}
          onChange={(event) => setNext(event.target.value)}
        />
        <p className="field-label">再输一遍</p>
        <input
          type="password"
          autoComplete="new-password"
          value={repeat}
          onChange={(event) => setRepeat(event.target.value)}
        />
        <p className="sheet-context">
          保存后其他登录过的设备都会退出，需要在各自设备重新登录；本机保持登录。
        </p>
        {error ? <p className="error">{error}</p> : null}
      </div>
    </div>
  )
}
