import { useCallback, useEffect, useMemo, useState } from 'react'
import { api, type SessionInfo } from './api'
import { HubClient, type HubStatus } from './hub'
import { Board } from './Board'
import { Automations } from './Automations'
import { Login } from './Login'
import { TaskView } from './TaskView'

type Route =
  | { kind: 'board' }
  | { kind: 'task'; sessionId: string; title: string; agent?: string }
  | { kind: 'automations' }

function pathFor(route: Route): string {
  if (route.kind === 'task') {
    return `/task/${encodeURIComponent(route.sessionId)}`
  }
  return route.kind === 'automations' ? '/automations' : '/'
}

function routeFromPath(path: string): Route {
  const match = /^\/task\/([^/]+)/.exec(path)
  if (match) {
    return { kind: 'task', sessionId: decodeURIComponent(match[1]!), title: '任务' }
  }
  return path === '/automations' ? { kind: 'automations' } : { kind: 'board' }
}

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
  const [route, setRoute] = useState<Route>(() => routeFromPath(location.pathname))

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

  useEffect(() => {
    const onPop = () => setRoute(routeFromPath(location.pathname))
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const navigate = useCallback((next: Route) => {
    history.pushState({ orcaWeb: true }, '', pathFor(next))
    setRoute(next)
  }, [])

  // history.back() leaves the site if this page was opened directly on a deep link,
  // so plant a board entry first in that case.
  const goBack = useCallback(() => {
    if (history.state?.orcaWeb) {
      history.back()
      return
    }
    setRoute({ kind: 'board' })
    history.replaceState({ orcaWeb: true }, '', pathFor({ kind: 'board' }))
  }, [])

  if (route.kind === 'task') {
    return (
      <TaskView
        hub={hub}
        sessionId={route.sessionId}
        title={route.title}
        agent={route.agent}
        status={status}
        onBack={goBack}
      />
    )
  }
  if (route.kind === 'automations') {
    return (
      <Automations
        hub={hub}
        connected={status.gatewayConnected}
        onBack={goBack}
        onOpenTask={(sessionId, title) => navigate({ kind: 'task', sessionId, title })}
      />
    )
  }

  return (
    <Board
      hub={hub}
      status={status}
      onOpenTask={(task) => navigate({ kind: 'task', ...task })}
      onOpenAutomations={() => navigate({ kind: 'automations' })}
      onSignOut={async () => {
        hub.close()
        await api.logout()
        onSignedOut()
      }}
    />
  )
}
