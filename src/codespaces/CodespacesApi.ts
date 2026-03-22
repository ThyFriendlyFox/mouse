const BASE = 'https://api.github.com'
const RELAY_PORT = 2222

function headers(token: string) {
  return {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

export interface Codespace {
  name: string
  display_name: string | null
  state: 'Available' | 'Shutdown' | 'Starting' | 'Stopping' | 'Rebuilding' | string
  repository: { full_name: string; html_url: string }
  machine: { name: string; display_name: string; cpus: number; memory_in_bytes: number } | null
  web_url: string
  created_at: string
  last_used_at: string | null
}

export async function listCodespaces(token: string): Promise<Codespace[]> {
  const res = await fetch(`${BASE}/user/codespaces`, { headers: headers(token) })
  if (!res.ok) throw new Error(`Failed to list Codespaces: ${res.status}`)
  const data = await res.json()
  return data.codespaces ?? []
}

export async function getCodespace(token: string, name: string): Promise<Codespace> {
  const res = await fetch(`${BASE}/user/codespaces/${name}`, { headers: headers(token) })
  if (!res.ok) throw new Error(`Failed to get Codespace: ${res.status}`)
  return res.json()
}

export async function startCodespace(token: string, name: string): Promise<void> {
  const res = await fetch(`${BASE}/user/codespaces/${name}/start`, {
    method: 'POST',
    headers: headers(token),
  })
  if (!res.ok) throw new Error(`Failed to start Codespace: ${res.status}`)
}

export async function waitUntilAvailable(
  token: string,
  name: string,
  onStatus?: (state: string) => void,
): Promise<Codespace> {
  for (let i = 0; i < 60; i++) {
    const cs = await getCodespace(token, name)
    onStatus?.(cs.state)
    if (cs.state === 'Available') return cs
    if (cs.state === 'Shutdown') await startCodespace(token, name)
    await new Promise(r => setTimeout(r, 2000))
  }
  throw new Error('Codespace did not become available in time.')
}

export interface ForwardedPort {
  port: number
  visibility: 'private' | 'public' | 'org'
  label: string
}

export async function listPorts(token: string, name: string): Promise<ForwardedPort[]> {
  const res = await fetch(`${BASE}/user/codespaces/${name}/ports`, { headers: headers(token) })
  if (!res.ok) return []
  const data = await res.json()
  return data.ports ?? []
}

/** Returns the WSS URL for the mouse relay running in this Codespace. */
export function relayWssUrl(codespaceName: string): string {
  return `wss://${codespaceName}-${RELAY_PORT}.app.github.dev`
}

/** Returns the HTTPS URL for the mouse relay (used to check if it's up). */
export function relayHttpUrl(codespaceName: string): string {
  return `https://${codespaceName}-${RELAY_PORT}.app.github.dev/health`
}

/** Check whether the relay is reachable (relay serves GET /health). */
export async function isRelayRunning(codespaceName: string, token: string): Promise<boolean> {
  try {
    const res = await fetch(relayHttpUrl(codespaceName), {
      headers: { 'X-Github-Token': token },
      signal: AbortSignal.timeout(4000),
    })
    return res.ok
  } catch {
    return false
  }
}
