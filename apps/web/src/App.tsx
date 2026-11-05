import { useEffect, useMemo, useState } from 'react'
import { api, type SessionInfo } from './api'
import { HubClient, type HubStatus } from './hub'
import { Board } from './Board'
import { Login } from './Login'
import { TaskView } from './TaskView'

type Route =
  | { kind: 'board' }
  | { kind: 'task'; sessionId: string; title: string; agent?: string }

export function App() {
  const [session, setSession] = useState<SessionInfo | null>(null)

  useEffect(() => {
    void api.session().then(setSession)
  }, [])

  if (!session) {
    return <div className="boot">载入中…</div>
  }
  if (!session.authenticated) {
    return <Login onSuccess={() => setSession({ authenticated: true })} />
  }
  return (
    <Main
      onSignedOut={() => {
        setSession({ authenticated: false })
      }}
    />
  )
}

function Main({ onSignedOut }: { onSignedOut: () => void }) {
  const hub = useMemo(() => new HubClient(), [])
  const [status, setStatus] = useState<HubStatus>({
    connected: false,
    gatewayConnected: false,
    orcaState: null
  })
  const [route, setRoute] = useState<Route>({ kind: 'board' })

  useEffect(() => {
    hub.connect()
    return () => hub.close()
  }, [hub])

  useEffect(() => hub.onStatus(setStatus), [hub])

  useEffect(() => {
    if (status.authExpired) {
      hub.close()
      onSignedOut()
    }
  }, [status.authExpired, hub, onSignedOut])

  if (route.kind === 'task') {
    return (
      <TaskView
        hub={hub}
        sessionId={route.sessionId}
        title={route.title}
        agent={route.agent}
        status={status}
        onBack={() => setRoute({ kind: 'board' })}
      />
    )
  }

  return (
    <Board
      hub={hub}
      status={status}
      onOpenTask={(task) => setRoute({ kind: 'task', ...task })}
      onSignOut={async () => {
        hub.close()
        await api.logout()
        onSignedOut()
      }}
    />
  )
}
